const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const contractRoutes = require('./contract.routes');
const serviceProviderRoutes = require('./serviceProvider.routes');
const adminRoutes = require('./admin.routes');
const procurementRoutes = require('./procurement.routes');
const legalRoutes = require('./legal.routes');
const coordinatorRoutes = require('./coordinator.routes');
const publicRoutes = require('./public.routes');

// API Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/contracts', contractRoutes);
router.use('/service-providers', serviceProviderRoutes);
router.use('/admin', adminRoutes);
router.use('/procurement', procurementRoutes);
router.use('/legal', legalRoutes);
router.use('/coordinator', coordinatorRoutes);
router.use('/public', publicRoutes);

module.exports = router;
