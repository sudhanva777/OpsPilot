const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();

    const result = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = $2 ORDER BY table_name",
      ["public", "BASE TABLE"]
    );

    console.log("Tables found:", result.rows.length);
    for (const row of result.rows) {
      console.log("-", row.table_name);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Check failed:", error.code || error.message);
  process.exitCode = 1;
});
