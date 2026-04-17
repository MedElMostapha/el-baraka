import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // 1. Check existing batches
  console.log("=== Existing batches ===");
  const existing = await client.execute("SELECT * FROM batches");
  console.log("Count:", existing.rows.length);
  existing.rows.forEach(r => console.log(r));

  // 2. Try inserting
  console.log("\n=== Inserting test batch ===");
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  try {
    await client.execute({
      sql: "INSERT INTO batches (id, name, breed, arrival_date, initial_quantity, cost_per_chick, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [id, "Test Direct", "Cobb", now, 100, 0.5, "active"]
    });
    console.log("Insert OK with id:", id);
  } catch (e) {
    console.error("Insert FAILED:", e);
  }

  // 3. Verify
  console.log("\n=== After insert ===");
  const after = await client.execute("SELECT * FROM batches");
  console.log("Count:", after.rows.length);
  after.rows.forEach(r => console.log(r));
}

test().catch(console.error);
