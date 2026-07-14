import { ScreenshotScoutClient } from "@screenshotscout/sdk";

const accessKey = process.env.SCREENSHOTSCOUT_ACCESS_KEY;
if (!accessKey) throw new Error("Set SCREENSHOTSCOUT_ACCESS_KEY first.");

const secretKey = process.env.SCREENSHOTSCOUT_SECRET_KEY;
const client = new ScreenshotScoutClient({
  accessKey,
  ...(secretKey ? { secretKey } : {}),
});

console.log(
  client.buildCaptureUrl("https://example.com", {
    fullPage: true,
    blockAds: true,
  }),
);
