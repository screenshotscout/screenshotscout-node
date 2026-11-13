import assert from "node:assert/strict";
import test from "node:test";

import { ScreenshotScoutConfigurationError } from "../src/errors.js";
import {
  resolveCaptureEndpoint,
  resolveCredentials,
} from "../src/credentials.js";
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

test("a base URL is used as given without trailing slashes, and no variable is read", () => {
  const cases: Array<[string, string]> = [
    ["http://localhost:8787", "http://localhost:8787/v1/capture"],
    ["http://localhost:8787/", "http://localhost:8787/v1/capture"],
    [
      "https://proxy.example.com/screenshotscout//",
      "https://proxy.example.com/screenshotscout/v1/capture",
    ],
    [
      "https://proxy.example.com/a%20b",
      "https://proxy.example.com/a%20b/v1/capture",
    ],
  ];

  for (const [baseUrl, captureEndpoint] of cases) {
    const env = environment({ SCREENSHOTSCOUT_BASE_URL: "http://env.example" });
    assert.deepEqual(resolveCaptureEndpoint(baseUrl, env.read), {
      captureEndpoint,
      fromEnvironment: false,
    });
    assert.deepEqual(env.names, []);
  }
});

test("without a base URL, SCREENSHOTSCOUT_BASE_URL is read", () => {
  for (const baseUrl of [undefined, null, ""]) {
    const env = environment({
      SCREENSHOTSCOUT_BASE_URL: "http://localhost:8787/",
    });
    assert.deepEqual(resolveCaptureEndpoint(baseUrl, env.read), {
      captureEndpoint: "http://localhost:8787/v1/capture",
      fromEnvironment: true,
    });
    assert.deepEqual(env.names, ["SCREENSHOTSCOUT_BASE_URL"]);
  }
});

test("an unset or empty SCREENSHOTSCOUT_BASE_URL means the Screenshot Scout API", () => {
  for (const values of [{}, { SCREENSHOTSCOUT_BASE_URL: "" }]) {
    assert.deepEqual(
      resolveCaptureEndpoint(undefined, environment(values).read),
      {
        captureEndpoint: "https://api.screenshotscout.com/v1/capture",
        fromEnvironment: false,
      },
    );
  }
});

test("a blank SCREENSHOTSCOUT_BASE_URL or a base URL that isn't a string is an error", () => {
  assert.throws(
    () =>
      resolveCaptureEndpoint(
        undefined,
        environment({ SCREENSHOTSCOUT_BASE_URL: "  " }).read,
      ),
    {
      name: "ScreenshotScoutConfigurationError",
      message: "SCREENSHOTSCOUT_BASE_URL is set but blank.",
    },
  );
  assert.throws(() => resolveCaptureEndpoint(1, environment({}).read), {
    name: "ScreenshotScoutConfigurationError",
    message: "The Screenshot Scout base URL must be a string when provided.",
  });
});
