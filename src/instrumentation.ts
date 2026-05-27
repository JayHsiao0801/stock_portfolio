export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await pushDbSchema();
  }
}

export async function pushDbSchema() {
  const { execSync } = await import("child_process");
  const { join } = await import("path");
  try {
    const ext = process.platform === "win32" ? ".cmd" : "";
    const bin = join(process.cwd(), "node_modules", ".bin", `prisma${ext}`);
    execSync(`"${bin}" db push --skip-generate --accept-data-loss`, {
      stdio: "pipe",
      cwd: process.cwd(),
    });
  } catch (e) {
    console.error("[startup] prisma db push failed:", e);
  }
}
