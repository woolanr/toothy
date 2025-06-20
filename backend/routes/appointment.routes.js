// backend/routes/appointment.routes.js

const express = require("express");
const router = express.Router();
const {
  updateAppointmentStatus,
} = require("../controllers/appointment.controller.js");
// Add any middleware for authentication if needed, e.g., const { protect } = require('../middleware/authMiddleware');

// Define the route
// This means a PUT request to a URL like "http://localhost:5000/api/appointments/123/status" will work
router.put("/:id/status", updateAppointmentStatus); // Add 'protect' middleware here if only logged-in users can do this

module.exports = router;
