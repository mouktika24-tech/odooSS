const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

const authRoutes = require('./routes/auth.routes');
const productsRoutes = require('./routes/products.routes');
const warehousesRoutes = require('./routes/warehouses.routes');
const operationsRoutes = require('./src/routes/operationsRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const FRONTEND_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || FRONTEND_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'StockSense backend is healthy.',
    data: {
      service: 'stocksense-backend',
      timestamp: new Date().toISOString(),
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', authMiddleware, productsRoutes);
app.use('/api/warehouses', authMiddleware);
app.use('/api/locations', authMiddleware);
app.use('/api/categories', authMiddleware);
app.use('/api', warehousesRoutes);
app.use('/api/operations', authMiddleware, operationsRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.',
    errors: [],
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    success: false,
    message: 'Something went wrong on the server. Please try again later.',
    errors: [],
  });
});

const PORT = Number(process.env.PORT) || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`StockSense backend listening on port ${PORT}`);
  });
}

module.exports = app;
