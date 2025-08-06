// Usage: CDP_ACCESS_TOKEN=... CDP_USER_ID=... pnpm tsx end-users/validateAccessToken.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient({
    basePath: "https://cloud-api-dev.cbhq.net/platform",
    debugging: true,
});

const userId = process.env.CDP_USER_ID;
if (!userId) {
    throw new Error("CDP_USER_ID is not set");
}

const accessToken = process.env.CDP_ACCESS_TOKEN;
if (!accessToken) {
    throw new Error("CDP_ACCESS_TOKEN is not set");
}

console.log("client: ", cdp);

const response = await cdp.endUser.validateAccessToken({
    accessToken,
    userId,
});
console.log("Access token validated: ", response);