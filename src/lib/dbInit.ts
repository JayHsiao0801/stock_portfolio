export async function pushDbSchema() {
  const { execSync } = await import("child_process");
  const { join } = await import("path");
  const bin = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  execSync(`node "${bin}" db push --skip-generate --accept-data-loss`, {
    stdio: "pipe",
    cwd: process.cwd(),
    env: process.env,
  });
}
