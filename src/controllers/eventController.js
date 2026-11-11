// src/controllers/eventController.js
// Handles supply-chain events and sold-marking.

const eventService = require('../services/eventService');

async function createEvent(req, res, next) {
  try {
    const event = await eventService.createEvent({
      unitId: req.params.unitId,
      eventType: req.body.eventType,
      fromLocation: req.body.fromLocation,
      toLocation: req.body.toLocation,
      statusAfter: req.body.statusAfter,
      notes: req.body.notes,
      actorId: req.user.id,
      actorRole: req.user.role,
    });
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
}

async function markSold(req, res, next) {
  try {
    const event = await eventService.markUnitSold(req.params.unitId, req.user.id);
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
}

async function getEvents(req, res, next) {
  try {
    const events = await eventService.getEventsByUnit(req.params.unitId);
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
}

module.exports = { createEvent, markSold, getEvents };

