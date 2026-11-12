// src/routes/unitRoutes.js

const { Router } = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const eventController = require('../controllers/eventController');
const productController = require('../controllers/productController');

const router = Router();

const createEventSchema = z.object({
  eventType: z.enum(['custody_transfer', 'location_update', 'status_change']),
  fromLocation: z.string().optional(),
  toLocation: z.string().optional(),
  statusAfter: z.enum(['registered', 'in_transit', 'delivered', 'sold', 'flagged']).optional(),
  notes: z.string().optional(),
});

// Get a specific unit
router.get('/:unitId', authenticate, productController.getUnit);

// Supply-chain events — supplier or retailer
router.post(
  '/:unitId/events',
  authenticate,
  authorize('supplier', 'retailer'),
  validate(createEventSchema),
  eventController.createEvent
);

// Get events for a unit
router.get('/:unitId/events', authenticate, eventController.getEvents);

// Mark sold — retailer only
router.patch(
  '/:unitId/sold',
  authenticate,
  authorize('retailer'),
  eventController.markSold
);

module.exports = router;

