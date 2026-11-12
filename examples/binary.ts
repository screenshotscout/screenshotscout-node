import { writeFile } from "node:fs/promises";

import { ScreenshotScoutClient } from "@screenshotscout/sdk";

const client = new ScreenshotScoutClient(); // Reads SCREENSHOTSCOUT_ACCESS_KEY
const response = await client.capture("https://example.com", {
  fullPage: true,
});

await writeFile("screenshot.png", response.bytes);
console.log(response.screenshotUrl);
