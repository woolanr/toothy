// backend/routes/doctorRoutes.js
const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const User = require("../models/userModel");

const DOCTOR_ROLE_ID = 2;

const getDoctorInfo = async (req, res, next) => {
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

  if (!req.user.id_doctor || !req.user.id_profile) {
    console.log(
      "getDoctorInfo: Missing id_doctor or id_profile in req.user, fetching from DB for id_user:",
      req.user.id_user
    );
    try {
      const userFullDetails = await User.findById(req.user.id_user);

      if (!userFullDetails) {
        console.error(
          "getDoctorInfo: User not found in DB after token verification for id_user:",
          req.user.id_user
        );
        return res
          .status(404)
          .json({ message: "Informasi pengguna tidak ditemukan di database." });
      }

      req.user.id_profile = userFullDetails.id_profile;
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
  next();
};

router.use(protect);

router.use(authorizeRoles(DOCTOR_ROLE_ID));

router.use(getDoctorInfo);

router.get("/dashboard-data", doctorController.getDashboardData);

router.get("/my-profile", doctorController.getDoctorProfile);
router.put("/my-profile", doctorController.updateDoctorProfile);

router.get(
  "/appointment/:id_appointment",
  doctorController.getAppointmentForExamination
);
router.post(
  "/examination/:id_appointment",
  doctorController.saveExaminationResult
);

router.post("/schedule", doctorController.manageDoctorSchedule);

module.exports = router;
