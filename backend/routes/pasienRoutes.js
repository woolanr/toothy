// backend/routes/pasienRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// PERUBAHAN: Kita mengimpor setiap fungsi dan upload secara individual
const {
  getDashboardData,
  getBookingData,
  getAvailability,
  createAppointment,
  getAppointmentHistory,
  getProfile,
  updateProfile,
  updateProfilePhoto,
  upload, // <-- Impor middleware upload
} = require("../controllers/pasienController");

const PASIEN_ROLE_ID = 4;

router.use(protect);
router.use(authorizeRoles(PASIEN_ROLE_ID));

// --- Rute API untuk Dasbor Pasien ---
router.get("/dashboard-data", getDashboardData);
router.get("/booking-data", getBookingData);
router.post("/appointments", createAppointment);
router.get("/appointments/history", getAppointmentHistory);
router.get("/availability", getAvailability);

// --- Rute untuk Profil ---
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

// PERUBAHAN: Rute ini sekarang menggunakan 'upload' yang sudah diimpor
router.post(
  "/profile/photo",
  upload.single("profilePhoto"),
  updateProfilePhoto
);

module.exports = router;
