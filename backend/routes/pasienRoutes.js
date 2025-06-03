// backend/routes/pasienRoutes.js
const express = require('express');
const router = express.Router();
// Pastikan controller yang benar diimpor:
const userController = require('../controllers/userController'); // atau pasienController jika kamu pisah
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Rute untuk pasien mengambil data dashboard-nya (ini mungkin sudah ada)
router.get('/dashboard-data', protect, authorizeRoles([4]), userController.getPatientDashboardData);
console.log('PasienRoutes: Registered GET /dashboard-data');


// START: RUTE UNTUK UPDATE PROFIL PASIEN (TAMBAHKAN ATAU PASTIKAN INI ADA)
router.put('/profile', protect, authorizeRoles([4]), userController.updateMyProfile);
console.log('PasienRoutes: Registered PUT /profile');
// END: RUTE UNTUK UPDATE PROFIL PASIEN

module.exports = router;