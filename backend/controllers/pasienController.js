const db = require("../config/database");
const moment = require("moment");
const multer = require("multer");
const path = require("path");

// Konfigurasi Multer untuk penyimpanan file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/profiles/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      req.user.id_profile + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage: storage });

// --- FUNGSI-FUNGSI CONTROLLER ---

const getDashboardData = async (req, res) => {
  const id_user = req.user.id_user;
  const today = moment().format("YYYY-MM-DD");
  try {
    const [profile] = await db.execute(
      "SELECT nama_lengkap FROM PROFILE WHERE id_profile = ?",
      [req.user.id_profile]
    );
    if (profile.length === 0) {
      return res
        .status(404)
        .json({ message: "Profil pasien tidak ditemukan." });
    }
    const patientName = profile[0].nama_lengkap;

    const [appointments] = await db.execute(
      `SELECT 
               a.tanggal_janji, a.waktu_janji, a.status_janji,
               s.nama_layanan AS service_name,
               d_profile.nama_lengkap AS doctor_name
             FROM APPOINTMENTS a
             JOIN USERS u_patient ON a.id_patient = u_patient.id_user
             JOIN PROFILE p ON u_patient.id_profile = p.id_profile
             JOIN SERVICES s ON a.id_service = s.id_service
             JOIN DOCTORS doc ON a.id_doctor = doc.id_doctor
             JOIN USERS u_doctor ON doc.id_user = u_doctor.id_user
             JOIN PROFILE d_profile ON u_doctor.id_profile = d_profile.id_profile
             WHERE a.id_patient = ? AND a.tanggal_janji >= ? AND a.status_janji IN ('Pending', 'Confirmed')
             ORDER BY a.tanggal_janji ASC, a.waktu_janji ASC
             LIMIT 1`,
      [id_user, today]
    );
    const upcomingAppointment =
      appointments.length > 0 ? appointments[0] : null;
    res.status(200).json({ patientName, upcomingAppointment });
  } catch (error) {
    console.error("Error fetching patient dashboard data:", error);
    res.status(500).json({ message: "Gagal mengambil data dasbor pasien." });
  }
};

const getBookingData = async (req, res) => {
  try {
    const [services] = await db.execute(
      "SELECT id_service, nama_layanan, harga FROM SERVICES WHERE TRIM(status_layanan) = 'Aktif'"
    );
    const [doctors] = await db.execute(`
            SELECT d.id_doctor, p.nama_lengkap
            FROM DOCTORS d
            JOIN USERS u ON d.id_user = u.id_user
            JOIN PROFILE p ON u.id_profile = p.id_profile
            WHERE u.id_status_valid = 1
        `);
    res.status(200).json({ services, doctors });
  } catch (error) {
    console.error("Error fetching booking data:", error);
    res.status(500).json({ message: "Gagal mengambil data untuk booking." });
  }
};

const getAvailability = async (req, res) => {
  const { id_doctor, tanggal_janji } = req.query;
  if (!id_doctor || !tanggal_janji) {
    return res
      .status(400)
      .json({ message: "ID Dokter dan tanggal wajib diisi." });
  }
  try {
    const dayOfWeek = moment(tanggal_janji).day() + 1;
    const [schedules] = await db.execute(
      `SELECT waktu_mulai, waktu_selesai FROM doctor_schedules WHERE id_doctor = ? AND hari_dalam_minggu = ? AND is_available = 1`,
      [id_doctor, dayOfWeek]
    );
    if (schedules.length === 0) {
      return res.json([]);
    }
    const [bookedAppointments] = await db.execute(
      `SELECT waktu_janji FROM APPOINTMENTS WHERE id_doctor = ? AND tanggal_janji = ? AND status_janji NOT IN ('Completed', 'Canceled', 'Failed')`,
      [id_doctor, tanggal_janji]
    );
    const bookedSlots = bookedAppointments.map((app) => app.waktu_janji);
    const allSlots = [];
    const slotDuration = 60;
    schedules.forEach((schedule) => {
      let currentTime = moment(schedule.waktu_mulai, "HH:mm:ss");
      const endTime = moment(schedule.waktu_selesai, "HH:mm:ss");
      while (currentTime.isBefore(endTime)) {
        allSlots.push(currentTime.format("HH:mm:ss"));
        currentTime.add(slotDuration, "minutes");
      }
    });
    const availableSlots = allSlots.filter(
      (slot) => !bookedSlots.includes(slot)
    );
    res.status(200).json(availableSlots);
  } catch (error) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ message: "Gagal mengambil data ketersediaan." });
  }
};

const createAppointment = async (req, res) => {
  const id_user = req.user.id_user;
  const { id_service, id_doctor, tanggal_janji, waktu_janji, keluhan } =
    req.body;

  if (!id_service || !id_doctor || !tanggal_janji || !waktu_janji) {
    return res
      .status(400)
      .json({ message: "Harap lengkapi semua kolom wajib diisi." });
  }
  try {
    // ... (Semua kode validasi jadwal tidak berubah) ...
    const dayOfWeek = moment(tanggal_janji).day() + 1;
    const [schedules] = await db.execute(
      `SELECT waktu_mulai, waktu_selesai FROM doctor_schedules WHERE id_doctor = ? AND hari_dalam_minggu = ? AND is_available = 1`,
      [id_doctor, dayOfWeek]
    );
    if (schedules.length === 0) {
      return res.status(400).json({
        message:
          "Jadwal tidak tersedia. Dokter tidak praktek pada hari yang Anda pilih.",
      });
    }
    const isTimeAvailable = schedules.some(
      (schedule) =>
        waktu_janji >= schedule.waktu_mulai &&
        waktu_janji < schedule.waktu_selesai
    );
    if (!isTimeAvailable) {
      return res.status(400).json({
        message:
          "Jadwal tidak tersedia. Waktu yang Anda pilih berada di luar jam praktek dokter.",
      });
    }
    const [existingAppointments] = await db.execute(
      `SELECT id_appointment FROM APPOINTMENTS WHERE id_doctor = ? AND tanggal_janji = ? AND waktu_janji = ? AND status_janji NOT IN ('Completed', 'Canceled', 'Failed')`,
      [id_doctor, tanggal_janji, waktu_janji]
    );
    if (existingAppointments.length > 0) {
      return res.status(400).json({
        message:
          "Jadwal pada waktu ini sudah dipesan. Silakan pilih waktu lain.",
      });
    }

    // Simpan janji temu
    await db.execute(
      `INSERT INTO APPOINTMENTS (id_patient, id_doctor, id_service, tanggal_janji, waktu_janji, status_janji, catatan_pasien)
             VALUES (?, ?, ?, ?, ?, 'Pending', ?)`,
      [
        id_user,
        id_doctor,
        id_service,
        tanggal_janji,
        waktu_janji,
        keluhan || null,
      ]
    );

    // --- PERUBAHAN: Logika notifikasi dihapus dari sini ---

    res.status(201).json({
      message:
        "Booking janji temu berhasil dibuat dan sedang menunggu konfirmasi.",
    });
  } catch (error) {
    console.error("Error creating appointment:", error);
    res
      .status(500)
      .json({ message: "Gagal membuat janji temu karena kesalahan server." });
  }
};

const getAppointmentHistory = async (req, res) => {
  const id_user = req.user.id_user;
  try {
    const [history] = await db.execute(
      `
            SELECT 
              a.tanggal_janji, a.waktu_janji, a.status_janji,
              s.nama_layanan,
              p_doctor.nama_lengkap AS doctor_name,
              mr.diagnosis,
              mr.treatment_plan,
              mr.actions_taken,
              mr.doctor_notes,
              mr.resep_obat
            FROM APPOINTMENTS a
            JOIN SERVICES s ON a.id_service = s.id_service
            JOIN DOCTORS d ON a.id_doctor = d.id_doctor
            JOIN USERS u_doctor ON d.id_user = u_doctor.id_user
            JOIN PROFILE p_doctor ON u_doctor.id_profile = p_doctor.id_profile
            LEFT JOIN dental_medical_records mr ON a.id_appointment = mr.id_appointment
            WHERE a.id_patient = ? 
            AND a.status_janji IN ('Completed', 'Canceled')
            ORDER BY a.tanggal_janji DESC, a.waktu_janji DESC
        `,
      [id_user]
    );
    res.status(200).json(history);
  } catch (error) {
    console.error("Error fetching appointment history:", error);
    res.status(500).json({ message: "Gagal mengambil riwayat janji temu." });
  }
};

const getProfile = async (req, res) => {
  try {
    const [profile] = await db.execute(
      `SELECT nama_lengkap, tanggal_lahir, jenis_kelamin, nik, alamat, no_telepon, email, suhu_tubuh, alergi, golongan_darah, foto_profil_url 
             FROM PROFILE WHERE id_profile = ?`,
      [req.user.id_profile]
    );
    if (profile.length === 0) {
      return res.status(404).json({ message: "Profil tidak ditemukan." });
    }
    res.status(200).json(profile[0]);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Gagal mengambil data profil." });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      nama_lengkap,
      email,
      tanggal_lahir,
      jenis_kelamin,
      nik,
      alamat,
      no_telepon,
      suhu_tubuh,
      alergi,
      golongan_darah,
    } = req.body;

    // Update tabel PROFILE
    await db.execute(
      `UPDATE PROFILE SET 
          nama_lengkap = ?, tanggal_lahir = ?, jenis_kelamin = ?, nik = ?, alamat = ?, 
          no_telepon = ?, suhu_tubuh = ?, alergi = ?, golongan_darah = ? 
         WHERE id_profile = ?`,
      [
        nama_lengkap,
        tanggal_lahir,
        jenis_kelamin,
        nik,
        alamat,
        no_telepon,
        suhu_tubuh,
        alergi,
        golongan_darah,
        req.user.id_profile,
      ]
    );

    // Juga update email di tabel USERS jika diubah
    await db.execute(`UPDATE USERS SET email = ? WHERE id_profile = ?`, [
      email,
      req.user.id_profile,
    ]);

    res.status(200).json({ message: "Profil berhasil diperbarui!" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Gagal memperbarui profil." });
  }
};

const updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Tidak ada file yang diupload." });
    }
    const photoUrl = `/public/uploads/profiles/${req.file.filename}`;
    await db.execute(
      `UPDATE PROFILE SET foto_profil_url = ? WHERE id_profile = ?`,
      [photoUrl, req.user.id_profile]
    );
    res.status(200).json({
      message: "Foto profil berhasil diperbarui!",
      filePath: photoUrl,
    });
  } catch (error) {
    console.error("Error updating profile photo:", error);
    res.status(500).json({ message: "Gagal memperbarui foto profil." });
  }
};

const getNotifications = async (req, res) => {
  try {
    const [notifications] = await db.execute(
      `SELECT id_notification, title, message, is_read, created_at 
         FROM NOTIFICATIONS 
         WHERE id_user = ? 
         ORDER BY created_at DESC`,
      [req.user.id_user]
    );
    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Gagal mengambil notifikasi." });
  }
};

// --- FUNGSI BARU: Tandai Notifikasi Sebagai Sudah Dibaca ---
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params; // Mengambil id notifikasi dari URL
    await db.execute(
      `UPDATE NOTIFICATIONS SET is_read = TRUE WHERE id_notification = ? AND id_user = ?`,
      [id, req.user.id_user]
    );
    res
      .status(200)
      .json({ message: "Notifikasi ditandai sebagai sudah dibaca." });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Gagal memperbarui status notifikasi." });
  }
};

// Ekspor semua fungsi dan middleware upload
module.exports = {
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
};
