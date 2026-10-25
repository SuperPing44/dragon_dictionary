export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Open the database at startup so migrations run before the first request.
    const { getDb } = await import("./db/connection");
    getDb();
  }
}
