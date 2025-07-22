import { generateJwt } from "../../auth/utils/jwt.js";
import { config } from "../../openapi-client/cdpApiClient.js";

/**
 * Get the base node RPC URL for a given network. Can also be used as a Paymaster URL
 *
 * @param network - The network identifier
 * @returns The base node RPC URL or undefined if the network is not supported
 */
export async function getBaseNodeRpcUrl(
  network: "base" | "base-sepolia",
): Promise<string | undefined> {
  if (!config) {
    return;
  }

  try {
    const basePath = config.basePath?.replace("/platform", "");

    const jwt = await generateJwt({
      apiKeyId: config.apiKeyId,
      apiKeySecret: config.apiKeySecret,
      requestMethod: "GET",
      requestHost: basePath.replace("https://", ""),
      requestPath: "/apikeys/v1/tokens/active",
    });

    const response = await fetch(`${basePath}/apikeys/v1/tokens/active`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
    });

    const json = await response.json();
    return `${basePath}/rpc/v1/${network}/${json.id}`;
  } catch {
    return;
  }
}
