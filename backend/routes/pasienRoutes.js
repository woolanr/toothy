// backend/routes/pasienRoutes.js
const express = require("express");
const router = express.Router();
const pasienController = require("../controllers/pasienController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const PASIEN_ROLE_ID = 4;

router.use(protect);
router.use(authorizeRoles(PASIEN_ROLE_ID));

// Rute untuk mendapatkan data dasbor awal
router.get("/dashboard-data", pasienController.getDashboardData);

// === PASTIKAN RUTE INI ADA ===
// Rute untuk mendapatkan data halaman booking (layanan & dokter)
router.get("/booking-data", pasienController.getBookingData); // <-- This is the missing link!

// Rute untuk membuat janji temu baru
router.post("/appointments", pasienController.createAppointment);

router.get("/appointments/history", pasienController.getAppointmentHistory);
router.get("/availability", pasienController.getAvailability);

module.exports = router;
