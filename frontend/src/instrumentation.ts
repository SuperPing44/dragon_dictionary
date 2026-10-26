export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Open the database at startup: back up if due, then migrate.
    const { initDb } = await import("./db/connection");
    await initDb();
  }
}
