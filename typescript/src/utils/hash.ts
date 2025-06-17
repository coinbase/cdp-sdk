import { createHash } from "crypto";

export const hash = (data: string) => createHash("sha256").update(data).digest("hex");
