"use server";

import fs from "fs";
import path from "path";

const ENV_PATH = path.resolve(process.cwd(), ".env");

function readEnvFile(): string {
  try {
    return fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf-8") : "";
  } catch {
    return "";
  }
}

function writeEnvFile(content: string) {
  fs.writeFileSync(ENV_PATH, content, "utf-8");
}

/** 讀取指定 key 的值，回傳遮罩後的字串或 null */
export async function getEnvKeyStatus(key: string): Promise<{ set: boolean; preview: string | null }> {
  const content = readEnvFile();
  const match = content.match(new RegExp(`^${key}=(.+)$`, "m"));
  const value = match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!value) return { set: false, preview: null };
  const preview = value.length > 8
    ? value.slice(0, 6) + "••••••••" + value.slice(-4)
    : "••••••••••••";
  return { set: true, preview };
}

/** 設定或更新一個 key */
export async function setEnvKey(key: string, value: string): Promise<void> {
  let content = readEnvFile();
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    content = content.trimEnd() + "\n" + line + "\n";
  }
  writeEnvFile(content);
  process.env[key] = value;
}

/** 清空一個 key（保留行但值設為空） */
export async function removeEnvKey(key: string): Promise<void> {
  let content = readEnvFile();
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=`);
  }
  writeEnvFile(content);
  delete process.env[key];
}

/** 寫入重啟信號檔後結束程序，start.command / start.bat 偵測到後自動重啟 */
export async function restartServer(): Promise<void> {
  const signalPath = path.resolve(process.cwd(), ".restart_signal");
  fs.writeFileSync(signalPath, "1");
  setTimeout(() => process.exit(1), 200);
}
