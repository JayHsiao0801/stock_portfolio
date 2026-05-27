import fs from "fs";
import path from "path";

const ENV_PATH = path.resolve(process.cwd(), ".env");

function readFromFile(key: string): string {
  try {
    const content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf-8") : "";
    const match = content.match(new RegExp(`^${key}=(.+)$`, "m"));
    return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
  } catch {
    return "";
  }
}

/** 讀取 env 變數，優先用 process.env，再從 .env 檔取 */
export function getEnvValue(key: string): string {
  return process.env[key] || readFromFile(key);
}
