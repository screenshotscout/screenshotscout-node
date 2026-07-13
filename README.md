# Screenshot Scout Node.js SDK

The official Node.js and TypeScript SDK for the Screenshot Scout screenshot API.

## Requirements

- Node.js 22 or newer
- CommonJS `require()` requires Node.js 22.12 or newer

## Installation

```sh
npm install @screenshotscout/sdk
```

## Get your API credentials

Before using the SDK, [sign up for Screenshot Scout](https://screenshotscout.com/) or sign in to your existing account. Screenshot Scout automatically creates a default API key when you sign up.

Open the [API Keys page](https://screenshotscout.com/app/api-keys), copy the access key and secret key, and store them securely. The access key is required when creating `ScreenshotScoutClient`. The secret key is used when you enable and configure [signed requests](#signed-requests).

## Capture a screenshot

`capture()` uses POST by default and resolves when the screenshot is ready.

```ts
import { writeFile } from "node:fs/promises";
import { ScreenshotScoutClient } from "@screenshotscout/sdk";

const client = new ScreenshotScoutClient({
  accessKey: process.env.SCREENSHOTSCOUT_ACCESS_KEY!,
});

const response = await client.capture("https://example.com", {
  fullPage: true,
});

await writeFile("screenshot.png", response.bytes);
console.log(response.screenshotUrl);
```

By default, `capture()` returns a `BinaryCaptureResponse`, with the screenshot available as `response.bytes`.

## Request a JSON result

```ts
import {
  CaptureResponseType,
  ScreenshotScoutClient,
} from "@screenshotscout/sdk";

const client = new ScreenshotScoutClient({ accessKey: "YOUR_ACCESS_KEY" });
const response = await client.capture("https://example.com", {
  responseType: CaptureResponseType.JSON,
  cache: true,
});

console.log(response.result.screenshotUrl);
console.log(response.result.screenshotUrlExpiresAt);
console.log(response.result.cacheStatus);
```

Set `responseType` to `CaptureResponseType.JSON` to receive screenshot metadata as JSON instead of binary file data.

## Use GET

POST is the default. To use GET, set `method` to `CaptureHttpMethod.GET`:

```ts
import {
  CaptureHttpMethod,
  ScreenshotScoutClient,
} from "@screenshotscout/sdk";

const client = new ScreenshotScoutClient({ accessKey: "YOUR_ACCESS_KEY" });
await client.capture("https://example.com", {
  method: CaptureHttpMethod.GET,
  format: "webp",
});
```

## Signed requests

Pass the API key's secret key to sign GET and POST requests automatically. The secret is used locally and is never transmitted:

```ts
const client = new ScreenshotScoutClient({
  accessKey: "YOUR_ACCESS_KEY",
  secretKey: "YOUR_SECRET_KEY",
});
```

See the [signed requests guide](https://screenshotscout.com/docs/signed-requests) for details.

## Capture options

The target URL is the required first argument. `CaptureOptions` contains every current service option using camelCase:

- Output: `format`, `responseType`
- Network and location: `country`, `proxy`, `geolocationLatitude`, `geolocationLongitude`, `geolocationAccuracy`
- Cookies and webpage headers: `cookies`, `headers`
- Timing: `timeout`, `waitUntil`, `navigationTimeout`, `delay`
- Device emulation: `device`, `deviceViewportWidth`, `deviceViewportHeight`, `deviceScaleFactor`, `deviceIsMobile`, `deviceHasTouch`, `deviceUserAgent`
- Page behavior: `timezone`, `mediaType`, `colorScheme`, `reducedMotion`
- Full page: `fullPage`, `fullPagePreScroll`, `fullPagePreScrollStep`, `fullPagePreScrollStepDelay`, `fullPageMaxHeight`
- Blocking: `blockCookieBanners`, `blockAds`, `blockChatWidgets`
- DOM changes: `hideSelectors`, `clickSelectors`, `clickAllSelectors`, `injectCss`, `injectJs`, `bypassCsp`
- Framing: `selector`, `clipX`, `clipY`, `clipWidth`, `clipHeight`
- Image output: `imageWidth`, `imageHeight`, `imageMode`, `imageAnchor`, `imageAllowUpscale`, `imageBackground`, `imageQuality`
- PDF: `pdfPaperFormat`, `pdfLandscape`, `pdfPrintBackground`, `pdfMargin`, `pdfMarginTop`, `pdfMarginRight`, `pdfMarginBottom`, `pdfMarginLeft`, `pdfScale`
- Caching: `cache`, `cacheTtl`, `cacheKey`
- Storage: `storageMode`, `storageEndpoint`, `storageBucket`, `storageRegion`, `storageObjectKey`

Use `method` to select GET and `signal` to cancel a call.

Use the exported constants for autocomplete. Raw string values are also accepted:

```ts
import {
  CaptureFormat,
  CaptureWaitUntil,
} from "@screenshotscout/sdk";

await client.capture("https://example.com", {
  format: CaptureFormat.WEBP,
  waitUntil: CaptureWaitUntil.LOAD,
});
```

Repeated options accept arrays of strings and preserve their order. `null`, `undefined`, and empty arrays are omitted, while `false` and zero are sent as provided.

See the [Screenshot Scout option reference](https://screenshotscout.com/docs/screenshot-options) for service behavior and allowed values.

## Timeouts and cancellation

```ts
await client.capture("https://example.com", {
  timeout: 180, // service-side capture budget, in seconds
  signal: AbortSignal.timeout(300_000), // caller-side deadline, in milliseconds
});
```

The service `timeout` option controls how long Screenshot Scout may spend capturing the page. `signal` controls how long your application is willing to wait for the HTTP call. Use `AbortSignal.timeout(...)` for a deadline or an `AbortController` for manual cancellation.

## Advanced: custom Fetch transport

Most applications should omit this option and use Node.js's built-in `fetch`. If you provide a custom Fetch-compatible function, the SDK uses it for its API requests. The function receives the same `input` and `init` arguments as `fetch` and must return a `Promise<Response>`.

```ts
import {
  ScreenshotScoutClient,
  type ScreenshotScoutFetch,
} from "@screenshotscout/sdk";

const fetchWithStatusLogging: ScreenshotScoutFetch = async (input, init) => {
  const response = await fetch(input, init);
  console.log("Screenshot Scout response:", response.status);
  return response;
};

const client = new ScreenshotScoutClient({
  accessKey: "YOUR_ACCESS_KEY",
  fetch: fetchWithStatusLogging,
});
```

## Raw responses and errors

Every successful response has `rawResponse`, containing its status, headers, content type, and body bytes. `ScreenshotScoutApiError` provides the same raw-response access.

```ts
import {
  ScreenshotScoutApiError,
  ScreenshotScoutConfigurationError,
  ScreenshotScoutResponseDecodingError,
  ScreenshotScoutSerializationError,
  ScreenshotScoutTransportError,
} from "@screenshotscout/sdk";

try {
  await client.capture("https://example.com");
} catch (error) {
  if (error instanceof ScreenshotScoutApiError) {
    console.error(error.status, error.errorCode, error.errorMessage);
    console.error(error.errors, error.responseBody);
    console.error(error.rawResponse.body);
  } else if (error instanceof ScreenshotScoutTransportError) {
    console.error(error.cause);
  } else if (
    error instanceof ScreenshotScoutConfigurationError ||
    error instanceof ScreenshotScoutSerializationError ||
    error instanceof ScreenshotScoutResponseDecodingError
  ) {
    console.error(error.message);
  } else {
    throw error;
  }
}
```

`ScreenshotScoutApiError` exposes `errorCode`, `errorMessage`, `errors`, `responseBody`, and `rawResponse`. If a successful response does not match the requested response type, the SDK throws `ScreenshotScoutResponseDecodingError` with the response available as `rawResponse`.

## License

MIT
