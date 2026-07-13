import {
  CaptureResponseType,
  ScreenshotScoutClient,
} from "@screenshotscout/sdk";

const accessKey = process.env.SCREENSHOTSCOUT_ACCESS_KEY;
if (!accessKey) throw new Error("Set SCREENSHOTSCOUT_ACCESS_KEY first.");

const secretKey = process.env.SCREENSHOTSCOUT_SECRET_KEY;
const client = new ScreenshotScoutClient({
  accessKey,
  ...(secretKey ? { secretKey } : {}),
});

const response = await client.capture("https://example.com", {
  responseType: CaptureResponseType.JSON,
  cache: true,
});

console.log(response.result.screenshotUrl);
console.log(response.result.cacheStatus);
