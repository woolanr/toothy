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

router.get("/register", (req, res) => {
  res.render("admin/register");
});

router.get("/dashboard-data", userController.getAdminDashboardData);

router.get("/users", userController.getAllUsers);
router.post("/users", userController.addUser);
router.get("/users/:id", userController.getUserById);
router.put("/users/:id", userController.updateUser);
router.delete("/users/:id", userController.deleteUser);
router.put("/users/:id/activate", userController.activateUserAccount);
router.put("/users/:id/verify", userController.verifyUserAccount);

router.get("/doctors", userController.getAllDoctors);
router.post("/doctors", userController.createDoctor);
router.get("/doctors/:id", userController.getDoctorByIdForEdit);
router.put("/doctors/:id", userController.updateDoctor);
router.put("/doctors/:id/deactivate", userController.deactivateDoctorAccount);

router.get("/services", serviceController.getAllServices);
router.post("/services", serviceController.createService);
router.get("/services/:id", serviceController.getServiceById);
router.put("/services/:id", serviceController.updateService);
router.put("/services/:id/deactivate", serviceController.deactivateService);
router.put("/services/:id/activate", serviceController.activateService);

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

router.get("/settings", clinicSettingsController.getClinicSettings);
router.put("/settings", clinicSettingsController.updateClinicSettings);

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

router.get(
  "/pasien/dashboard-data",
  protect,
  authorizeRoles(4),
  userController.getPatientDashboardData
);

module.exports = router;
