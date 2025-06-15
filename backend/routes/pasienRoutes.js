// backend/routes/pasienRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.get(
  "/dashboard-data",
  protect,
  authorizeRoles([4]),
  userController.getPatientDashboardData
);
console.log("PasienRoutes: Registered GET /dashboard-data");

router.put(
  "/profile",
  protect,
  authorizeRoles([4]),
  userController.updateMyProfile
);
console.log("PasienRoutes: Registered PUT /profile");

module.exports = router;
