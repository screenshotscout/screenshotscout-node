import { createHmac } from "node:crypto";

import {
  readProcessEnvironment,
  resolveCredentials,
  SECRET_KEY_VARIABLE,
} from "./credentials.js";
import {
  ScreenshotScoutApiError,
  ScreenshotScoutConfigurationError,
  ScreenshotScoutResponseDecodingError,
  ScreenshotScoutSerializationError,
  ScreenshotScoutTransportError,
} from "./errors.js";
import {
  buildCanonicalQuery,
  encodeQueryPairs,
  serializeCaptureOptions,
  serializeCaptureRequest,
} from "./serialization.js";
import type { WirePair } from "./serialization.js";
import { CaptureHttpMethod } from "./types.js";
import type {
  BinaryCaptureOptions,
  BinaryCaptureResponse,
  CaptureOptions,
  CaptureRequestOptions,
  CaptureResponse,
  CaptureResult,
  JsonCaptureOptions,
  JsonCaptureResponse,
  RawResponse,
  ScreenshotScoutClientOptions,
  ScreenshotScoutFetch,
} from "./types.js";

const CAPTURE_ENDPOINT = "https://api.screenshotscout.com/v1/capture";
const ACCESS_KEY_PATTERN = /^[A-Za-z0-9\-._~+/]+=*$/;

export class ScreenshotScoutClient {
  readonly #accessKey: string;
  readonly #secretKey: string | undefined;
  readonly #secretKeyFromEnvironment: boolean;
  readonly #fetch: ScreenshotScoutFetch;

  /**
   * Creates a client. When `options` passes no key, the client reads `SCREENSHOTSCOUT_ACCESS_KEY`
   * and, if it's set, `SCREENSHOTSCOUT_SECRET_KEY`. Passing either key means neither variable is read.
   */
  constructor(options?: ScreenshotScoutClientOptions | null) {
    if (
      options !== undefined &&
      options !== null &&
      (typeof options !== "object" || Array.isArray(options))
    ) {
      throw new ScreenshotScoutConfigurationError(
        "ScreenshotScoutClient options must be an object when provided.",
      );
    }
    const clientOptions: ScreenshotScoutClientOptions = options ?? {};
    const credentials = resolveCredentials(
      clientOptions.accessKey,
      clientOptions.secretKey,
      readProcessEnvironment,
    );

    const accessKey = credentials.accessKey;
    if (typeof accessKey !== "string" || accessKey.trim().length === 0) {
      throw new ScreenshotScoutConfigurationError(
        "A non-blank Screenshot Scout access key is required.",
      );
    }
    if (!ACCESS_KEY_PATTERN.test(accessKey)) {
      throw new ScreenshotScoutConfigurationError(
        "The Screenshot Scout access key is not a valid Bearer credential.",
      );
    }

    const secretKey = credentials.secretKey;
    if (
      secretKey !== undefined &&
      (typeof secretKey !== "string" || secretKey.trim().length === 0)
    ) {
      throw new ScreenshotScoutConfigurationError(
        "The Screenshot Scout secret key must be a non-blank string when provided.",
      );
    }

    const fetchOption = clientOptions.fetch ?? undefined;
    const fetchImplementation = fetchOption ?? globalThis.fetch;
    if (typeof fetchImplementation !== "function") {
      throw new ScreenshotScoutConfigurationError(
        "A Fetch-compatible transport is required.",
      );
    }

    // Validate that the configured credential can be represented as an HTTP header.
    try {
      new Headers({ Authorization: `Bearer ${accessKey}` });
    } catch (cause) {
      throw new ScreenshotScoutConfigurationError(
        "The Screenshot Scout access key cannot be used in an Authorization header.",
        { cause },
      );
    }

    this.#accessKey = accessKey;
    this.#secretKey = secretKey;
    this.#secretKeyFromEnvironment =
      credentials.fromEnvironment && secretKey !== undefined;
    this.#fetch =
      fetchOption === undefined
        ? globalThis.fetch.bind(globalThis)
        : fetchOption;
  }

  capture(
    targetUrl: string,
    captureOptions: JsonCaptureOptions,
    captureRequestOptions?: CaptureRequestOptions | null,
  ): Promise<JsonCaptureResponse>;
  capture(
    targetUrl: string,
    captureOptions?: BinaryCaptureOptions | null,
    captureRequestOptions?: CaptureRequestOptions | null,
  ): Promise<BinaryCaptureResponse>;
  capture(
    targetUrl: string,
    captureOptions: CaptureOptions | null | undefined,
    captureRequestOptions?: CaptureRequestOptions | null,
  ): Promise<CaptureResponse>;
  async capture(
    targetUrl: string,
    captureOptions?: CaptureOptions | null,
    captureRequestOptions?: CaptureRequestOptions | null,
  ): Promise<CaptureResponse> {
    const serialized = serializeCaptureRequest(
      targetUrl,
      captureOptions,
      captureRequestOptions,
    );
    if (
      this.#secretKey !== undefined &&
      serialized.method === CaptureHttpMethod.POST
    ) {
      const source = this.#secretKeyFromEnvironment
        ? ` from ${SECRET_KEY_VARIABLE}`
        : "";
      throw new ScreenshotScoutConfigurationError(
        `POST requests can't be signed. This client has a secret key${source}: send this capture with method GET, or use a client without a secret key and an API key that doesn't require signed requests.`,
      );
    }
    // Without a method, a client that signs sends GET, because POST requests can't be signed.
    const method =
      serialized.method ??
      (this.#secretKey === undefined
        ? CaptureHttpMethod.POST
        : CaptureHttpMethod.GET);
    const expectedResponseKind = getExpectedResponseKind(captureOptions);
    throwIfAborted(serialized.signal);
    const signature = this.#createSignature(serialized.pairs);

    const requestUrl = new URL(CAPTURE_ENDPOINT);
    const headers = new Headers({
      Authorization: `Bearer ${this.#accessKey}`,
    });
    const requestInit: RequestInit = {
      method,
      headers,
      redirect: "manual",
    };

    if (method === CaptureHttpMethod.GET) {
      const pairs: WirePair[] = [...serialized.pairs];
      if (signature !== undefined) pairs.push(["signature", signature]);
      requestUrl.search = encodeQueryPairs(pairs);
    } else {
      headers.set("Content-Type", "application/json");
      try {
        requestInit.body = JSON.stringify(serialized.body);
      } catch (cause) {
        throw new ScreenshotScoutSerializationError(
          "The POST capture body could not be serialized as JSON.",
          undefined,
          { cause },
        );
      }
    }

    if (serialized.signal !== undefined) {
      requestInit.signal = serialized.signal;
    }

    let rawResponse: RawResponse;
    try {
      const response = await this.#fetch(requestUrl, requestInit);
      const body = new Uint8Array(await response.arrayBuffer());
      rawResponse = createRawResponse(response, body);
    } catch (cause) {
      if (serialized.signal?.aborted) {
        throw cause;
      }
      throw new ScreenshotScoutTransportError(
        "Screenshot Scout request failed before an HTTP response body was received.",
        cause,
      );
    }

    if (rawResponse.status < 200 || rawResponse.status > 299) {
      throw createApiError(rawResponse);
    }

    return decodeSuccessResponse(rawResponse, expectedResponseKind);
  }

  buildCaptureUrl(
    targetUrl: string,
    captureOptions?: CaptureOptions | null,
  ): string {
    const serialized = serializeCaptureOptions(targetUrl, captureOptions);
    const signature = this.#createSignature(serialized.pairs);
    const requestUrl = new URL(CAPTURE_ENDPOINT);

    const pairs: WirePair[] = [
      ["access_key", this.#accessKey],
      ...serialized.pairs,
    ];
    if (signature !== undefined) {
      pairs.push(["signature", signature]);
    }
    requestUrl.search = encodeQueryPairs(pairs);

    return requestUrl.toString();
  }

  #createSignature(pairs: readonly WirePair[]): string | undefined {
    if (this.#secretKey === undefined) return undefined;

    try {
      const canonicalQuery = buildCanonicalQuery(pairs, this.#accessKey);
      return createHmac("sha256", this.#secretKey)
        .update(canonicalQuery, "utf8")
        .digest("hex");
    } catch (cause) {
      throw new ScreenshotScoutSerializationError(
        "The capture request could not be signed.",
        undefined,
        { cause },
      );
    }
  }
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;
  signal.throwIfAborted();
}

function getExpectedResponseKind(
  captureOptions: CaptureOptions | null | undefined,
): "binary" | "json" | undefined {
  const responseType = captureOptions?.responseType;
  if (
    responseType === undefined ||
    responseType === null ||
    responseType === "binary"
  ) {
    return "binary";
  }
  if (responseType === "json") return "json";
  return undefined;
}

function decodeSuccessResponse(
  rawResponse: RawResponse,
  expectedKind: "binary" | "json" | undefined,
): CaptureResponse {
  const actualKind = isJsonMediaType(rawResponse.contentType)
    ? "json"
    : "binary";

  if (expectedKind !== undefined && actualKind !== expectedKind) {
    throw new ScreenshotScoutResponseDecodingError(
      `Screenshot Scout returned a successful ${actualKind} response when ${expectedKind} was requested.`,
      rawResponse,
      new TypeError(
        `Expected a ${expectedKind} response but received ${actualKind}.`,
      ),
    );
  }

  return actualKind === "json"
    ? decodeJsonResponse(rawResponse)
    : decodeBinaryResponse(rawResponse);
}

function createRawResponse(response: Response, body: Uint8Array): RawResponse {
  const headers = new Map<string, readonly string[]>();
  for (const [name, value] of response.headers) {
    headers.set(name, Object.freeze([value]));
  }

  const getSetCookie = (
    response.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  if (typeof getSetCookie === "function") {
    const values = getSetCookie.call(response.headers);
    if (values.length > 0)
      headers.set("set-cookie", Object.freeze([...values]));
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers,
    contentType: response.headers.get("content-type"),
    body,
  };
}

function createApiError(rawResponse: RawResponse): ScreenshotScoutApiError {
  const parsed = tryParseJson(rawResponse.body);
  const objectBody =
    parsed.ok && isJsonObject(parsed.value) ? parsed.value : null;
  const errorCode =
    objectBody && typeof objectBody.error_code === "string"
      ? objectBody.error_code
      : undefined;
  const errorMessage =
    objectBody && typeof objectBody.error_message === "string"
      ? objectBody.error_message
      : undefined;
  const errors =
    objectBody && Array.isArray(objectBody.errors)
      ? objectBody.errors
      : undefined;

  return new ScreenshotScoutApiError({
    rawResponse,
    ...(parsed.ok ? { responseBody: parsed.value } : {}),
    ...(errorCode === undefined ? {} : { errorCode }),
    ...(errorMessage === undefined ? {} : { errorMessage }),
    ...(errors === undefined ? {} : { errors }),
  });
}

function decodeBinaryResponse(rawResponse: RawResponse): BinaryCaptureResponse {
  const headers = rawResponse.headers;
  const screenshotUrl = firstHeader(headers, "screenshot-scout-screenshot-url");
  const screenshotUrlExpiresAt = firstHeader(
    headers,
    "screenshot-scout-screenshot-url-expires-at",
  );
  const cacheStatus = firstHeader(headers, "screenshot-scout-cache-status");

  return {
    kind: "binary",
    bytes: rawResponse.body,
    ...(screenshotUrl === undefined ? {} : { screenshotUrl }),
    ...(screenshotUrlExpiresAt === undefined ? {} : { screenshotUrlExpiresAt }),
    ...(cacheStatus === undefined ? {} : { cacheStatus }),
    rawResponse,
  };
}

function decodeJsonResponse(rawResponse: RawResponse): JsonCaptureResponse {
  const parsed = tryParseJson(rawResponse.body);
  if (!parsed.ok) {
    throw new ScreenshotScoutResponseDecodingError(
      "Screenshot Scout returned a successful JSON response that could not be decoded.",
      rawResponse,
      parsed.cause,
    );
  }
  if (!isJsonObject(parsed.value)) {
    throw new ScreenshotScoutResponseDecodingError(
      "Screenshot Scout returned a successful JSON response that was not an object.",
      rawResponse,
      new TypeError("Expected a JSON object."),
    );
  }

  const value = parsed.value;
  const screenshotUrl = readOptionalString(
    value,
    "screenshot_url",
    rawResponse,
  );
  const screenshotUrlExpiresAt = readOptionalString(
    value,
    "screenshot_url_expires_at",
    rawResponse,
  );
  const cacheStatus = readOptionalString(value, "cache_status", rawResponse);
  const knownKeys = new Set([
    "screenshot_url",
    "screenshot_url_expires_at",
    "cache_status",
  ]);
  const additionalFields = Object.fromEntries(
    Object.entries(value).filter(([key]) => !knownKeys.has(key)),
  );

  const result: CaptureResult = {
    ...(screenshotUrl === undefined ? {} : { screenshotUrl }),
    ...(screenshotUrlExpiresAt === undefined ? {} : { screenshotUrlExpiresAt }),
    ...(cacheStatus === undefined ? {} : { cacheStatus }),
    additionalFields,
  };

  return { kind: "json", result, rawResponse };
}

function readOptionalString(
  object: Record<string, unknown>,
  key: string,
  rawResponse: RawResponse,
): string | undefined {
  if (!Object.hasOwn(object, key)) return undefined;
  const value = object[key];
  if (typeof value !== "string") {
    throw new ScreenshotScoutResponseDecodingError(
      `Screenshot Scout returned a non-string "${key}" JSON field.`,
      rawResponse,
      new TypeError(`Expected "${key}" to be a string.`),
    );
  }
  return value;
}

function firstHeader(
  headers: ReadonlyMap<string, readonly string[]>,
  name: string,
): string | undefined {
  return headers.get(name)?.[0];
}

function isJsonMediaType(contentType: string | null): boolean {
  if (contentType === null) return false;
  const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase();
  return (
    mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"))
  );
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tryParseJson(
  body: Uint8Array,
): { ok: true; value: unknown } | { ok: false; cause: unknown } {
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(body)) };
  } catch (cause) {
    return { ok: false, cause };
  }
}
