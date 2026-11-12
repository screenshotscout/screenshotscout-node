import { ScreenshotScoutConfigurationError } from "./errors.js";

export const ACCESS_KEY_VARIABLE = "SCREENSHOTSCOUT_ACCESS_KEY";
export const SECRET_KEY_VARIABLE = "SCREENSHOTSCOUT_SECRET_KEY";

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
