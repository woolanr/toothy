// backend/controllers/userController.js
const User = require('../models/userModel'); // Ini adalah model yang sudah di-promisify penuh
const bcrypt = require('bcrypt'); // Diperlukan untuk addUser jika ada password baru

const userController = {
    // Fungsi untuk mendapatkan data ringkasan dashboard Admin
    getAdminDashboardData: async (req, res) => {
        console.log('userController: getAdminDashboardData called.');
        try {
            const loggedInUser = req.user; // Data user dari JWT di protect middleware

            // Ambil data profil admin yang login menggunakan User.findById
            const adminProfile = await User.findById(loggedInUser.id_user); 
            // Pastikan adminProfile bukan null sebelum mengakses propertinya
            if (!adminProfile) {
                console.error('userController: Admin profile not found for ID:', loggedInUser.id_user);
                return res.status(404).json({ message: 'Data profil admin tidak ditemukan.' });
            }

            // Hitung usia dari tanggal_lahir
            let usia = null;
            if (adminProfile.tanggal_lahir) {
                const birthDate = new Date(adminProfile.tanggal_lahir);
                const today = new Date();
                usia = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    usia--;
                }
            }

            // --- Bagian untuk mengambil data ringkasan dinamis dari database ---
            // Menggunakan User model yang sudah di-promisify
            const allUsers = await User.findAll(); // Mendapatkan semua user dari DB
            const totalUsers = allUsers.length;

            const totalDoctors = allUsers.filter(user => user.id_level_user === 2).length;
            const totalPatients = allUsers.filter(user => user.id_level_user === 4).length;
            const pendingVerifications = allUsers.filter(user => user.id_status_valid === 2).length;
            
            // Anda bisa tambahkan statistik janji temu hari ini, dll.
            // const totalAppointmentsToday = await User.countAppointmentsToday(); // Contoh, butuh fungsi di model

            res.status(200).json({
                message: 'Selamat datang di Dashboard Admin Happy Toothy!',
                user: { // Kirim detail user yang login
                    id_user: loggedInUser.id_user,
                    username: loggedInUser.username,
                    id_level_user: loggedInUser.id_level_user,
                    nama_lengkap: adminProfile.nama_lengkap || loggedInUser.username, 
                    jenis_kelamin: adminProfile.jenis_kelamin || '-',
                    usia: usia || '-'
                },
                summary: {
                    totalUsers: totalUsers,
                    totalDoctors: totalDoctors,
                    totalPatients: totalPatients,
                    pendingVerifications: pendingVerifications
                }
            });
            console.log('userController: getAdminDashboardData - Response sent.');

        } catch (error) {
            console.error('userController: Error in getAdminDashboardData (caught by general catch):', error);
            console.error('Error Stack:', error.stack); 
            res.status(500).json({ message: 'Terjadi kesalahan server saat memuat data dashboard admin.' });
        }
    },

    // Fungsi untuk mendapatkan daftar semua pengguna
    getAllUsers: async (req, res) => {
        console.log('userController: getAllUsers called. Fetching all users from model.');
        try {
            const users = await User.findAll(); 
            console.log('userController: getAllUsers - Users received from model:', users.length);

            res.status(200).json({ users: users });
            console.log('userController: getAllUsers - Response sent.');
        } catch (error) {
            console.error('userController: getAllUsers - Error (caught by general catch):', error);
            console.error('Error Stack:', error.stack);
            res.status(500).json({ message: 'Terjadi kesalahan server saat mengambil daftar pengguna.' });
        }
    },

    createDoctor: async (req, res) => {
        console.log('userController: createDoctor called.');
        const {
            nama_lengkap,
            username,
            email,
            password,
            no_telepon, // Opsional
            spesialisasi,
            lisensi_no,
            pengalaman_tahun
        } = req.body;

        // 1. Validasi Input Dasar (lakukan validasi yang lebih detail jika perlu)
        if (!nama_lengkap || !username || !email || !password || !spesialisasi || !lisensi_no || pengalaman_tahun === undefined) {
            return res.status(400).json({ success: false, message: 'Semua field wajib diisi: Nama Lengkap, Username, Email, Password, Spesialisasi, No. Lisensi, dan Pengalaman.' });
        }

        try {
            // 2. Cek apakah username atau email sudah ada (opsional tapi direkomendasikan)
            const existingUserByUsername = await User.findByUsername(username);
            if (existingUserByUsername && existingUserByUsername.length > 0) {
                return res.status(409).json({ success: false, message: 'Username sudah terdaftar. Silakan gunakan username lain.' });
            }
            const existingUserByEmail = await User.findByEmail(email);
            if (existingUserByEmail && existingUserByEmail.length > 0) {
                return res.status(409).json({ success: false, message: 'Email sudah terdaftar. Silakan gunakan email lain.' });
            }

            // 3. Hash password sebelum disimpan
            const hashedPassword = await bcrypt.hash(password, 10);

            // 4. Siapkan data untuk dikirim ke model
            const doctorData = {
                nama_lengkap,
                username,
                email,
                password: hashedPassword,
                no_telepon: no_telepon || null, // Jika kosong, kirim null
                id_level_user: 2, // Otomatis set level ke 2 (Dokter)
                id_status_valid: 1, // Otomatis set status ke 1 (Valid)
                
                // Detail spesifik dokter
                spesialisasi,
                lisensi_no,
                pengalaman_tahun: parseInt(pengalaman_tahun)
            };
            // 5. Panggil fungsi model untuk membuat user, profile, dan entry dokter
            // Kita akan buat fungsi User.createFullDoctorWithDetails di userModel.js
            const newDoctor = await User.createFullDoctorWithDetails(doctorData);

            res.status(201).json({
                success: true,
                message: 'Dokter baru berhasil ditambahkan!',
                data: { doctorId: newDoctor.newDoctorId, userId: newDoctor.newUserId } // Kirim ID kembali jika perlu
            });
            console.log('userController: createDoctor - Doctor created successfully with UserID:', newDoctor.newUserId, 'and DoctorID:', newDoctor.newDoctorId);

        } catch (error) {
            console.error('userController: Error in createDoctor:', error);
            // Penanganan error spesifik (misalnya, jika model melempar error dengan kode tertentu)
            if (error.code === 'ER_DUP_ENTRY') { // Contoh jika ada unique constraint di DB
                 return res.status(409).json({ success: false, message: 'Data duplikat terdeteksi (misalnya, lisensi no sudah ada jika unique).' });
            }
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat menambahkan dokter baru.' });
        }
    },

    // Fungsi untuk menambahkan pengguna baru secara manual oleh admin
    addUser: async (req, res) => {
        console.log('userController: addUser called.');
        const { nama_lengkap, email, username, password, id_level_user } = req.body;

        if (!nama_lengkap || !email || !username || !password || !id_level_user) {
            return res.status(400).json({ message: 'Semua kolom harus diisi.' });
        }

        try {
            const existingUserByUsername = await User.findByUsername(username);
            if (existingUserByUsername.length > 0) {
                return res.status(409).json({ message: 'Username sudah terdaftar.' });
            }
            const existingUserByEmail = await User.findByEmail(email);
            if (existingUserByEmail.length > 0) {
                return res.status(409).json({ message: 'Email sudah terdaftar.' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            
            const id_status_valid = 1; // Admin membuat user biasanya langsung valid

            // Panggil createFullUser dari User model
            const userCreationResult = await User.createFullUser({
                username,
                email,
                password: hashedPassword,
                nama_lengkap,
                id_level_user: parseInt(id_level_user), 
                id_status_valid,
                verification_token: null, // Admin tidak perlu verifikasi
                verification_expires: null
            });

            res.status(201).json({ 
                message: 'Pengguna baru berhasil ditambahkan.',
                userId: userCreationResult.newUserId
            });
            console.log('userController: addUser - User added successfully.');

        } catch (error) {
            console.error('userController: Error adding user by admin:', error);
            console.error('Error Stack:', error.stack);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Username atau email sudah terdaftar.' });
            }
            res.status(500).json({ message: 'Gagal menambahkan pengguna baru.' });
        }
    },

    // Fungsi untuk mendapatkan detail pengguna berdasarkan ID (untuk edit)
    getUserById: async (req, res) => {
        console.log('userController: getUserById called.');
        try {
            const { id } = req.params; 
            const user = await User.findById(id); // Memanggil User.findById yang sudah diperbaiki

            if (!user) { // Cek langsung objek user, bukan users.length
                return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
            }
            res.status(200).json({ users: user }); // Mengirim objek user, bukan array users[0]
            console.log('userController: getUserById - User data sent.');
        } catch (error) {
            console.error('userController: Error getting user by ID:', error);
            console.error('Error Stack:', error.stack);
            res.status(500).json({ message: 'Gagal memuat data pengguna untuk diedit.' });
        }
    },

    // Fungsi untuk mengupdate data pengguna (oleh admin)
    updateUser: async (req, res) => {
        const userId = req.params.id; // ID dari user yang akan diupdate (dari tabel USERS)
        console.log(`userController: updateUser called for userId: ${userId}`);
        const { 
            userData,         // Berisi: username, email, password (opsional), id_level_user, id_status_valid
            profileData,      // Berisi: nama_lengkap, email, no_telepon
            doctorData,       // Berisi: spesialisasi, lisensi_no, pengalaman_tahun (bisa null jika bukan dokter)
            current_id_level_user // Level user sebelum diedit
        } = req.body;

        console.log('Received userData for update:', userData);
        console.log('Received profileData for update:', profileData);
        console.log('Received doctorData for update:', doctorData);
        console.log('Received current_id_level_user:', current_id_level_user);

        // 1. Validasi Input Dasar
        if (!userData || !profileData || !userData.username || !userData.email || !profileData.nama_lengkap) {
            return res.status(400).json({ success: false, message: 'Data pengguna tidak lengkap (username, email, nama lengkap wajib diisi).' });
        }
        if (userData.id_level_user === 2 && (!doctorData || !doctorData.spesialisasi || !doctorData.lisensi_no || doctorData.pengalaman_tahun === undefined || doctorData.pengalaman_tahun === null)) {
            return res.status(400).json({ success: false, message: 'Jika level adalah Dokter, data spesialisasi, lisensi, dan pengalaman wajib diisi.' });
        }

        try {
            const existingUser = await User.findById(userId); // User.findById sudah di-JOIN dengan PROFILE dan DOCTORS
            if (!existingUser) {
                return res.status(404).json({ success: false, message: 'Pengguna yang akan diupdate tidak ditemukan.' });
            }
            const actualProfileId = existingUser.id_profile; // Gunakan id_profile dari DB

            // 3. Cek duplikasi username jika diubah
            if (userData.username && userData.username !== existingUser.username) {
                const otherUserWithUsername = await User.findByUsername(userData.username);
                // Pastikan otherUserWithUsername[0] ada sebelum akses id_user
                if (otherUserWithUsername && otherUserWithUsername.length > 0 && otherUserWithUsername[0].id_user !== parseInt(userId)) {
                    return res.status(409).json({ success: false, message: 'Username sudah digunakan oleh pengguna lain.' });
                }
            }

            // 4. Cek duplikasi email jika diubah
            if (userData.email && userData.email !== existingUser.email) {
                const otherUserWithEmail = await User.findByEmail(userData.email);
                // Pastikan otherUserWithEmail[0] ada sebelum akses id_user
                if (otherUserWithEmail && otherUserWithEmail.length > 0 && otherUserWithEmail[0].id_user !== parseInt(userId)) {
                    return res.status(409).json({ success: false, message: 'Email sudah digunakan oleh pengguna lain.' });
                }
            }
            
            // 5. Siapkan data final untuk update, hash password jika ada
            const finalUserData = { ...userData }; // Salin userData
            if (userData.password && userData.password.trim() !== '') {
                finalUserData.password = await bcrypt.hash(userData.password, 10);
            } else {
                delete finalUserData.password; // Jangan update password jika kosong
            }

            if (Object.keys(finalUserData).length > 0) {
                await User.updateUser(userId, finalUserData);
                console.log(`userController: Data di tabel USERS untuk id_user ${userId} telah diupdate.`);
            }

            // Update tabel PROFILE (menggunakan actualProfileId dari DB)
            if (actualProfileId && profileData && Object.keys(profileData).length > 0) {
                await User.updateProfile(actualProfileId, profileData);
                console.log(`userController: Data di tabel PROFILE untuk id_profile ${actualProfileId} telah diupdate.`);
            }

            // Logika untuk menangani data dokter berdasarkan perubahan level
            const newLevelUser = finalUserData.id_level_user; // Level baru dari form
            const oldLevelUser = parseInt(current_id_level_user);    // Level lama dari hidden input

            if (newLevelUser === 2 && doctorData) {
                const existingDoctorEntry = await User.findDoctorRecordByUserId(userId);
                if (oldLevelUser !== 2 && !existingDoctorEntry) { // Sebelumnya BUKAN dokter DAN belum ada record dokter
                    console.log(`User ${userId} dipromosikan menjadi Dokter. Membuat entri dokter baru.`);
                    await User.createDoctorEntryForUser(userId, doctorData);
                } else if (existingDoctorEntry) { // Sudah dokter, atau baru jadi dokter tapi entri sudah ada (jarang)
                    console.log(`User ${userId} (dokter ID: ${existingDoctorEntry.id_doctor}) diupdate detail dokternya.`);
                    await User.updateDoctorDetails(existingDoctorEntry.id_doctor, doctorData);
                } else if (oldLevelUser === 2 && !existingDoctorEntry) {
                    console.warn(`User ${userId} sebelumnya Dokter tapi tidak ada entri di tabel DOCTORS. Mencoba membuat entri baru.`);
                    await User.createDoctorEntryForUser(userId, doctorData);
                }
            } else if (oldLevelUser === 2 && newLevelUser !== 2) {
                // User ini sebelumnya dokter, tapi sekarang levelnya diubah BUKAN menjadi dokter
                console.log(`User ${userId} (sebelumnya Dokter) diubah levelnya menjadi ${newLevelUser}.`);
                await User.deleteDoctorEntryByUserId(userId);
            }

            res.status(200).json({ success: true, message: 'Pengguna berhasil diperbarui.' });
            console.log('userController: updateUser - User data updated successfully (termasuk potensi perubahan role/detail dokter).');

        } catch (error) {
            console.error('userController: Error in updateUser:', error);
            res.status(500).json({ success: false, message: error.message || 'Gagal memperbarui pengguna.' });
        }
    },
    
    updateDoctor: async (req, res) => {
        const doctorId = req.params.id; // Ini adalah id_doctor dari tabel DOCTORS
        console.log(`userController: updateDoctor called for doctorId: ${doctorId}`);
        
        const {
            nama_lengkap, // dari profile
            username,     // dari users
            email,        // dari users (& profile)
            password,     // dari users (opsional, hanya jika diubah)
            no_telepon,   // dari profile
            spesialisasi, // dari doctors
            lisensi_no,   // dari doctors
            pengalaman_tahun // dari doctors
        } = req.body;

        // 1. Validasi Input Dasar (sesuaikan dengan field yang boleh diubah)
        if (!nama_lengkap || !username || !email || !spesialisasi || !lisensi_no || pengalaman_tahun === undefined) {
            return res.status(400).json({ success: false, message: 'Field Nama Lengkap, Username, Email, Spesialisasi, No. Lisensi, dan Pengalaman wajib diisi.' });
        }

        try {
            // 2. Dapatkan data dokter yang ada, terutama id_user dan id_profile terkait
            const existingDoctorData = await User.findDoctorById(doctorId); // Method ini sudah kamu punya
            if (!existingDoctorData) {
                return res.status(404).json({ success: false, message: 'Dokter yang akan diupdate tidak ditemukan.' });
            }
            const userId = existingDoctorData.id_user; // id_user dari dokter yang akan diupdate
            const profileId = existingDoctorData.id_profile;

            // 3. Cek duplikasi username/email jika diubah dan bukan milik user saat ini
            if (username && username !== existingDoctorData.username) {
                const otherUserWithUsername = await User.findByUsername(username);
                if (otherUserWithUsername && otherUserWithUsername.length > 0 && otherUserWithUsername[0].id_user !== userId) {
                    return res.status(409).json({ success: false, message: 'Username sudah digunakan oleh pengguna lain.' });
                }
            }
            if (email && email !== existingDoctorData.email) {
                const otherUserWithEmail = await User.findByEmail(email);
                if (otherUserWithEmail && otherUserWithEmail.length > 0 && otherUserWithEmail[0].id_user !== userId) {
                    return res.status(409).json({ success: false, message: 'Email sudah digunakan oleh pengguna lain.' });
                }
            }
            
            // 4. Siapkan data untuk update
            const userDataToUpdate = { email, username }; // Field di tabel USERS
            const profileDataToUpdate = { nama_lengkap, email, no_telepon: no_telepon || null }; // Field di tabel PROFILE
            const doctorSpecificDataToUpdate = { spesialisasi, lisensi_no, pengalaman_tahun: parseInt(pengalaman_tahun) }; // Field di tabel DOCTORS

            // Jika password diisi di form, berarti admin ingin mengubahnya
            if (password && password.trim() !== '') {
                userDataToUpdate.password = await bcrypt.hash(password, 10);
            }

            // 5. Panggil fungsi model untuk melakukan update secara transaksional
            // Kita akan buat User.updateFullDoctorDetails(userId, profileId, doctorId, userData, profileData, doctorSpecificData)
            await User.updateFullDoctorDetails(
                userId,
                profileId,
                doctorId, // id_doctor (PK dari tabel doctors)
                userDataToUpdate,
                profileDataToUpdate,
                doctorSpecificDataToUpdate
            );

            res.status(200).json({
                success: true,
                message: 'Data dokter berhasil diupdate!'
            });
            console.log(`userController: updateDoctor - Doctor data updated successfully for doctorId: ${doctorId}`);

        } catch (error) {
            console.error(`userController: Error in updateDoctor for doctorId ${doctorId}:`, error);
            // Tambahkan penanganan error spesifik jika perlu (misal, unique constraint lain)
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat mengupdate data dokter.' });
        }
    },

    // START: FUNGSI BARU UNTUK MENONAKTIFKAN AKUN DOKTER (SOFT DELETE)
    deactivateDoctorAccount: async (req, res) => {
        const doctorId = req.params.id; // Ini adalah id_doctor dari tabel DOCTORS
        console.log(`userController: deactivateDoctorAccount called for doctorId: ${doctorId}`);

        try {
            // Kita perlu method di model untuk melakukan soft delete berdasarkan id_doctor.
            // Method ini akan mencari id_user terkait lalu mengupdate statusnya.
            const result = await User.softDeleteDoctorByDoctorId(doctorId);

            if (result.affectedRows > 0) {
                res.status(200).json({ success: true, message: 'Akun dokter berhasil dinonaktifkan.' });
                console.log(`userController: Doctor account deactivated successfully for doctorId: ${doctorId}`);
            } else {
                // Ini bisa terjadi jika dokter dengan ID tersebut tidak ditemukan,
                // atau jika id_user terkait tidak ditemukan/statusnya sudah nonaktif.
                res.status(404).json({ success: false, message: 'Dokter tidak ditemukan atau akun sudah nonaktif.' });
                console.log(`userController: Doctor not found or already inactive for doctorId: ${doctorId}`);
            }
        } catch (error) {
            console.error(`userController: Error in deactivateDoctorAccount for doctorId ${doctorId}:`, error);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat menonaktifkan akun dokter.' });
        }
    },

    activateUserAccount: async (req, res) => {
        const userId = req.params.id; // Ini adalah id_user dari tabel USERS
        console.log(`userController: activateUserAccount called for userId: ${userId}`);

        try {
            // Kita akan menggunakan method User.updateStatusValid yang sudah ada di modelmu
            const statusAktif = 1; // Status untuk "Valid"
            const result = await User.updateStatusValid(userId, statusAktif);

            if (result.affectedRows > 0) {
                res.status(200).json({ success: true, message: 'Akun pengguna berhasil diaktifkan kembali.' });
                console.log(`userController: User account activated successfully for userId: ${userId}`);
            } else {
                // Ini bisa terjadi jika user dengan ID tersebut tidak ditemukan atau statusnya sudah aktif.
                res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan atau akun sudah aktif.' });
                console.log(`userController: User not found or already active for userId: ${userId}`);
            }
        } catch (error) {
            console.error(`userController: Error in activateUserAccount for userId ${userId}:`, error);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat mengaktifkan akun pengguna.' });
        }
    },

    verifyUserAccount: async (req, res) => {
        const userId = req.params.id;
        console.log(`userController: verifyUserAccount called for userId: ${userId}`);

        try {
            const statusValid = 1; // Status untuk "Valid"
            // Kita bisa langsung menggunakan User.updateStatusValid yang sudah ada
            const result = await User.updateStatusValid(userId, statusValid);

            if (result.affectedRows > 0) {
                res.status(200).json({ success: true, message: 'Pengguna berhasil diverifikasi.' });
                console.log(`userController: User account verified successfully for userId: ${userId}`);
            } else {
                // Ini bisa terjadi jika user dengan ID tersebut tidak ditemukan 
                // atau statusnya sudah 'Valid' (jika query updateStatusValid mencegah update jika status sama)
                res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan atau status tidak berubah.' });
                console.log(`userController: User not found or status not changed for userId: ${userId}`);
            }
        } catch (error) {
            console.error(`userController: Error in verifyUserAccount for userId ${userId}:`, error);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat memverifikasi pengguna.' });
        }
    },

    // Fungsi untuk menghapus (atau menonaktifkan) pengguna
    deleteUser: async (req, res) => {
        console.log('userController: deleteUser called.');
        const userId = req.params.id;
        try {
            await User.updateStatusValid(userId, 3); // Soft delete (status keluar)
            res.status(200).json({ message: 'Pengguna berhasil dinonaktifkan (status keluar).' });
            console.log('userController: deleteUser - User deactivated successfully.');
        } catch (error) {
            console.error('userController: Error in deleteUser:', error);
            console.error('Error Stack:', error.stack);
            res.status(500).json({ message: 'Terjadi kesalahan saat menonaktifkan pengguna.' });
        }
    },

    getAllDoctors: async (req, res) => {
        console.log('userController: getAllDoctors called.');
        try {
            const doctors = await User.findAllDoctors();

            console.log('userController: getAllDoctors - Doctors received from model:', doctors.length);
            res.status(200).json({ success: true, data: doctors });
            console.log('userController: getAllDoctors - Response sent.');

        } catch (error) {
            console.error('userController: Error in getAllDoctors:', error);
            console.error('Error Stack:', error.stack); 
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat mengambil daftar dokter.' });
        }
    },

    getDoctorByIdForEdit: async (req, res) => {
        console.log('userController: getDoctorByIdForEdit called for ID:', req.params.id);    
        try {
            const doctorId = req.params.id;
            const doctor = await User.findDoctorById(doctorId); 
            if (doctor) {
                res.status(200).json({ success: true, data: doctor });        
            } else {
                res.status(404).json({ success: false, message: 'Data dokter tidak ditemukan.' });        
            }
        } catch (error) {
            console.error('userController: Error in getDoctorByIdForEdit:', error);
            res.status(500).json({ success: false, message: 'Gagal mengambil data dokter.' });
        }
    },

    getPatientDashboardData: async (req, res) => {
        console.log('userController: getPatientDashboardData called.');
        const id_patient = req.user.id_user; 

        if (!req.user || !id_patient) {
            console.error('userController: req.user is undefined or missing id_user for patient dashboard.');
            return res.status(401).json({ success: false, message: 'Akses ditolak. Informasi pengguna tidak tersedia.' });
        }
        if (req.user.id_level_user !== 4) { 
            console.log('userController: Access denied for patient dashboard, user is not a patient. Current level:', req.user.id_level_user);
            return res.status(403).json({ success: false, message: 'Akses ditolak. Anda bukan pasien.' });
        }

        try {
            const userProfileData = await User.findById(id_patient); 
            if (!userProfileData) { 
                console.error(`userController: Patient profile not found for ID: ${id_patient}`);
                return res.status(404).json({ success: false, message: 'Data pasien tidak ditemukan.' });
            }

            // Hitung usia (kode ini sudah ada di kodemu)
            let usia = null;
            if (userProfileData.tanggal_lahir) {
                const birthDate = new Date(userProfileData.tanggal_lahir);
                const today = new Date();
                usia = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    usia--;
                }
            }

            // --- PENGECEKAN KELENGKAPAN PROFIL ---
            // Tentukan field mana saja dari userProfileData (yang berasal dari tabel PROFILE) yang wajib
            const mandatoryProfileFields = [
                userProfileData.nama_lengkap,
                userProfileData.jenis_kelamin,
                userProfileData.tanggal_lahir,
                userProfileData.alamat,
                userProfileData.no_telepon
            ];
            // Profil dianggap lengkap jika semua field wajib di atas ada nilainya (tidak null, tidak string kosong)
            const isProfileComplete = mandatoryProfileFields.every(field => field !== null && field !== '');
            
            console.log(`userController: Profile for user ${id_patient} - isProfileComplete: ${isProfileComplete}`);
            // --- AKHIR PENGECEKAN KELENGKAPAN PROFIL ---

            const upcomingAppointments = await User.findUpcomingAppointmentsByPatientId(id_patient);
            const visitHistory = await User.findPastAppointmentsByPatientId(id_patient);
            console.log(`userController: User ${id_patient} - Upcoming: ${upcomingAppointments.length}, History: ${visitHistory.length}`);

            // Susun objek userProfile yang akan dikirim ke frontend
            // Pastikan semua field yang dibutuhkan oleh form lengkapi profil dan tampilan dashboard ada di sini
            const profileToSend = {
                id_user: userProfileData.id_user,
                username: userProfileData.username,
                email: userProfileData.email, // Penting untuk ditampilkan di form profil (readonly)
                id_profile: userProfileData.id_profile, // Penting untuk update profil nanti
                nama_lengkap: userProfileData.nama_lengkap,
                jenis_kelamin: userProfileData.jenis_kelamin,
                tanggal_lahir: userProfileData.tanggal_lahir, // Kirim format asli, frontend bisa format
                alamat: userProfileData.alamat,
                no_telepon: userProfileData.no_telepon,
                usia: usia || null // Kirim null jika tidak ada tanggal lahir
            };
            
            res.status(200).json({
                success: true, // Selalu kirim status sukses jika operasi berhasil
                message: 'Data dashboard pasien berhasil dimuat.',
                userProfile: profileToSend,
                upcomingAppointments: upcomingAppointments,
                visitHistory: visitHistory,
                isProfileComplete: isProfileComplete // KIRIM FLAG INI KE FRONTEND
            });
            console.log('userController: Sent patient dashboard data response.'); 

        } catch (error) {
            console.error('userController: Error getting patient dashboard data:', error);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat memuat data dashboard pasien.' });
        }
    },

    updateMyProfile: async (req, res) => {
    const userId = req.user.id_user; 
    console.log(`userController: updateMyProfile called for userId: ${userId}`);

    const { nama_lengkap, jenis_kelamin, tanggal_lahir, alamat, no_telepon /*, email jika mau diupdate juga*/ } = req.body;

    if (!nama_lengkap || !jenis_kelamin || !tanggal_lahir || !alamat || !no_telepon) {
        return res.status(400).json({ success: false, message: 'Semua field profil wajib diisi.' });
    }

    try {
        const currentUserData = await User.findById(userId);
        if (!currentUserData || !currentUserData.id_profile) {
            return res.status(404).json({ success: false, message: 'Profil pengguna tidak ditemukan.' });
        }
        const profileId = currentUserData.id_profile;

        const profileDataToUpdate = {
            nama_lengkap,
            jenis_kelamin,
            tanggal_lahir,
            alamat,
            no_telepon,
        };

        const result = await User.updateProfile(profileId, profileDataToUpdate); // Gunakan fungsi model yang sudah ada

        if (result.affectedRows > 0) {
            res.status(200).json({ success: true, message: 'Profil berhasil diperbarui.'});
            console.log(`userController: Profile updated successfully for profileId: ${profileId}`);
        } else {
            res.status(400).json({ success: false, message: 'Profil tidak berubah atau gagal diperbarui.' });
        }
    } catch (error) {
        console.error(`userController: Error in updateMyProfile for userId ${userId}:`, error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat memperbarui profil.' });
    }
},

    getBookingFormData: async (req, res) => {
        console.log('userController: getBookingFormData called.');
        try {
            const doctors = await User.findAllDoctors(); 
            const services = await User.findAllServices(); 

            res.status(200).json({
                success: true,
                doctors: doctors,
                services: services
            });
            console.log('userController: getBookingFormData - Data sent.');
        } catch (error) {
            console.error('userController: Error getting booking form data:', error);
            console.error('Error Stack:', error.stack);
            res.status(500).json({ message: 'Terjadi kesalahan saat memuat data booking.' });
        }
    },

    getAvailableDoctorSlots: async (req, res) => {
        const { id_doctor, date } = req.query; 
        console.log('userController: getAvailableDoctorSlots called for doctor:', id_doctor, 'date:', date); 

        if (!id_doctor || !date) {
            return res.status(400).json({ message: 'ID dokter dan tanggal diperlukan.' });
        }

        try {
            console.log('userController: Calling User.findAvailableDoctorSchedules...'); 
            const schedules = await User.findAvailableDoctorSchedules(id_doctor, date);
            console.log('userController: Received schedules from model:', schedules); 
            res.status(200).json({ schedules: schedules });
        } catch (error) {
            console.error('userController: Error getting available doctor slots:', error);
            console.error('Error Stack:', error.stack); 
            res.status(500).json({ message: 'Terjadi kesalahan saat memuat jadwal dokter.' });
        }
    },

    bookAppointment: async (req, res) => {
        console.log('userController: bookAppointment called.');
        const { id_doctor, id_service, tanggal_janji, waktu_janji, catatan_pasien } = req.body;
        const id_patient = req.user.id_user; 

        if (!id_doctor || !id_service || !tanggal_janji || !waktu_janji) {
            return res.status(400).json({ message: 'Dokter, layanan, tanggal, dan waktu janji diperlukan.' });
        }

        try {
            const parsedDoctorId = parseInt(id_doctor);
            const parsedServiceId = parseInt(id_service);

            const availableSchedules = await User.findAvailableDoctorSchedules(parsedDoctorId, tanggal_janji);
            const isSlotAvailable = availableSchedules.some(slot =>
                slot.waktu_mulai.substring(0, 5) === waktu_janji.substring(0, 5) 
            );

            if (!isSlotAvailable) {
                return res.status(409).json({ message: 'Slot janji temu sudah terisi atau tidak tersedia.' });
            }

            const appointmentData = {
                id_patient,
                id_doctor: parsedDoctorId,
                id_service: parsedServiceId,
                tanggal_janji,
                waktu_janji,
                catatan_pasien: catatan_pasien || null,
                status_janji: 'Pending' 
            };

            const result = await User.createAppointment(appointmentData);
            res.status(201).json({ message: 'Janji temu berhasil dibuat.', id_appointment: result.insertId });
            console.log('userController: bookAppointment - Appointment created.');

        } catch (error) {
            console.error('userController: Error booking appointment:', error);
            console.error('Error Stack:', error.stack); 
            res.status(500).json({ message: 'Terjadi kesalahan saat membuat janji temu.' });
        }
    }
};

module.exports = userController;