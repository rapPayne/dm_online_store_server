const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

// Import passport configuration
require('./config/passport');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Routes
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the Online Store API',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/login',
        register: 'POST /api/register'
      },
      users: 'GET /api/users (admin only)',
      products: 'GET /api/products',
      orders: {
        getAll: 'GET /api/orders (admin only)',
        getUserOrders: 'GET /api/orders/user/:userId',
        placeOrder: 'POST /api/placeOrder'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation available at http://localhost:${PORT}`);
});

module.exports = app;