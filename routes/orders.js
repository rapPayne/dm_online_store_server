const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth, requireAdmin, requireOwnership } = require('../middleware/auth');
const { readDatabase, writeDatabase, generateId, getNextOrderNumber } = require('../utils/database');

const router = express.Router();

// Get all orders (admin only)
router.get('/', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = readDatabase();
    res.json(db.orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get user's orders
router.get('/user/:userId', requireAuth, requireOwnership, (req, res) => {
  try {
    const db = readDatabase();
    const userOrders = db.orders.filter(order => order.userId === req.params.userId);
    res.json(userOrders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

// Get order by ID
router.get('/:orderId', requireAuth, (req, res) => {
  try {
    const db = readDatabase();
    const order = db.orders.find(o => o.id === req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user can access this order
    if (req.user.role !== 'admin' && order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only access your own orders' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Place new order
router.post('/placeOrder', [
  requireAuth,
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddress').notEmpty().withMessage('Shipping address is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, shippingAddress } = req.body;
    const db = readDatabase();

    // Validate products and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = db.products.find(p => p.id === item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product not found: ${item.productId}` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal: itemTotal
      });
    }

    // Create order
    const newOrder = {
      id: generateId(),
      orderNumber: getNextOrderNumber(),
      userId: req.user.id,
      items: orderItems,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      shippingAddress,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Update product stock
    for (const item of items) {
      const productIndex = db.products.findIndex(p => p.id === item.productId);
      db.products[productIndex].stock -= item.quantity;
    }

    db.orders.push(newOrder);
    writeDatabase(db);

    res.status(201).json({
      message: 'Order placed successfully',
      order: newOrder
    });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// Update order status (admin only)
router.patch('/:orderId/status', [
  requireAuth,
  requireAdmin,
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = readDatabase();
    const orderIndex = db.orders.findIndex(o => o.id === req.params.orderId);
    
    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    db.orders[orderIndex].status = req.body.status;
    db.orders[orderIndex].updatedAt = new Date().toISOString();
    writeDatabase(db);

    res.json({
      message: 'Order status updated successfully',
      order: db.orders[orderIndex]
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

module.exports = router;