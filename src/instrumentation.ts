export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { execSync } = await import("child_process");
    try {
      execSync("npx prisma db push --skip-generate --accept-data-loss", {
        stdio: "pipe",
        cwd: process.cwd(),
      });
    } catch (e) {
      console.error("[startup] prisma db push failed:", e);
    }
  }
}
