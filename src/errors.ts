import type { RawResponse } from "./types.js";

export class ScreenshotScoutError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ScreenshotScoutConfigurationError extends ScreenshotScoutError {}

export class ScreenshotScoutSerializationError extends ScreenshotScoutError {
  readonly option: string | undefined;

  constructor(
    message: string,
    option?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.option = option;
  }
}

export class ScreenshotScoutTransportError extends ScreenshotScoutError {
  constructor(message: string, cause: unknown) {
    super(message, { cause });
  }
}

export class ScreenshotScoutApiError extends ScreenshotScoutError {
  readonly status: number;
  readonly errorCode: string | undefined;
  readonly errorMessage: string | undefined;
  readonly errors: readonly unknown[] | undefined;
  readonly responseBody: unknown;
  readonly rawResponse: RawResponse;

  constructor(args: {
    rawResponse: RawResponse;
    responseBody?: unknown;
    errorCode?: string;
    errorMessage?: string;
    errors?: readonly unknown[];
  }) {
    super(
      args.errorMessage ??
        `Screenshot Scout API request failed with status ${args.rawResponse.status}.`,
    );
    this.status = args.rawResponse.status;
    this.errorCode = args.errorCode;
    this.errorMessage = args.errorMessage;
    this.errors = args.errors;
    this.responseBody = args.responseBody;
    this.rawResponse = args.rawResponse;
  }
}

export class ScreenshotScoutResponseDecodingError extends ScreenshotScoutError {
  readonly rawResponse: RawResponse;

  constructor(message: string, rawResponse: RawResponse, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.rawResponse = rawResponse;
  }
}
