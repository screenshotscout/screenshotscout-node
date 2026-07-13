/** A documented string value with autocomplete while still accepting future/raw service values. */
export type OpenString<T extends string> = T | (string & Record<never, never>);

export const CaptureHttpMethod = {
  GET: "GET",
  POST: "POST",
} as const;

/** The SDK-owned request method selector. Unlike service values, this type is closed. */
export type CaptureHttpMethod =
  (typeof CaptureHttpMethod)[keyof typeof CaptureHttpMethod];

export const CaptureFormat = {
  GIF: "gif",
  JPEG: "jpeg",
  JPG: "jpg",
  PDF: "pdf",
  PNG: "png",
  TIFF: "tiff",
  WEBP: "webp",
} as const;

export type CaptureFormat = OpenString<
  (typeof CaptureFormat)[keyof typeof CaptureFormat]
>;

export const CaptureResponseType = {
  BINARY: "binary",
  JSON: "json",
} as const;

export type CaptureResponseType = OpenString<
  (typeof CaptureResponseType)[keyof typeof CaptureResponseType]
>;

export const CaptureWaitUntil = {
  DOM_CONTENT_LOADED: "domcontentloaded",
  LOAD: "load",
  NETWORK_IDLE_0: "networkidle0",
  NETWORK_IDLE_2: "networkidle2",
} as const;

export type CaptureWaitUntil = OpenString<
  (typeof CaptureWaitUntil)[keyof typeof CaptureWaitUntil]
>;

export const CaptureMediaType = {
  PRINT: "print",
  SCREEN: "screen",
} as const;

export type CaptureMediaType = OpenString<
  (typeof CaptureMediaType)[keyof typeof CaptureMediaType]
>;

export const CaptureColorScheme = {
  AUTO: "auto",
  DARK: "dark",
  LIGHT: "light",
} as const;

export type CaptureColorScheme = OpenString<
  (typeof CaptureColorScheme)[keyof typeof CaptureColorScheme]
>;

export const CaptureImageMode = {
  FILL: "fill",
  FIT: "fit",
  STRETCH: "stretch",
} as const;

export type CaptureImageMode = OpenString<
  (typeof CaptureImageMode)[keyof typeof CaptureImageMode]
>;

export const CaptureImageAnchor = {
  BOTTOM: "bottom",
  BOTTOM_LEFT: "bottom_left",
  BOTTOM_RIGHT: "bottom_right",
  CENTER: "center",
  LEFT: "left",
  RIGHT: "right",
  TOP: "top",
  TOP_LEFT: "top_left",
  TOP_RIGHT: "top_right",
} as const;

export type CaptureImageAnchor = OpenString<
  (typeof CaptureImageAnchor)[keyof typeof CaptureImageAnchor]
>;

export const CapturePdfPaperFormat = {
  A3: "a3",
  A4: "a4",
  CONTENT: "content",
  LEGAL: "legal",
  LETTER: "letter",
  TABLOID: "tabloid",
} as const;

export type CapturePdfPaperFormat = OpenString<
  (typeof CapturePdfPaperFormat)[keyof typeof CapturePdfPaperFormat]
>;

export const CaptureStorageMode = {
  EXTERNAL: "external",
  MANAGED: "managed",
} as const;

export type CaptureStorageMode = OpenString<
  (typeof CaptureStorageMode)[keyof typeof CaptureStorageMode]
>;

/** Screenshot Scout service options. `url`, credentials, and signatures are deliberately absent. */
export interface CaptureServiceOptions {
  // Target and output
  format?: CaptureFormat | null;
  responseType?: CaptureResponseType | null;

  // Network and location
  country?: string | null;
  proxy?: string | null;
  geolocationLatitude?: number | null;
  geolocationLongitude?: number | null;
  geolocationAccuracy?: number | null;

  // Cookies and webpage request headers. Order and duplicates are preserved.
  cookies?: readonly string[] | null;
  headers?: readonly string[] | null;

  // Navigation and service-side timing (seconds unless noted otherwise)
  timeout?: number | null;
  waitUntil?: CaptureWaitUntil | null;
  navigationTimeout?: number | null;
  delay?: number | null;

  // Viewport and device emulation
  device?: string | null;
  deviceViewportWidth?: number | null;
  deviceViewportHeight?: number | null;
  deviceScaleFactor?: number | null;
  deviceIsMobile?: boolean | null;
  deviceHasTouch?: boolean | null;
  deviceUserAgent?: string | null;

  // Page behavior and preferences
  timezone?: string | null;
  mediaType?: CaptureMediaType | null;
  colorScheme?: CaptureColorScheme | null;
  reducedMotion?: boolean | null;

  // Full-page capture and pre-scroll behavior
  fullPage?: boolean | null;
  fullPagePreScroll?: boolean | null;
  fullPagePreScrollStep?: number | null;
  fullPagePreScrollStepDelay?: number | null;
  fullPageMaxHeight?: number | null;

  // Blocking
  blockCookieBanners?: boolean | null;
  blockAds?: boolean | null;
  blockChatWidgets?: boolean | null;

  // DOM interactions and injections. Order and duplicates are preserved.
  hideSelectors?: readonly string[] | null;
  clickSelectors?: readonly string[] | null;
  clickAllSelectors?: readonly string[] | null;
  injectCss?: readonly string[] | null;
  injectJs?: readonly string[] | null;
  bypassCsp?: boolean | null;

  // Framing and selection
  selector?: string | null;
  clipX?: number | null;
  clipY?: number | null;
  clipWidth?: number | null;
  clipHeight?: number | null;

  // Image resizing and quality
  imageWidth?: number | null;
  imageHeight?: number | null;
  imageMode?: CaptureImageMode | null;
  imageAnchor?: CaptureImageAnchor | null;
  imageAllowUpscale?: boolean | null;
  imageBackground?: string | null;
  imageQuality?: number | null;

  // PDF
  pdfPaperFormat?: CapturePdfPaperFormat | null;
  pdfLandscape?: boolean | null;
  pdfPrintBackground?: boolean | null;
  pdfMargin?: string | null;
  pdfMarginTop?: string | null;
  pdfMarginRight?: string | null;
  pdfMarginBottom?: string | null;
  pdfMarginLeft?: string | null;
  pdfScale?: number | null;

  // Caching
  cache?: boolean | null;
  cacheTtl?: number | null;
  cacheKey?: string | null;

  // Storage
  storageMode?: CaptureStorageMode | null;
  storageEndpoint?: string | null;
  storageBucket?: string | null;
  storageRegion?: string | null;
  storageObjectKey?: string | null;
}

/** Per-call controls used only by the SDK and never serialized as capture options. */
export interface CaptureRequestOptions {
  /** Defaults to POST. */
  method?: CaptureHttpMethod | null;
  /** Cancels this call using normal Fetch/AbortSignal semantics. */
  signal?: AbortSignal | null;
}

export interface CaptureOptions
  extends CaptureServiceOptions,
    CaptureRequestOptions {}

/** Options that request the default binary representation. */
export type BinaryCaptureOptions = Omit<CaptureOptions, "responseType"> & {
  responseType?: typeof CaptureResponseType.BINARY | null;
};

/** Options that explicitly request the JSON representation. */
export type JsonCaptureOptions = Omit<CaptureOptions, "responseType"> & {
  responseType: typeof CaptureResponseType.JSON;
};

export type ScreenshotScoutFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface ScreenshotScoutClientOptions {
  accessKey: string;
  secretKey?: string | null;
  /** Advanced: Fetch-compatible transport. Defaults to the platform Fetch implementation. */
  fetch?: ScreenshotScoutFetch | null;
}

/** Exact buffered HTTP response data made available on successes and API failures. */
export interface RawResponse {
  readonly status: number;
  readonly statusText: string;
  readonly headers: ReadonlyMap<string, readonly string[]>;
  readonly contentType: string | null;
  readonly body: Uint8Array;
}

export interface CaptureResult {
  readonly screenshotUrl?: string;
  readonly screenshotUrlExpiresAt?: string;
  readonly cacheStatus?: string;
  /** Any unrecognized JSON result properties, retained without transformation. */
  readonly additionalFields: Readonly<Record<string, unknown>>;
}

export interface BinaryCaptureResponse {
  readonly kind: "binary";
  readonly bytes: Uint8Array;
  readonly screenshotUrl?: string;
  readonly screenshotUrlExpiresAt?: string;
  readonly cacheStatus?: string;
  readonly rawResponse: RawResponse;
}

export interface JsonCaptureResponse {
  readonly kind: "json";
  readonly result: CaptureResult;
  readonly rawResponse: RawResponse;
}

export type CaptureResponse = BinaryCaptureResponse | JsonCaptureResponse;
