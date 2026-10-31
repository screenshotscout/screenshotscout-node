import assert from "node:assert/strict";
import test from "node:test";

import {
  CaptureHttpMethod,
  CaptureResponseType,
  ScreenshotScoutApiError,
  ScreenshotScoutClient,
  ScreenshotScoutConfigurationError,
  ScreenshotScoutResponseDecodingError,
  ScreenshotScoutSerializationError,
  ScreenshotScoutTransportError,
} from "../src/index.js";
import type {
  BinaryCaptureResponse,
  CaptureFormat as CaptureFormatType,
  CaptureHttpMethod as CaptureHttpMethodType,
  CaptureOptions,
  CaptureRequestOptions,
  CaptureResponse,
  CaptureResponseType as CaptureResponseTypeValue,
  JsonCaptureResponse,
  ScreenshotScoutFetch,
} from "../src/index.js";

interface RecordedCall {
  readonly input: string | URL | Request;
  readonly init: RequestInit | undefined;
}

function recordingFetch(
  responseFactory: () => Response = () =>
    new Response(Uint8Array.of(1), {
      status: 200,
      headers: { "content-type": "image/png" },
    }),
): { fetch: ScreenshotScoutFetch; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fetch: ScreenshotScoutFetch = async (input, init) => {
    calls.push({ input, init });
    return responseFactory();
  };
  return { fetch, calls };
}

function callUrl(call: RecordedCall): URL {
  if (call.input instanceof Request) return new URL(call.input.url);
  return new URL(call.input.toString());
}

function callHeaders(call: RecordedCall): Headers {
  return new Headers(call.init?.headers);
}

function callJsonBody(call: RecordedCall): Record<string, unknown> {
  const body = call.init?.body;
  assert.equal(typeof body, "string");
  if (typeof body !== "string") assert.fail("Expected a string request body");
  return JSON.parse(body) as Record<string, unknown>;
}

test("configuration validates credentials and the advanced fetch override", () => {
  assert.throws(
    () => new ScreenshotScoutClient(undefined as never),
    ScreenshotScoutConfigurationError,
  );
  assert.throws(
    () => new ScreenshotScoutClient({ accessKey: "   " }),
    ScreenshotScoutConfigurationError,
  );
  assert.throws(
    () => new ScreenshotScoutClient({ accessKey: "key with spaces" }),
    ScreenshotScoutConfigurationError,
  );
  assert.throws(
    () => new ScreenshotScoutClient({ accessKey: "key", secretKey: "" }),
    ScreenshotScoutConfigurationError,
  );
  assert.throws(
    () => new ScreenshotScoutClient({ accessKey: "key", fetch: 1 as never }),
    ScreenshotScoutConfigurationError,
  );

  const { fetch } = recordingFetch();
  assert.doesNotThrow(
    () =>
      new ScreenshotScoutClient({
        accessKey: "key",
        secretKey: null,
        fetch,
      }),
  );
});

test("POST is the default and serializes the complete typed option surface", async () => {
  const transport = recordingFetch();
  const controller = new AbortController();
  const client = new ScreenshotScoutClient({
    accessKey: "access-key",
    fetch: transport.fetch,
  });

  const options: CaptureOptions = {
    format: "future-format",
    responseType: "future-response",
    country: "",
    proxy: "",
    geolocationLatitude: 0,
    geolocationLongitude: 0,
    geolocationAccuracy: 0,
    cookies: ["session=a", "session=a", ""],
    headers: ["X-Test:one", "X-Test:one", ""],
    timeout: 0,
    waitUntil: "future-wait-state",
    navigationTimeout: 0,
    delay: 0,
    device: "",
    deviceViewportWidth: 0,
    deviceViewportHeight: 0,
    deviceScaleFactor: 0,
    deviceIsMobile: false,
    deviceHasTouch: false,
    deviceUserAgent: "",
    timezone: "",
    mediaType: "future-media",
    colorScheme: "future-scheme",
    reducedMotion: false,
    fullPage: false,
    fullPagePreScroll: false,
    fullPagePreScrollStep: 0,
    fullPagePreScrollStepDelay: 0,
    fullPageMaxHeight: 0,
    blockCookieBanners: false,
    blockAds: false,
    blockChatWidgets: false,
    hideSelectors: [".same", ".same", ""],
    clickSelectors: ["#first", "#first", ""],
    clickAllSelectors: [".all", ".all", ""],
    injectCss: ["", "body { color: red; }"],
    injectJs: ["", "document.title = 'x';"],
    bypassCsp: false,
    selector: "",
    clipX: 0,
    clipY: 0,
    clipWidth: 0,
    clipHeight: 0,
    imageWidth: 0,
    imageHeight: 0,
    imageMode: "future-image-mode",
    imageAnchor: "future-anchor",
    imageAllowUpscale: false,
    imageBackground: "",
    imageQuality: 0,
    pdfPaperFormat: "future-paper",
    pdfLandscape: false,
    pdfPrintBackground: false,
    pdfMargin: "",
    pdfMarginTop: "",
    pdfMarginRight: "",
    pdfMarginBottom: "",
    pdfMarginLeft: "",
    pdfScale: 0,
    pdfPageRanges: "",
    cache: false,
    cacheTtl: 0,
    cacheKey: "",
    storageMode: "future-storage",
    storageEndpoint: "",
    storageBucket: "",
    storageRegion: "",
    storageObjectKey: "",
  };
  const captureRequestOptions: CaptureRequestOptions = {
    method: CaptureHttpMethod.POST,
    signal: controller.signal,
  };

  await client.capture("", options, captureRequestOptions);
  assert.equal(transport.calls.length, 1);
  const call = transport.calls[0]!;
  assert.equal(
    callUrl(call).href,
    "https://api.screenshotscout.com/v1/capture",
  );
  assert.equal(call.init?.method, "POST");
  assert.equal(call.init?.redirect, "manual");
  assert.equal(call.init?.signal, controller.signal);
  assert.equal(callHeaders(call).get("authorization"), "Bearer access-key");
  assert.equal(callHeaders(call).get("content-type"), "application/json");
  assert.deepEqual(callJsonBody(call), {
    url: "",
    format: "future-format",
    response_type: "future-response",
    country: "",
    proxy: "",
    geolocation_latitude: 0,
    geolocation_longitude: 0,
    geolocation_accuracy: 0,
    cookies: ["session=a", "session=a", ""],
    headers: ["X-Test:one", "X-Test:one", ""],
    timeout: 0,
    wait_until: "future-wait-state",
    navigation_timeout: 0,
    delay: 0,
    device: "",
    device_viewport_width: 0,
    device_viewport_height: 0,
    device_scale_factor: 0,
    device_is_mobile: false,
    device_has_touch: false,
    device_user_agent: "",
    timezone: "",
    media_type: "future-media",
    color_scheme: "future-scheme",
    reduced_motion: false,
    full_page: false,
    full_page_pre_scroll: false,
    full_page_pre_scroll_step: 0,
    full_page_pre_scroll_step_delay: 0,
    full_page_max_height: 0,
    block_cookie_banners: false,
    block_ads: false,
    block_chat_widgets: false,
    hide_selectors: [".same", ".same", ""],
    click_selectors: ["#first", "#first", ""],
    click_all_selectors: [".all", ".all", ""],
    inject_css: ["", "body { color: red; }"],
    inject_js: ["", "document.title = 'x';"],
    bypass_csp: false,
    selector: "",
    clip_x: 0,
    clip_y: 0,
    clip_width: 0,
    clip_height: 0,
    image_width: 0,
    image_height: 0,
    image_mode: "future-image-mode",
    image_anchor: "future-anchor",
    image_allow_upscale: false,
    image_background: "",
    image_quality: 0,
    pdf_paper_format: "future-paper",
    pdf_landscape: false,
    pdf_print_background: false,
    pdf_margin: "",
    pdf_margin_top: "",
    pdf_margin_right: "",
    pdf_margin_bottom: "",
    pdf_margin_left: "",
    pdf_scale: 0,
    pdf_page_ranges: "",
    cache: false,
    cache_ttl: 0,
    cache_key: "",
    storage_mode: "future-storage",
    storage_endpoint: "",
    storage_bucket: "",
    storage_region: "",
    storage_object_key: "",
  });
});

test("null options and empty repeated collections are omitted without SDK defaults", async () => {
  const transport = recordingFetch();
  const client = new ScreenshotScoutClient({
    accessKey: "key",
    fetch: transport.fetch,
  });

  await client.capture(
    "https://example.com",
    {
      format: null,
      cookies: [],
      headers: [],
      hideSelectors: [],
      clickSelectors: [],
      clickAllSelectors: [],
      injectCss: [],
      injectJs: [],
    },
    {
      method: null,
      signal: null,
    },
  );

  assert.deepEqual(callJsonBody(transport.calls[0]!), {
    url: "https://example.com",
  });
});

test("GET uses repeated query parameters in caller order and never sends credentials as options", async () => {
  const transport = recordingFetch();
  const client = new ScreenshotScoutClient({
    accessKey: "query-secret",
    fetch: transport.fetch,
  });

  await client.capture(
    "https://example.com/a path",
    {
      cookies: ["a=1", "a=1"],
      headers: ["X-Test:one", "X-Test:one"],
      delay: 0,
      fullPage: false,
      cacheKey: "",
    },
    { method: CaptureHttpMethod.GET },
  );

  const call = transport.calls[0]!;
  const url = callUrl(call);
  assert.equal(call.init?.method, "GET");
  assert.equal(call.init?.body, undefined);
  assert.equal(callHeaders(call).get("content-type"), null);
  assert.equal(callHeaders(call).get("authorization"), "Bearer query-secret");
  assert.equal(url.searchParams.has("access_key"), false);
  assert.equal(url.searchParams.has("signature"), false);
  assert.deepEqual(url.searchParams.getAll("cookies"), ["a=1", "a=1"]);
  assert.deepEqual(url.searchParams.getAll("headers"), [
    "X-Test:one",
    "X-Test:one",
  ]);
  assert.equal(
    url.search.slice(1),
    "url=https%3A%2F%2Fexample.com%2Fa%20path&cookies=a%3D1&cookies=a%3D1&headers=X-Test%3Aone&headers=X-Test%3Aone&delay=0&full_page=false&cache_key=",
  );
});

test("buildCaptureUrl creates an unsigned GET URL without calling the transport", () => {
  const transport = recordingFetch();
  const client = new ScreenshotScoutClient({
    accessKey: "query-key",
    fetch: transport.fetch,
  });
  const options = {
    cookies: ["a=1", "a=1"],
    headers: ["X-Test:one", "X-Test:one"],
    delay: 0,
    fullPage: false,
    cacheKey: "",
  } satisfies CaptureOptions;

  const url = new URL(
    client.buildCaptureUrl("https://example.com/a path", options),
  );

  assert.equal(transport.calls.length, 0);
  assert.equal(url.origin, "https://api.screenshotscout.com");
  assert.equal(url.pathname, "/v1/capture");
  assert.equal(url.searchParams.get("access_key"), "query-key");
  assert.equal(url.searchParams.has("signature"), false);
  assert.deepEqual(url.searchParams.getAll("cookies"), ["a=1", "a=1"]);
  assert.deepEqual(url.searchParams.getAll("headers"), [
    "X-Test:one",
    "X-Test:one",
  ]);
  assert.equal(
    url.search.slice(1),
    "access_key=query-key&url=https%3A%2F%2Fexample.com%2Fa%20path&cookies=a%3D1&cookies=a%3D1&headers=X-Test%3Aone&headers=X-Test%3Aone&delay=0&full_page=false&cache_key=",
  );
});

test("unsafe structures fail locally without calling the transport", async (t) => {
  const cases: Array<[string, string | number, unknown]> = [
    ["unknown option", "https://example.com", { unknownOption: "x" }],
    ["nested scalar", "https://example.com", { format: { value: "png" } }],
    ["non-finite number", "https://example.com", { imageWidth: Infinity }],
    ["invalid repeated value", "https://example.com", { headers: ["x:y", 1] }],
    ["old method option", "https://example.com", { method: "GET" }],
    [
      "old signal option",
      "https://example.com",
      { signal: new AbortController().signal },
    ],
    ["non-string URL", 123, {}],
  ];

  for (const [name, targetUrl, options] of cases) {
    await t.test(name, async () => {
      const transport = recordingFetch();
      const client = new ScreenshotScoutClient({
        accessKey: "key",
        fetch: transport.fetch,
      });
      await assert.rejects(
        client.capture(targetUrl as string, options as CaptureOptions),
        ScreenshotScoutSerializationError,
      );
      assert.equal(transport.calls.length, 0);
    });
  }

  const requestCases: Array<[string, unknown]> = [
    ["non-object request options", 1],
    ["unknown request option", { unknownOption: true }],
    ["open method value", { method: "get" }],
    ["invalid signal", { signal: {} }],
  ];

  for (const [name, captureRequestOptions] of requestCases) {
    await t.test(name, async () => {
      const transport = recordingFetch();
      const client = new ScreenshotScoutClient({
        accessKey: "key",
        fetch: transport.fetch,
      });
      await assert.rejects(
        client.capture(
          "https://example.com",
          {},
          captureRequestOptions as CaptureRequestOptions,
        ),
        ScreenshotScoutSerializationError,
      );
      assert.equal(transport.calls.length, 0);
    });
  }
});

test("GET and generated URL signing match the API algorithm", async () => {
  const transport = recordingFetch(
    () =>
      new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
  const client = new ScreenshotScoutClient({
    accessKey: "ak_test",
    secretKey: "sk_test",
    fetch: transport.fetch,
  });
  const targetUrl = "https://example.com/a b?x=1&y=2";
  const sharedOptions = {
    responseType: "json",
    fullPage: false,
    delay: 0,
    headers: ["X-Test:one", "X-Test:two"],
  } satisfies CaptureOptions;
  const expectedSignature =
    "6419f2ac8c0440f1e341b547630606c9dc74dacfbb2df8e122fc9ae26831d893";

  await client.capture(targetUrl, sharedOptions, {
    method: CaptureHttpMethod.GET,
  });
  const builtUrl = new URL(client.buildCaptureUrl(targetUrl, sharedOptions));

  const getUrl = callUrl(transport.calls[0]!);
  assert.equal(transport.calls.length, 1);
  assert.equal(getUrl.searchParams.get("signature"), expectedSignature);
  assert.equal(builtUrl.searchParams.get("signature"), expectedSignature);
  assert.equal(builtUrl.searchParams.get("access_key"), "ak_test");
  assert.equal(builtUrl.toString().includes("sk_test"), false);
  assert.equal(getUrl.searchParams.has("access_key"), false);
  assert.equal(
    callHeaders(transport.calls[0]!).get("authorization"),
    "Bearer ak_test",
  );
});

test("a client with a secret key refuses POST without calling the transport", async (t) => {
  const cases: Array<[string, CaptureRequestOptions | undefined]> = [
    ["default method", undefined],
    ["explicit POST", { method: CaptureHttpMethod.POST }],
  ];

  for (const [name, captureRequestOptions] of cases) {
    await t.test(name, async () => {
      const transport = recordingFetch();
      const client = new ScreenshotScoutClient({
        accessKey: "ak_test",
        secretKey: "sk_test",
        fetch: transport.fetch,
      });

      await assert.rejects(
        client.capture("https://example.com", {}, captureRequestOptions),
        (error: unknown) => {
          assert.equal(
            error instanceof ScreenshotScoutConfigurationError,
            true,
          );
          if (!(error instanceof ScreenshotScoutConfigurationError)) {
            return false;
          }
          assert.equal(
            error.message,
            "POST requests can't be signed. This client has a secret key: send this capture with method GET, or use a client without a secret key and an API key that doesn't require signed requests.",
          );
          return true;
        },
      );
      assert.equal(transport.calls.length, 0);
    });
  }
});

test("lone surrogates are sent and signed as U+FFFD", () => {
  const client = new ScreenshotScoutClient({
    accessKey: "ak_test",
    secretKey: "sk_test",
    fetch: recordingFetch().fetch,
  });

  const url = client.buildCaptureUrl("https://example.com/\uD800");

  assert.equal(url, client.buildCaptureUrl("https://example.com/\uFFFD"));
  assert.equal(
    new URL(url).searchParams.get("url"),
    "https://example.com/\uFFFD",
  );
});

test("the default binary response retains bytes, metadata, and raw response", async () => {
  const responseHeaders = new Headers({
    "content-type": "image/png",
    "screenshot-scout-cache-status": "HIT",
    "screenshot-scout-screenshot-url": "https://cdn.example/screenshot.png",
    "screenshot-scout-screenshot-url-expires-at": "2026-07-14T00:00:00Z",
  });
  responseHeaders.append("set-cookie", "a=1; Path=/");
  responseHeaders.append("set-cookie", "b=2; Path=/");
  const transport = recordingFetch(
    () =>
      new Response(Uint8Array.of(0, 1, 2, 255), {
        status: 201,
        statusText: "Created",
        headers: responseHeaders,
      }),
  );
  const client = new ScreenshotScoutClient({
    accessKey: "key",
    fetch: transport.fetch,
  });

  const response = await client.capture("https://example.com");

  assert.equal(response.kind, "binary");
  assert.deepEqual([...response.bytes], [0, 1, 2, 255]);
  assert.equal(response.screenshotUrl, "https://cdn.example/screenshot.png");
  assert.equal(response.screenshotUrlExpiresAt, "2026-07-14T00:00:00Z");
  assert.equal(response.cacheStatus, "HIT");
  assert.equal(response.rawResponse.status, 201);
  assert.equal(response.rawResponse.statusText, "Created");
  assert.equal(response.rawResponse.contentType, "image/png");
  assert.deepEqual([...response.rawResponse.body], [0, 1, 2, 255]);
  assert.deepEqual(response.rawResponse.headers.get("set-cookie"), [
    "a=1; Path=/",
    "b=2; Path=/",
  ]);
});

test("an explicit JSON response retains documented and additional fields", async () => {
  const body = JSON.stringify({
    screenshot_url: "https://cdn.example/screenshot.png",
    cache_status: "miss",
    request_id: "request-123",
    future: { nested: true },
  });
  const transport = recordingFetch(
    () =>
      new Response(body, {
        status: 200,
        headers: {
          "content-type": "application/vnd.screenshotscout+json; charset=utf-8",
        },
      }),
  );
  const client = new ScreenshotScoutClient({
    accessKey: "key",
    fetch: transport.fetch,
  });

  const response = await client.capture("https://example.com", {
    responseType: CaptureResponseType.JSON,
  });

  assert.equal(response.kind, "json");
  assert.equal(
    response.result.screenshotUrl,
    "https://cdn.example/screenshot.png",
  );
  assert.equal(response.result.cacheStatus, "miss");
  assert.equal(Object.hasOwn(response.result, "screenshotUrlExpiresAt"), false);
  assert.deepEqual(response.result.additionalFields, {
    request_id: "request-123",
    future: { nested: true },
  });
  assert.equal(new TextDecoder().decode(response.rawResponse.body), body);
});

test("known response types reject successful responses with the wrong media type", async (t) => {
  await t.test("default binary request receives JSON", async () => {
    const body = JSON.stringify({
      screenshot_url: "https://cdn.example/a.png",
    });
    const transport = recordingFetch(
      () =>
        new Response(body, {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const client = new ScreenshotScoutClient({
      accessKey: "key",
      fetch: transport.fetch,
    });

    await assert.rejects(
      client.capture("https://example.com"),
      (error: unknown) => {
        assert.equal(
          error instanceof ScreenshotScoutResponseDecodingError,
          true,
        );
        if (!(error instanceof ScreenshotScoutResponseDecodingError)) {
          return false;
        }
        assert.match(error.message, /json response when binary was requested/);
        assert.equal(error.rawResponse.contentType, "application/json");
        assert.equal(new TextDecoder().decode(error.rawResponse.body), body);
        return true;
      },
    );
  });

  await t.test("JSON request receives binary", async () => {
    const body = Uint8Array.of(1, 2, 3);
    const transport = recordingFetch(
      () =>
        new Response(body, {
          status: 200,
          headers: { "content-type": "image/png" },
        }),
    );
    const client = new ScreenshotScoutClient({
      accessKey: "key",
      fetch: transport.fetch,
    });

    await assert.rejects(
      client.capture("https://example.com", {
        responseType: CaptureResponseType.JSON,
      }),
      (error: unknown) => {
        assert.equal(
          error instanceof ScreenshotScoutResponseDecodingError,
          true,
        );
        if (!(error instanceof ScreenshotScoutResponseDecodingError)) {
          return false;
        }
        assert.match(error.message, /binary response when json was requested/);
        assert.equal(error.rawResponse.contentType, "image/png");
        assert.deepEqual(error.rawResponse.body, body);
        return true;
      },
    );
  });
});

test("a dynamic open response type returns the media-selected union", async () => {
  const body = JSON.stringify({ screenshot_url: "https://cdn.example/a.png" });
  const transport = recordingFetch(
    () =>
      new Response(body, {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
  const client = new ScreenshotScoutClient({
    accessKey: "key",
    fetch: transport.fetch,
  });
  const responseType: CaptureResponseTypeValue = "future-response";
  const options: CaptureOptions = { responseType };

  const response: CaptureResponse = await client.capture(
    "https://example.com",
    options,
  );

  assert.equal(response.kind, "json");
  if (response.kind !== "json") assert.fail("Expected JSON response");
  assert.equal(response.result.screenshotUrl, "https://cdn.example/a.png");
});

test("malformed successful JSON is a response-decoding failure with raw access", async (t) => {
  for (const [name, body] of [
    ["invalid JSON", "{"],
    ["non-object JSON", "[]"],
    ["invalid documented field", '{"screenshot_url":123}'],
  ] as const) {
    await t.test(name, async () => {
      const transport = recordingFetch(
        () =>
          new Response(body, {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      );
      const client = new ScreenshotScoutClient({
        accessKey: "key",
        fetch: transport.fetch,
      });

      await assert.rejects(
        client.capture("https://example.com", {
          responseType: CaptureResponseType.JSON,
        }),
        (error: unknown) => {
          assert.equal(
            error instanceof ScreenshotScoutResponseDecodingError,
            true,
          );
          if (!(error instanceof ScreenshotScoutResponseDecodingError)) {
            return false;
          }
          assert.equal(error.rawResponse.status, 200);
          assert.equal(new TextDecoder().decode(error.rawResponse.body), body);
          return true;
        },
      );
    });
  }
});

test("API failures retain parsed fields, additional fields, and the exact raw response", async () => {
  const errorBody = {
    error_code: "invalid_options",
    error_message: "One or more options are invalid.",
    errors: [{ option: "format", message: "Unsupported." }],
    request_id: "request-456",
  };
  const encoded = JSON.stringify(errorBody);
  const transport = recordingFetch(
    () =>
      new Response(encoded, {
        status: 400,
        statusText: "Bad Request",
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-request-id": "request-456",
        },
      }),
  );
  const client = new ScreenshotScoutClient({
    accessKey: "key",
    fetch: transport.fetch,
  });

  await assert.rejects(
    client.capture("not-semantically-validated"),
    (error: unknown) => {
      assert.equal(error instanceof ScreenshotScoutApiError, true);
      if (!(error instanceof ScreenshotScoutApiError)) return false;
      assert.equal(error.status, 400);
      assert.equal(error.errorCode, "invalid_options");
      assert.equal(error.errorMessage, "One or more options are invalid.");
      assert.deepEqual(error.errors, errorBody.errors);
      assert.deepEqual(error.responseBody, errorBody);
      assert.equal(error.rawResponse.statusText, "Bad Request");
      assert.equal(
        error.rawResponse.headers.get("x-request-id")?.[0],
        "request-456",
      );
      assert.equal(new TextDecoder().decode(error.rawResponse.body), encoded);
      return true;
    },
  );
});

test("non-JSON and redirect API failures still expose raw responses without retrying", async () => {
  let calls = 0;
  let observedRedirect: RequestRedirect | undefined;
  const fetch: ScreenshotScoutFetch = async (_input, init) => {
    calls += 1;
    observedRedirect = init?.redirect;
    return new Response("redirect", {
      status: 302,
      headers: { location: "https://other.example/v1/capture" },
    });
  };
  const client = new ScreenshotScoutClient({ accessKey: "key", fetch });

  await assert.rejects(
    client.capture("https://example.com"),
    (error: unknown) => {
      assert.equal(error instanceof ScreenshotScoutApiError, true);
      if (!(error instanceof ScreenshotScoutApiError)) return false;
      assert.equal(error.status, 302);
      assert.equal(error.errorCode, undefined);
      assert.equal(error.responseBody, undefined);
      assert.equal(
        new TextDecoder().decode(error.rawResponse.body),
        "redirect",
      );
      return true;
    },
  );
  assert.equal(calls, 1);
  assert.equal(observedRedirect, "manual");
});

test("transport failures retain their native cause and are not retried", async () => {
  const nativeCause = new Error("socket closed");
  let calls = 0;
  const fetch: ScreenshotScoutFetch = async () => {
    calls += 1;
    throw nativeCause;
  };
  const client = new ScreenshotScoutClient({ accessKey: "key", fetch });

  await assert.rejects(
    client.capture("https://example.com"),
    (error: unknown) => {
      assert.equal(error instanceof ScreenshotScoutTransportError, true);
      if (!(error instanceof ScreenshotScoutTransportError)) return false;
      assert.equal(error.cause, nativeCause);
      return true;
    },
  );
  assert.equal(calls, 1);
});

test("caller cancellation follows AbortSignal semantics and is not wrapped", async () => {
  const transport = recordingFetch();
  const client = new ScreenshotScoutClient({
    accessKey: "key",
    fetch: transport.fetch,
  });
  const controller = new AbortController();
  const reason = new DOMException("stop", "AbortError");
  controller.abort(reason);

  await assert.rejects(
    client.capture("https://example.com", undefined, {
      signal: controller.signal,
    }),
    (error: unknown) => error === reason,
  );
  assert.equal(transport.calls.length, 0);
});

function assertCaptureReturnTypes(
  client: ScreenshotScoutClient,
  dynamicResponseType: CaptureResponseTypeValue,
  maybeDynamicOptions: CaptureOptions | undefined,
): void {
  const defaultResponse: Promise<BinaryCaptureResponse> = client.capture(
    "https://example.com",
  );
  const explicitBinaryResponse: Promise<BinaryCaptureResponse> = client.capture(
    "https://example.com",
    { responseType: CaptureResponseType.BINARY },
  );
  const jsonResponse: Promise<JsonCaptureResponse> = client.capture(
    "https://example.com",
    { responseType: CaptureResponseType.JSON },
  );
  const dynamicOptions: CaptureOptions = {
    responseType: dynamicResponseType,
  };
  const dynamicResponse: Promise<CaptureResponse> = client.capture(
    "https://example.com",
    dynamicOptions,
    { method: CaptureHttpMethod.GET },
  );
  const maybeDynamicResponse: Promise<CaptureResponse> = client.capture(
    "https://example.com",
    maybeDynamicOptions,
  );
  const signaledResponse: Promise<BinaryCaptureResponse> = client.capture(
    "https://example.com",
    undefined,
    { signal: AbortSignal.timeout(1_000) },
  );
  const captureUrl: string = client.buildCaptureUrl(
    "https://example.com",
    dynamicOptions,
  );

  void defaultResponse;
  void explicitBinaryResponse;
  void jsonResponse;
  void dynamicResponse;
  void maybeDynamicResponse;
  void signaledResponse;
  void captureUrl;
}

void assertCaptureReturnTypes;

test("method values are closed while service string values remain open", () => {
  const method: CaptureHttpMethodType = CaptureHttpMethod.GET;
  const futureFormat: CaptureFormatType = "future-format";
  // @ts-expect-error CaptureHttpMethod deliberately rejects arbitrary strings.
  const invalidMethod: CaptureHttpMethodType = "get";
  const invalidCaptureOptions: CaptureOptions = {
    // @ts-expect-error Request controls do not belong in CaptureOptions.
    method: CaptureHttpMethod.GET,
  };
  assert.equal(method, "GET");
  assert.equal(futureFormat, "future-format");
  void invalidMethod;
  void invalidCaptureOptions;
});
