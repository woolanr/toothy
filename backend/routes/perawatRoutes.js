// backend/routes/perawatRoutes.js
const express = require("express");
const router = express.Router();
const perawatController = require("../controllers/perawatController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const PERAWAT_ROLE_ID = 3;

router.use(protect);
router.use(authorizeRoles(PERAWAT_ROLE_ID));

router.get("/summary", perawatController.getSummary);
router.get("/appointments", perawatController.getAllAppointments);
router.get("/services", perawatController.getAllServices);
router.get("/doctors", perawatController.getAllDoctors);
router.put("/appointment/:id", perawatController.updateAppointment);
router.post("/appointment", perawatController.createAppointment);

module.exports = router;
