# Screenshot Scout Node.js SDK

The official Node.js SDK for the [Screenshot Scout](https://screenshotscout.com/) screenshot API.

## Requirements

- Node.js 22 or newer
- CommonJS `require()` requires Node.js 22.12 or newer

## Installation

```sh
npm install @screenshotscout/sdk
```

The SDK works with both TypeScript and JavaScript. The examples below use TypeScript; JavaScript users can use the same API by omitting TypeScript-only syntax.

In a CommonJS project running Node.js 22.12 or newer, load the SDK with `require()`:

```js
const { ScreenshotScoutClient } = require("@screenshotscout/sdk");
```

## Get your API credentials

Before using the SDK, [sign up for Screenshot Scout](https://screenshotscout.com/auth/signup) or sign in to your existing account. Screenshot Scout automatically creates a default API key when you sign up.

Open the [API Keys page](https://screenshotscout.com/app/api-keys) and copy the access key. You only need the secret key for [signed requests](#signed-requests).

Set the access key as the `SCREENSHOTSCOUT_ACCESS_KEY` environment variable, or [pass it in code](#pass-the-keys-yourself).

## Capture a screenshot

Create a client and call `capture()` with the URL you want to screenshot:

```ts
import { writeFile } from "node:fs/promises";
import { ScreenshotScoutClient } from "@screenshotscout/sdk";

const client = new ScreenshotScoutClient(); // Reads SCREENSHOTSCOUT_ACCESS_KEY

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

const client = new ScreenshotScoutClient(); // Reads SCREENSHOTSCOUT_ACCESS_KEY
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

POST is the default, or GET when the client has a secret key. To use GET, pass `CaptureHttpMethod.GET` in the third argument:

```ts
import { CaptureHttpMethod, ScreenshotScoutClient } from "@screenshotscout/sdk";

const client = new ScreenshotScoutClient(); // Reads SCREENSHOTSCOUT_ACCESS_KEY
await client.capture(
  "https://example.com",
  { format: "webp" },
  { method: CaptureHttpMethod.GET },
);
```

## Build a capture URL

Use `buildCaptureUrl()` when another application or an HTML `<img>` element needs to load the screenshot directly. It builds the URL without making an API request and accepts the same `CaptureOptions` as `capture()`:

```ts
import {
  ScreenshotScoutClient,
  type CaptureOptions,
} from "@screenshotscout/sdk";

const client = new ScreenshotScoutClient(); // Reads SCREENSHOTSCOUT_ACCESS_KEY
const captureOptions = {
  fullPage: true,
  blockAds: true,
} satisfies CaptureOptions;

const captureUrl = client.buildCaptureUrl(
  "https://example.com",
  captureOptions,
);

console.log(captureUrl);
```

The generated URL contains the access key as a query parameter. When the client has a secret key, the SDK also signs the URL automatically; without a secret key, it builds an unsigned URL. Treat generated URLs as sensitive. Before exposing them to browsers or users, configure a secret key and enable **Require signed requests** for the API key on the [API Keys page](https://screenshotscout.com/app/api-keys).

## Signed requests

Set the API key's secret key as the `SCREENSHOTSCOUT_SECRET_KEY` environment variable. The client then signs its capture requests and the capture URLs it builds, with no change to your code:

```ts
import { ScreenshotScoutClient } from "@screenshotscout/sdk";

const client = new ScreenshotScoutClient(); // Reads SCREENSHOTSCOUT_ACCESS_KEY and SCREENSHOTSCOUT_SECRET_KEY

await client.capture("https://example.com", { fullPage: true });
```

The secret key is used locally and is never transmitted. See the [signed requests guide](https://screenshotscout.com/docs/signed-requests) for details.

## Pass the keys yourself

To use keys from somewhere other than the environment, such as a secrets manager or per-customer settings, pass them to the client:

```ts
import { ScreenshotScoutClient } from "@screenshotscout/sdk";

const client = new ScreenshotScoutClient({
  accessKey: config.accessKey,
  secretKey: config.secretKey, // optional
});
```

If you pass either key, the client reads neither environment variable. If you pass no key, for example because the variable holding it is `undefined`, the client reads both environment variables instead.

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
- PDF: `pdfPaperFormat`, `pdfLandscape`, `pdfPrintBackground`, `pdfMargin`, `pdfMarginTop`, `pdfMarginRight`, `pdfMarginBottom`, `pdfMarginLeft`, `pdfScale`, `pdfPageRanges`
- Caching: `cache`, `cacheTtl`, `cacheKey`
- Storage: `storageMode`, `storageEndpoint`, `storageBucket`, `storageRegion`, `storageObjectKey`

Pass `CaptureRequestOptions` as the optional third argument to select GET or POST or cancel the request.

Use the exported constants for autocomplete. Raw string values are also accepted:

```ts
import { CaptureFormat, CaptureWaitUntil } from "@screenshotscout/sdk";

await client.capture("https://example.com", {
  format: CaptureFormat.WEBP,
  waitUntil: CaptureWaitUntil.LOAD,
});
```

Repeated options accept arrays of strings and preserve their order. `null`, `undefined`, and empty arrays are omitted, while `false` and zero are sent as provided.

See the [Screenshot Scout option reference](https://screenshotscout.com/docs/screenshot-options) for service behavior and allowed values.

## Timeouts and cancellation

```ts
await client.capture(
  "https://example.com",
  {
    timeout: 180, // service-side capture budget, in seconds
  },
  {
    signal: AbortSignal.timeout(300_000), // caller-side deadline, in milliseconds
  },
);
```

The service `timeout` option controls how long Screenshot Scout may spend capturing the page. The request `signal` controls how long your application is willing to wait for the HTTP call. Use `AbortSignal.timeout(...)` for a deadline or an `AbortController` for manual cancellation.

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

const client = new ScreenshotScoutClient({ fetch: fetchWithStatusLogging }); // Reads SCREENSHOTSCOUT_ACCESS_KEY
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
