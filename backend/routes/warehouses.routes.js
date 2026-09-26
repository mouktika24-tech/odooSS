const express = require('express');
const { pool } = require('../config/db');

const router = express.Router();

const sendError = (res, status, message, errors = []) => {
  return res.status(status).json({
    success: false,
    message,
    errors,
  });
};

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

router.get('/warehouses', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, code, address
       FROM warehouses
       ORDER BY name ASC`
    );

    return res.status(200).json({
      success: true,
      message: 'Warehouses retrieved successfully.',
      data: result.rows,
    });
  } catch (error) {
    console.error('Get warehouses error:', error);

    return sendError(
      res,
      500,
      'Unable to retrieve warehouses right now. Please try again later.',
      []
    );
  }
});

router.post('/warehouses', async (req, res) => {
  try {
    const { name, code, address } = req.body;
    const warehouseName = normalizeText(name);
    const warehouseCode = normalizeText(code);
    const warehouseAddress = typeof address === 'string' ? address.trim() : '';

    if (!warehouseName) {
      return sendError(res, 400, 'Warehouse name is required.', []);
    }

    if (!warehouseCode) {
      return sendError(res, 400, 'Warehouse code is required.', []);
    }

    const duplicateCode = await pool.query(
      'SELECT id FROM warehouses WHERE LOWER(code) = LOWER($1)',
      [warehouseCode]
    );

    if (duplicateCode.rows.length > 0) {
      return sendError(
        res,
        409,
        `Warehouse code already exists: ${warehouseCode}`,
        []
      );
    }

    const result = await pool.query(
      `INSERT INTO warehouses (name, code, address)
       VALUES ($1, $2, $3)
       RETURNING id, name, code, address`,
      [warehouseName, warehouseCode, warehouseAddress]
    );

    return res.status(201).json({
      success: true,
      message: 'Warehouse created successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create warehouse error:', error);

    return sendError(
      res,
      500,
      'Unable to create warehouse right now. Please try again later.',
      []
    );
  }
});

router.get('/locations', async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    let query = `
      SELECT
        l.id,
        l.warehouse_id,
        w.name AS warehouse_name,
        l.name,
        l.type
      FROM locations l
      LEFT JOIN warehouses w ON w.id = l.warehouse_id
      WHERE 1 = 1
    `;

    const params = [];

    if (warehouse_id !== undefined && warehouse_id !== '') {
      query += ' AND l.warehouse_id = $1';
      params.push(Number(warehouse_id));
    }

    query += ' ORDER BY w.name ASC, l.name ASC';

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      message: 'Locations retrieved successfully.',
      data: result.rows,
    });
  } catch (error) {
    console.error('Get locations error:', error);

    return sendError(
      res,
      500,
      'Unable to retrieve locations right now. Please try again later.',
      []
    );
  }
});

router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name
       FROM categories
       ORDER BY name ASC`
    );

    return res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully.',
      data: result.rows,
    });
  } catch (error) {
    console.error('Get categories error:', error);

    return sendError(
      res,
      500,
      'Unable to retrieve categories right now. Please try again later.',
      []
    );
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;
    const categoryName = normalizeText(name);

    if (!categoryName) {
      return sendError(res, 400, 'Category name is required.', []);
    }

    const duplicateCategory = await pool.query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER($1)',
      [categoryName]
    );

    if (duplicateCategory.rows.length > 0) {
      return sendError(
        res,
        409,
        `Category already exists: ${categoryName}`,
        []
      );
    }

    const result = await pool.query(
      `INSERT INTO categories (name)
       VALUES ($1)
       RETURNING id, name`,
      [categoryName]
    );

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create category error:', error);

    return sendError(
      res,
      500,
      'Unable to create category right now. Please try again later.',
      []
    );
  }
});

module.exports = router;
