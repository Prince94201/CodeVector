const express = require('express');
const cors = require('cors');
const productsRouter = require('./routes/products');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Mount products router at /products
app.use('/products', productsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
