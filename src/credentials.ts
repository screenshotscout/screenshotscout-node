import { ScreenshotScoutConfigurationError } from "./errors.js";

export const ACCESS_KEY_VARIABLE = "SCREENSHOTSCOUT_ACCESS_KEY";
export const SECRET_KEY_VARIABLE = "SCREENSHOTSCOUT_SECRET_KEY";
export const BASE_URL_VARIABLE = "SCREENSHOTSCOUT_BASE_URL";

const DEFAULT_BASE_URL = "https://api.screenshotscout.com";
const CAPTURE_PATH = "/v1/capture";

/** Returns the value of one environment variable, or `undefined` when it isn't set. */
export type EnvironmentReader = (name: string) => string | undefined;

export interface ResolvedCredentials {
  /** The keys to validate, from the options or from the environment. */
  readonly accessKey: unknown;
  readonly secretKey: unknown;
  /** Whether the keys were read from the environment. */
  readonly fromEnvironment: boolean;
}

/** Reads `process.env` where it exists. Runtimes without it, or that deny access, count as unset. */
export function readProcessEnvironment(name: string): string | undefined {
  try {
    const environment = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env;
    const value = environment?.[name];
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Picks the keys the client uses. Keys passed in the options always win: if either one is passed,
 * neither variable is read. Only when both are missing (`undefined` or `null`) are both read from
 * the environment.
 */
export function resolveCredentials(
  accessKey: unknown,
  secretKey: unknown,
  readEnvironment: EnvironmentReader,
): ResolvedCredentials {
  if (!isMissing(accessKey) || !isMissing(secretKey)) {
    return {
      accessKey,
      secretKey: isMissing(secretKey) ? undefined : secretKey,
      fromEnvironment: false,
    };
  }

  const environmentAccessKey = readVariable(
    readEnvironment,
    ACCESS_KEY_VARIABLE,
  );
  const environmentSecretKey = readVariable(
    readEnvironment,
    SECRET_KEY_VARIABLE,
  );
  if (environmentAccessKey === undefined) {
    throw new ScreenshotScoutConfigurationError(
      `A non-blank Screenshot Scout access key is required. Pass one, or set ${ACCESS_KEY_VARIABLE}.`,
    );
  }

  return {
    accessKey: environmentAccessKey,
    secretKey: environmentSecretKey,
    fromEnvironment: true,
  };
}

export interface ResolvedCaptureEndpoint {
  /** The URL captures are sent to and capture URLs are built on. */
  readonly captureEndpoint: string;
  /** Whether the base URL was read from the environment. */
  readonly fromEnvironment: boolean;
}

/**
 * Picks the capture endpoint. A base URL in the options wins. Without one, the variable is read,
 * whether or not keys were passed, and without that the production API is used. The base URL is
 * used as given: only trailing slashes are removed before the capture path is appended.
 */
export function resolveCaptureEndpoint(
  baseUrl: unknown,
  readEnvironment: EnvironmentReader,
): ResolvedCaptureEndpoint {
  if (!isMissing(baseUrl) && typeof baseUrl !== "string") {
    throw new ScreenshotScoutConfigurationError(
      "The Screenshot Scout base URL must be a string when provided.",
    );
  }
  if (typeof baseUrl === "string" && baseUrl !== "") {
    return {
      captureEndpoint: appendCapturePath(baseUrl),
      fromEnvironment: false,
    };
  }

  const environmentBaseUrl = readVariable(readEnvironment, BASE_URL_VARIABLE);
  if (environmentBaseUrl !== undefined) {
    return {
      captureEndpoint: appendCapturePath(environmentBaseUrl),
      fromEnvironment: true,
    };
  }

  return {
    captureEndpoint: appendCapturePath(DEFAULT_BASE_URL),
    fromEnvironment: false,
  };
}

function appendCapturePath(baseUrl: string): string {
  let end = baseUrl.length;
  while (end > 0 && baseUrl[end - 1] === "/") end -= 1;
  return baseUrl.slice(0, end) + CAPTURE_PATH;
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null;
}

function readVariable(
  readEnvironment: EnvironmentReader,
  name: string,
): string | undefined {
  const value = readEnvironment(name);
  if (value === undefined || value === "") return undefined;
  if (value.trim().length === 0) {
    throw new ScreenshotScoutConfigurationError(`${name} is set but blank.`);
  }
  return value;
}
