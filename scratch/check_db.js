const { createClient } = require('@libsql/client');
const client = createClient({ url: 'file:local.db' }); // Adjust if DB path is different

async function checkInventory() {
  try {
    const result = await client.execute('SELECT * FROM inventory');
    console.log('Inventory Items:', JSON.stringify(result.rows, null, 2));
    
    const logs = await client.execute('SELECT * FROM daily_logs ORDER BY date DESC LIMIT 5');
    console.log('Recent Daily Logs:', JSON.stringify(logs.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    client.close();
  }
}

checkInventory();
