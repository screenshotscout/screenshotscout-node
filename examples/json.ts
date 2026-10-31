import {
  CaptureResponseType,
  ScreenshotScoutClient,
} from "@screenshotscout/sdk";

const accessKey = process.env.SCREENSHOTSCOUT_ACCESS_KEY;
if (!accessKey) throw new Error("Set SCREENSHOTSCOUT_ACCESS_KEY first.");

const client = new ScreenshotScoutClient({ accessKey });
const response = await client.capture("https://example.com", {
  responseType: CaptureResponseType.JSON,
  cache: true,
});

console.log(response.result.screenshotUrl);
console.log(response.result.cacheStatus);
