// backend/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const userController = require("../controllers/userController");
const serviceController = require("../controllers/serviceController");
const doctorScheduleController = require("../controllers/doctorScheduleController");
const clinicSettingsController = require("../controllers/clinicSettingsController");

router.use(protect, authorizeRoles(1));

// --- Route API untuk Halaman Admin (Render EJS, jika ada) ---
router.get("/register", (req, res) => {
  res.render("admin/register");
});

// --- Route API untuk Dashboard Admin ---
router.get("/dashboard-data", userController.getAdminDashboardData);

// --- Rute Manajemen Pengguna ---
router.get("/users", userController.getAllUsers);
router.post("/users", userController.addUser);
router.get("/users/:id", userController.getUserById);
router.put("/users/:id", userController.updateUser);
router.delete("/users/:id", userController.deleteUser);
router.put("/users/:id/activate", userController.activateUserAccount);
router.put("/users/:id/verify", userController.verifyUserAccount);

// --- Rute Manajemen Dokter ---
router.get("/doctors", userController.getAllDoctors);
router.post("/doctors", userController.createDoctor);
router.get("/doctors/:id", userController.getDoctorByIdForEdit);
router.put("/doctors/:id", userController.updateDoctor);
router.put("/doctors/:id/deactivate", userController.deactivateDoctorAccount);

// --- Rute Manajemen Layanan ---
router.get("/services", serviceController.getAllServices);
router.post("/services", serviceController.createService);
router.get("/services/:id", serviceController.getServiceById);
router.put("/services/:id", serviceController.updateService);
router.put("/services/:id/deactivate", serviceController.deactivateService);
router.put("/services/:id/activate", serviceController.activateService);

// --- Rute Manajemen Jadwal Dokter ---
router.get(
  "/doctors/:doctorId/schedules",
  doctorScheduleController.getSchedulesByDoctorId
);
router.get("/schedules/:scheduleId", doctorScheduleController.getScheduleById);
router.post("/schedules", doctorScheduleController.createSchedule);
router.put("/schedules/:scheduleId", doctorScheduleController.updateSchedule);
router.delete(
  "/schedules/:scheduleId",
  doctorScheduleController.deleteSchedule
);

// --- Rute Pengaturan Klinik ---
router.get("/settings", clinicSettingsController.getClinicSettings);
router.put("/settings", clinicSettingsController.updateClinicSettings);

// --- Route-route khusus PASIEN atau PUBLIK ---
router.get(
  "/booking/form-data",
  protect,
  authorizeRoles(4),
  userController.getBookingFormData
);
router.get(
  "/booking/available-slots",
  protect,
  authorizeRoles(4),
  userController.getAvailableDoctorSlots
);
router.post(
  "/booking/create",
  protect,
  authorizeRoles(4),
  userController.bookAppointment
);

router.post("/register", authController.register);

// API DASHBOARD PASIEN
router.get(
  "/pasien/dashboard-data",
  protect,
  authorizeRoles(4),
  userController.getPatientDashboardData
);

module.exports = router;
