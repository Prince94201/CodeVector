const pool = require('../src/db');

const categories = ['Electronics', 'Clothing', 'Books', 'Food', 'Sports', 'Toys'];
const TOTAL_ROWS = 200000;
const BATCH_SIZE = 5000;

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date) {
  const pad = (num, size = 2) => String(num).padStart(size, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const ms = pad(date.getMilliseconds(), 3);
  return `${yyyy}-${MM}-${DD} ${hh}:${mm}:${ss}.${ms}`;
}

async function seed() {
  console.log('Starting seed process...');
  const startTime = Date.now();
  const now = new Date();
  const fourMonthsAgo = new Date();
  fourMonthsAgo.setMonth(now.getMonth() - 4);

  // Get a single connection to perform the transaction
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Clear existing records
    console.log('Clearing old products...');
    await connection.query('TRUNCATE TABLE products');

    const totalBatches = TOTAL_ROWS / BATCH_SIZE;

    for (let batch = 1; batch <= totalBatches; batch++) {
      const placeholders = [];
      const values = [];

      for (let i = 0; i < BATCH_SIZE; i++) {
        const productNum = (batch - 1) * BATCH_SIZE + i + 1;
        const name = `Product ${Math.floor(Math.random() * 1000000)} #${productNum}`;
        const category = categories[Math.floor(Math.random() * categories.length)];
        const price = parseFloat((Math.random() * 495 + 5).toFixed(2));
        
        const createdAt = randomDate(fourMonthsAgo, now);
        // Slightly after created_at (0 to 1000 seconds later)
        const updatedAt = new Date(createdAt.getTime() + Math.random() * 1000000);

        placeholders.push('(UUID(), ?, ?, ?, ?, ?)');
        values.push(name, category, price, formatDate(createdAt), formatDate(updatedAt));
      }

      const sql = `INSERT INTO products (id, name, category, price, created_at, updated_at) VALUES ${placeholders.join(', ')}`;
      await connection.query(sql, values);
      
      console.log(`Inserted batch ${batch}/${totalBatches} (${batch * BATCH_SIZE} rows)`);
    }

    await connection.commit();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Successfully seeded ${TOTAL_ROWS} products in ${duration} seconds!`);
  } catch (error) {
    await connection.rollback();
    console.error('Seeding failed. Transaction rolled back:', error);
  } finally {
    connection.release();
    await pool.end();
  }
}

seed();
