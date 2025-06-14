// backend/routes/doctorRoutes.js
const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const User = require("../models/userModel"); // Import User model

// Define role for doctor (assuming id_level_user = 2 for doctors)
const DOCTOR_ROLE_ID = 2;

// Middleware to ensure doctor-specific IDs are available
const getDoctorInfo = async (req, res, next) => {
  // req.user should be populated by 'protect' middleware
  if (
    !req.user ||
    !req.user.id_user ||
    req.user.id_level_user !== DOCTOR_ROLE_ID
  ) {
    console.warn(
      "getDoctorInfo: User is not a doctor or req.user is incomplete.",
      req.user
    );
    return res.status(403).json({
      message:
        "Akses ditolak. Peran tidak valid atau informasi pengguna tidak lengkap.",
    });
  }

  // If id_doctor or id_profile are missing from req.user (which is the current problem), fetch them from DB
  if (!req.user.id_doctor || !req.user.id_profile) {
    console.log(
      "getDoctorInfo: Missing id_doctor or id_profile in req.user, fetching from DB for id_user:",
      req.user.id_user
    );
    try {
      const userFullDetails = await User.findById(req.user.id_user); // User.findById joins USERS and PROFILE

      if (!userFullDetails) {
        console.error(
          "getDoctorInfo: User not found in DB after token verification for id_user:",
          req.user.id_user
        );
        return res
          .status(404)
          .json({ message: "Informasi pengguna tidak ditemukan di database." });
      }

      // Update req.user with the complete details from DB
      req.user.id_profile = userFullDetails.id_profile;
      // For id_doctor, we need a specific lookup from the DOCTORS table
      const doctorRecord = await User.findDoctorRecordByUserId(
        req.user.id_user
      );
      if (doctorRecord) {
        req.user.id_doctor = doctorRecord.id_doctor;
      } else {
        console.error(
          "getDoctorInfo: Doctor role user has no entry in DOCTORS table for id_user:",
          req.user.id_user
        );
        return res.status(500).json({
          message: "Profil dokter tidak lengkap. Harap hubungi admin.",
        });
      }
      console.log(
        "getDoctorInfo: req.user updated with id_profile and id_doctor:",
        req.user
      );
    } catch (error) {
      console.error(
        "getDoctorInfo: Error fetching full doctor/profile details:",
        error
      );
      return res.status(500).json({
        message: "Terjadi kesalahan server saat mengambil informasi dokter.",
      });
    }
  }
  next(); // Continue to the next middleware or route handler
};

// Apply protect middleware to all doctor routes
router.use(protect);

// Apply authorizeRoles middleware specifically for doctors
router.use(authorizeRoles(DOCTOR_ROLE_ID)); // Only doctors (level 2) can access these routes

// NEW: Apply getDoctorInfo middleware after authentication and authorization
router.use(getDoctorInfo);

// Doctor Dashboard Data (Changed endpoint to avoid clash with EJS view)
router.get("/dashboard-data", doctorController.getDashboardData);

// Doctor Profile Management
router.get("/my-profile", doctorController.getDoctorProfile);
router.put("/my-profile", doctorController.updateDoctorProfile);

// Appointment Details and Examination Module
router.get(
  "/appointment/:id_appointment",
  doctorController.getAppointmentForExamination
);
router.post(
  "/examination/:id_appointment",
  doctorController.saveExaminationResult
);

// Doctor Schedule Management (Add/Update)
router.post("/schedule", doctorController.manageDoctorSchedule); // Use POST for both add and update (id_schedule in body)

module.exports = router;
