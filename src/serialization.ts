import {
  ScreenshotScoutError,
  ScreenshotScoutSerializationError,
} from "./errors.js";
import { CaptureHttpMethod } from "./types.js";
import type { CaptureOptions, CaptureRequestOptions } from "./types.js";

type WireScalar = string | number | boolean;
export type WireJsonValue = WireScalar | WireScalar[];
export type WirePair = readonly [name: string, value: string];

export interface SerializedCaptureOptions {
  readonly pairs: readonly WirePair[];
  readonly body: Readonly<Record<string, WireJsonValue>>;
}

export interface SerializedCaptureRequest extends SerializedCaptureOptions {
  readonly method: CaptureHttpMethod;
  readonly signal: AbortSignal | undefined;
}

const WIRE_NAMES = {
  format: "format",
  responseType: "response_type",
  country: "country",
  proxy: "proxy",
  geolocationLatitude: "geolocation_latitude",
  geolocationLongitude: "geolocation_longitude",
  geolocationAccuracy: "geolocation_accuracy",
  cookies: "cookies",
  headers: "headers",
  timeout: "timeout",
  waitUntil: "wait_until",
  navigationTimeout: "navigation_timeout",
  delay: "delay",
  device: "device",
  deviceViewportWidth: "device_viewport_width",
  deviceViewportHeight: "device_viewport_height",
  deviceScaleFactor: "device_scale_factor",
  deviceIsMobile: "device_is_mobile",
  deviceHasTouch: "device_has_touch",
  deviceUserAgent: "device_user_agent",
  timezone: "timezone",
  mediaType: "media_type",
  colorScheme: "color_scheme",
  reducedMotion: "reduced_motion",
  fullPage: "full_page",
  fullPagePreScroll: "full_page_pre_scroll",
  fullPagePreScrollStep: "full_page_pre_scroll_step",
  fullPagePreScrollStepDelay: "full_page_pre_scroll_step_delay",
  fullPageMaxHeight: "full_page_max_height",
  blockCookieBanners: "block_cookie_banners",
  blockAds: "block_ads",
  blockChatWidgets: "block_chat_widgets",
  hideSelectors: "hide_selectors",
  clickSelectors: "click_selectors",
  clickAllSelectors: "click_all_selectors",
  injectCss: "inject_css",
  injectJs: "inject_js",
  bypassCsp: "bypass_csp",
  selector: "selector",
  clipX: "clip_x",
  clipY: "clip_y",
  clipWidth: "clip_width",
  clipHeight: "clip_height",
  imageWidth: "image_width",
  imageHeight: "image_height",
  imageMode: "image_mode",
  imageAnchor: "image_anchor",
  imageAllowUpscale: "image_allow_upscale",
  imageBackground: "image_background",
  imageQuality: "image_quality",
  pdfPaperFormat: "pdf_paper_format",
  pdfLandscape: "pdf_landscape",
  pdfPrintBackground: "pdf_print_background",
  pdfMargin: "pdf_margin",
  pdfMarginTop: "pdf_margin_top",
  pdfMarginRight: "pdf_margin_right",
  pdfMarginBottom: "pdf_margin_bottom",
  pdfMarginLeft: "pdf_margin_left",
  pdfScale: "pdf_scale",
  pdfPageRanges: "pdf_page_ranges",
  cache: "cache",
  cacheTtl: "cache_ttl",
  cacheKey: "cache_key",
  storageMode: "storage_mode",
  storageEndpoint: "storage_endpoint",
  storageBucket: "storage_bucket",
  storageRegion: "storage_region",
  storageObjectKey: "storage_object_key",
} as const satisfies Readonly<Record<keyof CaptureOptions, string>>;

const REPEATED_OPTIONS = new Set<keyof CaptureOptions>([
  "cookies",
  "headers",
  "hideSelectors",
  "clickSelectors",
  "clickAllSelectors",
  "injectCss",
  "injectJs",
]);

const ALLOWED_OPTION_KEYS = new Set<string>(Object.keys(WIRE_NAMES));
const ALLOWED_REQUEST_OPTION_KEYS = new Set<string>(["method", "signal"]);

export function serializeCaptureOptions(
  targetUrl: string,
  options?: CaptureOptions | null,
): SerializedCaptureOptions {
  try {
    return serializeCaptureOptionsUnsafe(targetUrl, options);
  } catch (error) {
    if (error instanceof ScreenshotScoutError) throw error;
    throw new ScreenshotScoutSerializationError(
      "Capture options could not be serialized.",
      undefined,
      { cause: error },
    );
  }
}

export function serializeCaptureRequest(
  targetUrl: string,
  options?: CaptureOptions | null,
  captureRequestOptions?: CaptureRequestOptions | null,
): SerializedCaptureRequest {
  const serialized = serializeCaptureOptions(targetUrl, options);

  try {
    const request = serializeCaptureRequestOptionsUnsafe(captureRequestOptions);
    return { ...serialized, ...request };
  } catch (error) {
    if (error instanceof ScreenshotScoutError) throw error;
    throw new ScreenshotScoutSerializationError(
      "Capture request options could not be serialized.",
      undefined,
      { cause: error },
    );
  }
}

function serializeCaptureOptionsUnsafe(
  targetUrl: string,
  options?: CaptureOptions | null,
): SerializedCaptureOptions {
  if (typeof targetUrl !== "string") {
    throw new ScreenshotScoutSerializationError(
      "The capture target URL must be a string.",
      "url",
    );
  }

  if (
    options !== undefined &&
    options !== null &&
    (typeof options !== "object" || Array.isArray(options))
  ) {
    throw new ScreenshotScoutSerializationError(
      "Capture options must be an object when provided.",
    );
  }

  for (const key of Object.keys(options ?? {})) {
    if (!ALLOWED_OPTION_KEYS.has(key)) {
      throw new ScreenshotScoutSerializationError(
        `Unknown capture option "${key}".`,
        key,
      );
    }
  }

  const pairs: WirePair[] = [["url", targetUrl]];
  const body: Record<string, WireJsonValue> = { url: targetUrl };

  for (const property of Object.keys(WIRE_NAMES) as Array<
    keyof CaptureOptions
  >) {
    const value = options?.[property];
    if (value === undefined || value === null) continue;

    const wireName = WIRE_NAMES[property];
    if (REPEATED_OPTIONS.has(property)) {
      if (!Array.isArray(value)) {
        throw new ScreenshotScoutSerializationError(
          `The capture option "${property}" must be an array of strings.`,
          property,
        );
      }
      if (value.length === 0) continue;

      const repeatedValues: string[] = [];
      for (const item of value) {
        if (typeof item !== "string") {
          throw new ScreenshotScoutSerializationError(
            `The capture option "${property}" must contain only strings.`,
            property,
          );
        }
        repeatedValues.push(item);
        pairs.push([wireName, item]);
      }
      body[wireName] = repeatedValues;
      continue;
    }

    if (!isWireScalar(value)) {
      throw new ScreenshotScoutSerializationError(
        `The capture option "${property}" must be a string, finite number, or boolean.`,
        property,
      );
    }

    pairs.push([wireName, String(value)]);
    body[wireName] = value;
  }

  return { pairs, body };
}

function serializeCaptureRequestOptionsUnsafe(
  captureRequestOptions?: CaptureRequestOptions | null,
): Pick<SerializedCaptureRequest, "method" | "signal"> {
  if (
    captureRequestOptions !== undefined &&
    captureRequestOptions !== null &&
    (typeof captureRequestOptions !== "object" ||
      Array.isArray(captureRequestOptions))
  ) {
    throw new ScreenshotScoutSerializationError(
      "Capture request options must be an object when provided.",
    );
  }

  for (const key of Object.keys(captureRequestOptions ?? {})) {
    if (!ALLOWED_REQUEST_OPTION_KEYS.has(key)) {
      throw new ScreenshotScoutSerializationError(
        `Unknown capture request option "${key}".`,
        key,
      );
    }
  }

  const methodValue = captureRequestOptions?.method;
  const method =
    methodValue === undefined || methodValue === null
      ? CaptureHttpMethod.POST
      : methodValue;
  if (method !== CaptureHttpMethod.GET && method !== CaptureHttpMethod.POST) {
    throw new ScreenshotScoutSerializationError(
      "The capture method must be CaptureHttpMethod.GET or CaptureHttpMethod.POST.",
      "method",
    );
  }

  const signalValue = captureRequestOptions?.signal;
  const signal =
    signalValue === undefined || signalValue === null ? undefined : signalValue;
  if (signal !== undefined && !isAbortSignal(signal)) {
    throw new ScreenshotScoutSerializationError(
      "The capture signal must be an AbortSignal.",
      "signal",
    );
  }

  return { method, signal };
}

export function buildCanonicalQuery(
  pairs: readonly WirePair[],
  accessKey: string,
): string {
  const entries = [...pairs, ["access_key", accessKey] as const].map(
    ([name, value], index) => ({ name, value, index }),
  );
  entries.sort((left, right) =>
    left.name === right.name
      ? left.index - right.index
      : left.name < right.name
        ? -1
        : 1,
  );

  return encodeQueryPairs(entries.map(({ name, value }) => [name, value]));
}

/** The signed text and every query the SDK writes use this encoding, so they match exactly. */
export function encodeQueryPairs(pairs: readonly WirePair[]): string {
  return pairs
    .map(([name, value]) => `${encodeRfc3986(name)}=${encodeRfc3986(value)}`)
    .join("&");
}

// RFC 3986: only A-Z a-z 0-9 - . _ ~ stay as they are; everything else is
// percent-encoded UTF-8 with uppercase hex, so a space becomes %20.
// toWellFormed() turns lone surrogates into U+FFFD, as URLSearchParams does.
function encodeRfc3986(text: string): string {
  return encodeURIComponent(text.toWellFormed()).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function isWireScalar(value: unknown): value is WireScalar {
  if (typeof value === "string" || typeof value === "boolean") return true;
  return typeof value === "number" && Number.isFinite(value);
}

function isAbortSignal(value: unknown): value is AbortSignal {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<AbortSignal>;
  return (
    typeof candidate.aborted === "boolean" &&
    typeof candidate.addEventListener === "function" &&
    typeof candidate.removeEventListener === "function"
  );
}
