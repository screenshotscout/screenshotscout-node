import assert from "node:assert/strict";
import test from "node:test";

import { ScreenshotScoutConfigurationError } from "../src/errors.js";
import { resolveCredentials } from "../src/credentials.js";
import type { EnvironmentReader } from "../src/credentials.js";

function environment(values: Readonly<Record<string, string>>): {
  read: EnvironmentReader;
  names: string[];
} {
  const names: string[] = [];
  const read: EnvironmentReader = (name) => {
    names.push(name);
    return values[name];
  };
  return { read, names };
}

test("with no keys passed, both variables are read", () => {
  const { read } = environment({
    SCREENSHOTSCOUT_ACCESS_KEY: "ak",
    SCREENSHOTSCOUT_SECRET_KEY: "sk",
  });

  assert.deepEqual(resolveCredentials(undefined, null, read), {
    accessKey: "ak",
    secretKey: "sk",
    fromEnvironment: true,
  });
});

test("an unset or empty secret variable means no secret key", () => {
  for (const values of [
    { SCREENSHOTSCOUT_ACCESS_KEY: "ak" },
    { SCREENSHOTSCOUT_ACCESS_KEY: "ak", SCREENSHOTSCOUT_SECRET_KEY: "" },
  ]) {
    assert.deepEqual(
      resolveCredentials(undefined, undefined, environment(values).read),
      { accessKey: "ak", secretKey: undefined, fromEnvironment: true },
    );
  }
});

test("a missing or empty access key variable is an error that names it", () => {
  for (const values of [
    {},
    { SCREENSHOTSCOUT_ACCESS_KEY: "" },
    { SCREENSHOTSCOUT_SECRET_KEY: "sk" },
  ]) {
    assert.throws(
      () => resolveCredentials(undefined, undefined, environment(values).read),
      {
        name: "ScreenshotScoutConfigurationError",
        message:
          "A non-blank Screenshot Scout access key is required. Pass one, or set SCREENSHOTSCOUT_ACCESS_KEY.",
      },
    );
  }
});

test("a whitespace-only variable is an error that names it", () => {
  assert.throws(
    () =>
      resolveCredentials(
        undefined,
        undefined,
        environment({ SCREENSHOTSCOUT_ACCESS_KEY: "  " }).read,
      ),
    {
      name: "ScreenshotScoutConfigurationError",
      message: "SCREENSHOTSCOUT_ACCESS_KEY is set but blank.",
    },
  );
  assert.throws(
    () =>
      resolveCredentials(
        undefined,
        undefined,
        environment({
          SCREENSHOTSCOUT_ACCESS_KEY: "ak",
          SCREENSHOTSCOUT_SECRET_KEY: " \t",
        }).read,
      ),
    ScreenshotScoutConfigurationError,
  );
});

test("passing either key means no variable is read", () => {
  const values = {
    SCREENSHOTSCOUT_ACCESS_KEY: "ak_env",
    SCREENSHOTSCOUT_SECRET_KEY: "sk_env",
  };

  const accessOnly = environment(values);
  assert.deepEqual(resolveCredentials("ak", undefined, accessOnly.read), {
    accessKey: "ak",
    secretKey: undefined,
    fromEnvironment: false,
  });
  assert.deepEqual(accessOnly.names, []);

  const secretOnly = environment(values);
  assert.deepEqual(resolveCredentials(null, "sk", secretOnly.read), {
    accessKey: null,
    secretKey: "sk",
    fromEnvironment: false,
  });
  assert.deepEqual(secretOnly.names, []);

  const blank = environment(values);
  assert.deepEqual(resolveCredentials("", undefined, blank.read), {
    accessKey: "",
    secretKey: undefined,
    fromEnvironment: false,
  });
  assert.deepEqual(blank.names, []);
});
