// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); 
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');
const serviceController = require('../controllers/serviceController');
const doctorScheduleController = require('../controllers/doctorScheduleController'); 

// --- Route API untuk Dashboard Admin ---
const isAdmin = (req, res, next) => {
    if (req.user && req.user.id_level_user === 1) {
        next();
    } else {
        return res.status(403).json({ message: 'Akses ditolak. Anda bukan Admin.' });
    }
};

// --- Route APIuntuk Halaman Admin ---
router.get('/admin/register', protect, authorizeRoles([1]), (req, res) => {
    res.render('admin/register');
});
// --- Route API untuk Dashboard Admin ---
router.get('/admin/dashboard-data', protect, authorizeRoles([1]), userController.getAdminDashboardData);

// --- Rute Manajemen Pengguna ---
router.get('/admin/users', protect, authorizeRoles([1]), userController.getAllUsers);
router.post('/admin/users', protect, authorizeRoles([1]), userController.addUser);
router.get('/admin/users/:id', protect, authorizeRoles([1]), userController.getUserById);
router.put('/admin/users/:id', protect, authorizeRoles([1]), userController.updateUser);
router.delete('/admin/users/:id', protect, authorizeRoles([1]), userController.deleteUser);
router.put('/admin/users/:id/activate', protect, authorizeRoles([1]), userController.activateUserAccount);
router.put('/admin/users/:id/verify', protect, authorizeRoles([1]), userController.verifyUserAccount);

// --- Rute Manajemen Dokter ---
router.get('/admin/doctors', protect, authorizeRoles([1]), userController.getAllDoctors);
router.post('/admin/doctors', protect, authorizeRoles([1]), userController.createDoctor);
router.get('/admin/doctors/:id', protect, authorizeRoles([1]), userController.getDoctorByIdForEdit);
router.put('/admin/doctors/:id', protect, authorizeRoles([1]), userController.updateDoctor);
router.put('/admin/doctors/:id/deactivate', protect, authorizeRoles([1]), userController.deactivateDoctorAccount);

// --- Rute Manajemen Layanan ---
router.get('/admin/services', protect, authorizeRoles([1]), serviceController.getAllServices);
router.post('/admin/services', protect, authorizeRoles([1]), serviceController.createService);
router.get('/admin/services/:id', protect, authorizeRoles([1]), serviceController.getServiceById);
router.put('/admin/services/:id', protect, authorizeRoles([1]), serviceController.updateService);
router.put('/admin/services/:id/deactivate', protect, authorizeRoles([1]), serviceController.deactivateService);
router.put('/admin/services/:id/activate', protect, authorizeRoles([1]), serviceController.activateService);

// --- Rute Manajemen Jadwal Dokter --- //
router.get('/admin/doctors/:doctorId/schedules', doctorScheduleController.getSchedulesByDoctorId);
router.get('/admin/schedules/:scheduleId', doctorScheduleController.getScheduleById);
router.post('/admin/schedules', doctorScheduleController.createSchedule);
router.put('/admin/schedules/:scheduleId', doctorScheduleController.updateSchedule);
router.delete('/admin/schedules/:scheduleId', doctorScheduleController.deleteSchedule);



// Mendapatkan daftar dokter dan layanan untuk form booking
router.get('/booking/form-data', protect, authorizeRoles([4]), userController.getBookingFormData);
console.log('AdminRoutes: Registered GET /booking/form-data');

// Mendapatkan jadwal kosong dokter berdasarkan ID dokter dan tanggal
router.get('/booking/available-slots', protect, authorizeRoles([4]), userController.getAvailableDoctorSlots); // Hanya pasien yang bisa akses

// Membuat janji temu baru
router.post('/booking/create', protect, authorizeRoles([4]), userController.bookAppointment); // Hanya pasien yang bisa akses

// POST /admin/register (Route API untuk proses registrasi admin)
router.post('/admin/register', protect, authorizeRoles([1]), authController.register);
console.log('AdminRoutes: Registered POST /admin/register');

// --- API DASHBOARD PASIEN ---
// URL: http://localhost:3000/pasien/dashboard-data
router.get('/pasien/dashboard-data', protect, authorizeRoles([4]), userController.getPatientDashboardData);
console.log('AdminRoutes: Registered GET /pasien/dashboard-data'); // Log untuk route pasien

module.exports = router;