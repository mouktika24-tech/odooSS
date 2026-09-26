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

const parseNonNegativeInt = (value) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const resolveCategoryId = async (categoryIdValue, categoryNameValue) => {
  const directCategoryId = Number(categoryIdValue);

  if (Number.isInteger(directCategoryId) && directCategoryId > 0) {
    const categoryResult = await pool.query(
      'SELECT id FROM categories WHERE id = $1',
      [directCategoryId]
    );

    if (categoryResult.rows.length === 0) {
      return {
        valid: false,
        reason: 'Category not found. Please choose a valid category.',
      };
    }

    return {
      valid: true,
      categoryId: categoryResult.rows[0].id,
    };
  }

  const categoryName = normalizeText(categoryNameValue);

  if (categoryName) {
    const categoryResult = await pool.query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER($1)',
      [categoryName]
    );

    if (categoryResult.rows.length === 0) {
      return {
        valid: false,
        reason: 'Category not found. Please choose a valid category.',
      };
    }

    return {
      valid: true,
      categoryId: categoryResult.rows[0].id,
    };
  }

  return {
    valid: false,
    reason: 'Category is required.',
  };
};

router.get('/', async (req, res) => {
  try {
    const { category, category_id, search, lowStock } = req.query;

    let query = `
      SELECT
        p.id,
        p.name,
        p.sku,
        p.category_id,
        c.name AS category_name,
        p.uom,
        p.min_stock_alert,
        p.current_stock,
        p.created_at
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE 1 = 1
    `;

    const values = [];
    let index = 1;

    if (category_id !== undefined && category_id !== '') {
      query += ` AND p.category_id = $${index}`;
      values.push(Number(category_id));
      index += 1;
    } else if (category !== undefined && category !== '') {
      query += ` AND LOWER(c.name) = LOWER($${index})`;
      values.push(String(category).trim());
      index += 1;
    }

    if (search !== undefined && search !== '') {
      const searchValue = `%${String(search).trim()}%`;
      query += ` AND (LOWER(p.name) LIKE LOWER($${index}) OR LOWER(p.sku) LIKE LOWER($${index}))`;
      values.push(searchValue);
      index += 1;
    }

    if (lowStock === 'true' || lowStock === '1') {
      query += ` AND p.current_stock <= p.min_stock_alert`;
    }

    query += ' ORDER BY p.name ASC';

    const result = await pool.query(query, values);

    return res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get products error:', error);
    return sendError(
      res,
      500,
      'Unable to retrieve products right now. Please try again later.',
      []
    );
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, sku, category_id, category, uom, min_stock_alert, current_stock } = req.body;

    const productName = normalizeText(name);
    const productSku = normalizeText(sku);
    const productUom = normalizeText(uom);
    const productMinStock = parseNonNegativeInt(min_stock_alert);
    const productCurrentStock = current_stock === undefined ? 0 : parseNonNegativeInt(current_stock);

    if (!productName) {
      return sendError(res, 400, 'Product name is required.', []);
    }

    if (!productSku) {
      return sendError(res, 400, 'Product SKU is required.', []);
    }

    if (!productUom) {
      return sendError(res, 400, 'Unit of measure is required.', []);
    }

    if (productMinStock === null) {
      return sendError(res, 400, 'Minimum stock alert must be a non-negative integer.', []);
    }

    if (productCurrentStock === null) {
      return sendError(res, 400, 'Current stock must be a non-negative integer.', []);
    }

    const categoryLookup = await resolveCategoryId(category_id, category);

    if (!categoryLookup.valid) {
      return sendError(res, 400, categoryLookup.reason, []);
    }

    const duplicateSkuCheck = await pool.query(
      'SELECT id FROM products WHERE LOWER(sku) = LOWER($1)',
      [productSku]
    );

    if (duplicateSkuCheck.rows.length > 0) {
      return sendError(res, 409, `SKU already exists in catalog: ${productSku}`, []);
    }

    const insertResult = await pool.query(
      `INSERT INTO products (name, sku, category_id, uom, min_stock_alert, current_stock)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, sku, category_id, uom, min_stock_alert, current_stock`,
      [productName, productSku, categoryLookup.categoryId, productUom, productMinStock, productCurrentStock]
    );

    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: insertResult.rows[0],
    });
  } catch (error) {
    console.error('Create product error:', error);
    return sendError(
      res,
      500,
      'Unable to create product right now. Please try again later.',
      []
    );
  }
});

router.put('/:id', async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return sendError(res, 400, 'A valid product ID is required.', []);
    }

    const existingProduct = await pool.query(
      'SELECT id, name, sku, category_id, uom, min_stock_alert, current_stock FROM products WHERE id = $1',
      [productId]
    );

    if (existingProduct.rows.length === 0) {
      return sendError(res, 404, 'Product not found.', []);
    }

    if (req.body.current_stock !== undefined) {
      return sendError(
        res,
        400,
        'Current stock is managed by the stock operations engine and cannot be updated from the product master form.',
        []
      );
    }

    const nextName = req.body.name !== undefined ? normalizeText(req.body.name) : existingProduct.rows[0].name;
    const nextSku = req.body.sku !== undefined ? normalizeText(req.body.sku) : existingProduct.rows[0].sku;
    const nextUom = req.body.uom !== undefined ? normalizeText(req.body.uom) : existingProduct.rows[0].uom;
    const nextMinStock = req.body.min_stock_alert !== undefined ? parseNonNegativeInt(req.body.min_stock_alert) : existingProduct.rows[0].min_stock_alert;

    if (!nextName) {
      return sendError(res, 400, 'Product name is required.', []);
    }

    if (!nextSku) {
      return sendError(res, 400, 'Product SKU is required.', []);
    }

    if (!nextUom) {
      return sendError(res, 400, 'Unit of measure is required.', []);
    }

    if (nextMinStock === null) {
      return sendError(res, 400, 'Minimum stock alert must be a non-negative integer.', []);
    }

    let nextCategoryId = existingProduct.rows[0].category_id;
    if (req.body.category_id !== undefined || req.body.category !== undefined) {
      const categoryLookup = await resolveCategoryId(req.body.category_id, req.body.category);

      if (!categoryLookup.valid) {
        return sendError(res, 400, categoryLookup.reason, []);
      }

      nextCategoryId = categoryLookup.categoryId;
    }

    const duplicateSku = await pool.query(
      'SELECT id FROM products WHERE LOWER(sku) = LOWER($1) AND id != $2',
      [nextSku, productId]
    );

    if (duplicateSku.rows.length > 0) {
      return sendError(res, 409, `SKU already exists in catalog: ${nextSku}`, []);
    }

    const updateValues = [
      nextName,
      nextSku,
      nextCategoryId,
      nextUom,
      nextMinStock,
      productId,
    ];

    const updateResult = await pool.query(
      `UPDATE products
       SET name = $1,
           sku = $2,
           category_id = $3,
           uom = $4,
           min_stock_alert = $5
       WHERE id = $6
       RETURNING id, name, sku, category_id, uom, min_stock_alert, current_stock`,
      updateValues
    );

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      data: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Update product error:', error);
    return sendError(
      res,
      500,
      'Unable to update product right now. Please try again later.',
      []
    );
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return sendError(res, 400, 'A valid product ID is required.', []);
    }

    const existingProduct = await pool.query(
      'SELECT id FROM products WHERE id = $1',
      [productId]
    );

    if (existingProduct.rows.length === 0) {
      return sendError(res, 404, 'Product not found.', []);
    }

    await pool.query('DELETE FROM products WHERE id = $1', [productId]);

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully.',
      data: { id: productId },
    });
  } catch (error) {
    console.error('Delete product error:', error);

    return sendError(
      res,
      500,
      'Unable to delete product right now. Please try again later.',
      []
    );
  }
});

module.exports = router;
