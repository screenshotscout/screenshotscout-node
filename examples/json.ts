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
console.log(response.result.cacheStatus);
