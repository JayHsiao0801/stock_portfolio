export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { pushDbSchema } = await import("@/lib/dbInit");
      await pushDbSchema();
    } catch (e) {
      console.error("[startup] prisma db push failed:", e);
    }
  }
}
