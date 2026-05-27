export async function pushDbSchema() {
  const { execSync } = await import("child_process");
  const { join, resolve } = await import("path");

  // Resolve relative SQLite path to absolute so CLI and client use the same file
  const env = { ...process.env };
  const dbUrl = env.DATABASE_URL ?? "";
  if (dbUrl.startsWith("file:") && !dbUrl.startsWith("file:/")) {
    const rel = dbUrl.slice(5); // strip "file:"
    env.DATABASE_URL = `file:${resolve(process.cwd(), rel)}`;
  }

  const bin = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  execSync(`node "${bin}" db push --skip-generate --accept-data-loss`, {
    stdio: "pipe",
    cwd: process.cwd(),
    env,
  });
}
