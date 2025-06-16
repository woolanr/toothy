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
router.get("/doctors", perawatController.getAllDoctors);
router.get("/services", perawatController.getAllServices);
router.get("/queue", perawatController.getTodaysQueue);
router.put("/queue/:id", perawatController.updateQueueStatus);
router.get("/billing", perawatController.getBillingList);
router.post("/payment", perawatController.processPayment);
router.put("/appointment/:id", perawatController.updateAppointment);
router.post("/appointment", perawatController.createAppointment);
router.get("/my-profile", perawatController.getStaffProfile);
router.put("/my-profile", perawatController.updateStaffProfile);

module.exports = router;
