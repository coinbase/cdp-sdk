import { createHash } from "crypto";

export const hash = (data: Buffer) => createHash("sha256").update(data).digest("hex");
