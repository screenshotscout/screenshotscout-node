import { writeFile } from "node:fs/promises";

import { ScreenshotScoutClient } from "@screenshotscout/sdk";

const accessKey = process.env.SCREENSHOTSCOUT_ACCESS_KEY;
if (!accessKey) throw new Error("Set SCREENSHOTSCOUT_ACCESS_KEY first.");

const client = new ScreenshotScoutClient({ accessKey });
const response = await client.capture("https://example.com", {
  fullPage: true,
});

await writeFile("screenshot.png", response.bytes);
console.log(response.screenshotUrl);
