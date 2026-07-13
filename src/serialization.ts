import {
  ScreenshotScoutError,
  ScreenshotScoutSerializationError,
} from "./errors.js";
import { CaptureHttpMethod } from "./types.js";
import type {
  CaptureOptions,
  CaptureServiceOptions,
} from "./types.js";

type WireScalar = string | number | boolean;
export type WireJsonValue = WireScalar | WireScalar[];
export type WirePair = readonly [name: string, value: string];

export interface SerializedCaptureRequest {
  readonly method: CaptureHttpMethod;
  readonly signal: AbortSignal | undefined;
  readonly pairs: readonly WirePair[];
  readonly body: Readonly<Record<string, WireJsonValue>>;
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
  cache: "cache",
  cacheTtl: "cache_ttl",
  cacheKey: "cache_key",
  storageMode: "storage_mode",
  storageEndpoint: "storage_endpoint",
  storageBucket: "storage_bucket",
  storageRegion: "storage_region",
  storageObjectKey: "storage_object_key",
} as const satisfies Readonly<Record<keyof CaptureServiceOptions, string>>;

const REPEATED_OPTIONS = new Set<keyof CaptureServiceOptions>([
  "cookies",
  "headers",
  "hideSelectors",
  "clickSelectors",
  "clickAllSelectors",
  "injectCss",
  "injectJs",
]);

const ALLOWED_OPTION_KEYS = new Set<string>([
  ...Object.keys(WIRE_NAMES),
  "method",
  "signal",
]);

export function serializeCaptureRequest(
  targetUrl: string,
  options?: CaptureOptions | null,
): SerializedCaptureRequest {
  try {
    return serializeCaptureRequestUnsafe(targetUrl, options);
  } catch (error) {
    if (error instanceof ScreenshotScoutError) throw error;
    throw new ScreenshotScoutSerializationError(
      "Capture options could not be serialized.",
      undefined,
      { cause: error },
    );
  }
}

function serializeCaptureRequestUnsafe(
  targetUrl: string,
  options?: CaptureOptions | null,
): SerializedCaptureRequest {
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

  const methodValue = options?.method;
  const method =
    methodValue === undefined || methodValue === null
      ? CaptureHttpMethod.POST
      : methodValue;
  if (method !== CaptureHttpMethod.GET && method !== CaptureHttpMethod.POST) {
    throw new ScreenshotScoutSerializationError(
      'The capture method must be CaptureHttpMethod.GET or CaptureHttpMethod.POST.',
      "method",
    );
  }

  const signalValue = options?.signal;
  const signal =
    signalValue === undefined || signalValue === null
      ? undefined
      : signalValue;
  if (signal !== undefined && !isAbortSignal(signal)) {
    throw new ScreenshotScoutSerializationError(
      "The capture signal must be an AbortSignal.",
      "signal",
    );
  }

  const pairs: WirePair[] = [["url", targetUrl]];
  const body: Record<string, WireJsonValue> = { url: targetUrl };

  for (const property of Object.keys(WIRE_NAMES) as Array<
    keyof CaptureServiceOptions
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

  return { method, signal, pairs, body };
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

  const canonical = new URLSearchParams();
  for (const { name, value } of entries) canonical.append(name, value);
  return canonical.toString();
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
