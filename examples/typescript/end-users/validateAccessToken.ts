// Usage: CDP_ACCESS_TOKEN=... pnpm tsx end-users/validateAccessToken.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const accessToken = process.env.CDP_ACCESS_TOKEN;
if (!accessToken) {
    throw new Error("CDP_ACCESS_TOKEN is not set");
}

try {
    const endUser = await cdp.endUser.validateAccessToken({
        accessToken,
    });
    console.log("Access token validated: ", endUser);
} catch (error) {
    console.error("Error validating access token: ", (error as { errorMessage: string }).errorMessage);
}