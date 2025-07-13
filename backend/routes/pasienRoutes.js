// backend/routes/pasienRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const {
  getDashboardData,
  getBookingData,
  getAvailability,
  createAppointment,
  getAppointmentHistory,
  getProfile,
  updateProfile,
  updateProfilePhoto,
  upload,
  getNotifications,
  markNotificationAsRead,
} = require("../controllers/pasienController");

const PASIEN_ROLE_ID = 4;

router.use(protect);
router.use(authorizeRoles(PASIEN_ROLE_ID));

router.get("/dashboard-data", getDashboardData);
router.get("/booking-data", getBookingData);
router.post("/appointments", createAppointment);
router.get("/appointments/history", getAppointmentHistory);
router.get("/availability", getAvailability);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.post(
  "/profile/photo",
  upload.single("profilePhoto"),
  updateProfilePhoto
);
router.get("/notifications", getNotifications);
router.put("/notifications/:id/read", markNotificationAsRead);

module.exports = router;
