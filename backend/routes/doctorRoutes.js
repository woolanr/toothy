// backend/routes/doctorRoutes.js
const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const User = require("../models/userModel");

// Define the role ID for doctors
const DOCTOR_ROLE_ID = 2;

// Middleware to get complete doctor info if it's missing from token
const getDoctorInfo = async (req, res, next) => {
  if (!req.user || req.user.id_level_user !== DOCTOR_ROLE_ID) {
    return res.status(403).json({ message: "Akses ditolak." });
  }
  if (!req.user.id_doctor || !req.user.id_profile) {
    try {
      const doctorRecord = await User.findDoctorRecordByUserId(
        req.user.id_user
      );
      if (doctorRecord) {
        req.user.id_doctor = doctorRecord.id_doctor;
        req.user.id_profile = doctorRecord.id_profile;
      } else {
        return res
          .status(500)
          .json({ message: "Profil dokter tidak lengkap." });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Kesalahan server saat mengambil info dokter." });
    }
  }
  next();
};

// Apply security middleware to all doctor routes
router.use(protect, authorizeRoles(DOCTOR_ROLE_ID), getDoctorInfo);

// --- API Routes for Doctor Dashboard ---

// Dashboard data
router.get("/dashboard-data", doctorController.getDashboardData);

// Profile management
router.get("/my-profile", doctorController.getDoctorProfile);
router.put("/my-profile", doctorController.updateDoctorProfile);

// Examination Module
router.get(
  "/appointment/:id_appointment",
  doctorController.getAppointmentForExamination
);
router.post(
  "/examination/:id_appointment",
  doctorController.saveExaminationResult
);

// Schedule Management
router.post("/schedule", doctorController.manageDoctorSchedule);

module.exports = router;
