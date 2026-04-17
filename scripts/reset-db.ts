import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function reset() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Fetching existing tables...");
  const tablesResult = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
  );

  const tables = tablesResult.rows.map(row => row.name as string);

  if (tables.length === 0) {
    console.log("No tables found. Database is already clean.");
    return;
  }

  console.log(`Found tables: ${tables.join(', ')}. Dropping them...`);

  // Disable foreign key checks to drop tables in any order
  await client.execute("PRAGMA foreign_keys = OFF;");

  for (const table of tables) {
    await client.execute(`DROP TABLE IF EXISTS "${table}";`);
    console.log(`Dropped table: ${table}`);
  }

  await client.execute("PRAGMA foreign_keys = ON;");
  console.log("Database reset successfully!");
}

reset().catch(err => {
  console.error("Reset failed:", err);
  process.exit(1);
});
