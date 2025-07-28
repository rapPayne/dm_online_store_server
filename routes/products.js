const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { readDatabase, writeDatabase, generateId } = require('../utils/database');

const router = express.Router();

// Get all products (public access)
router.get('/', (req, res) => {
  try {
    const db = readDatabase();
    res.json(db.products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by ID
router.get('/:productId', (req, res) => {
  try {
    const db = readDatabase();
    const product = db.products.find(p => p.id === req.params.productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product (admin only)
router.post('/', [
  requireAuth,
  requireAdmin,
  body('name').notEmpty().withMessage('Product name is required'),
  body('description').notEmpty().withMessage('Product description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').notEmpty().withMessage('Category is required'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative number')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, price, category, stock, imageUrl } = req.body;
    const db = readDatabase();

    const newProduct = {
      id: generateId(),
      name,
      description,
      price: parseFloat(price),
      category,
      stock: parseInt(stock),
      imageUrl: imageUrl || `https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=400`,
      createdAt: new Date().toISOString()
    };

    db.products.push(newProduct);
    writeDatabase(db);

    res.status(201).json({
      message: 'Product created successfully',
      product: newProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product (admin only)
router.put('/:productId', [
  requireAuth,
  requireAdmin,
  body('name').notEmpty().withMessage('Product name is required'),
  body('description').notEmpty().withMessage('Product description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').notEmpty().withMessage('Category is required'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative number')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = readDatabase();
    const productIndex = db.products.findIndex(p => p.id === req.params.productId);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { name, description, price, category, stock, imageUrl } = req.body;
    
    db.products[productIndex] = {
      ...db.products[productIndex],
      name,
      description,
      price: parseFloat(price),
      category,
      stock: parseInt(stock),
      imageUrl: imageUrl || db.products[productIndex].imageUrl,
      updatedAt: new Date().toISOString()
    };

    writeDatabase(db);

    res.json({
      message: 'Product updated successfully',
      product: db.products[productIndex]
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (admin only)
router.delete('/:productId', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = readDatabase();
    const productIndex = db.products.findIndex(p => p.id === req.params.productId);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    db.products.splice(productIndex, 1);
    writeDatabase(db);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;