const express = require('express');
const router = express.Router();
const pool = require('../db');
const { encodeCursor, decodeCursor } = require('../../utils/cursor');

// GET /products - Get products list with cursor pagination and optional category filter
router.get('/', async (req, res) => {
  try {
    let limit = parseInt(req.query.limit || '20', 10);
    if (isNaN(limit) || limit <= 0) {
      limit = 20;
    }
    if (limit > 100) {
      limit = 100;
    }

    const { cursor, category } = req.query;
    const decodedCursor = decodeCursor(cursor);

    let query = 'SELECT id, name, category, price, created_at, updated_at FROM products';
    const conditions = [];
    const params = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (decodedCursor) {
      // The cursor WHERE clause for MySQL: (created_at < ? OR (created_at = ? AND id < ?))
      conditions.push('(created_at < ? OR (created_at = ? AND id < ?))');
      params.push(
        new Date(decodedCursor.createdAt),
        new Date(decodedCursor.createdAt),
        decodedCursor.id
      );
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Always order by created_at DESC, id DESC to match indices
    query += ' ORDER BY created_at DESC, id DESC LIMIT ?';
    params.push(limit + 1);

    const [rows] = await pool.query(query, params);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor = null;
    if (hasMore && data.length > 0) {
      nextCursor = encodeCursor(data[data.length - 1]);
    }

    res.json({
      data,
      next_cursor: nextCursor,
      has_more: hasMore,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /products/categories - Get list of distinct categories
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT category FROM products ORDER BY category ASC');
    const categories = rows.map(row => row.category);
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
