import { ScreenshotScoutClient } from "@screenshotscout/sdk";

// Reads SCREENSHOTSCOUT_ACCESS_KEY, and SCREENSHOTSCOUT_SECRET_KEY if it's set
const client = new ScreenshotScoutClient();

console.log(
  client.buildCaptureUrl("https://example.com", {
    fullPage: true,
    blockAds: true,
  }),
);
