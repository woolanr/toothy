// backend/controllers/perawatController.js
const db = require("../config/database");
const moment = require("moment");

const perawatController = {
  getSummary: async (req, res) => {
    const today = moment().format("YYYY-MM-DD");
    try {
      const [totalResult] = await db.execute(
        "SELECT COUNT(*) as total FROM APPOINTMENTS WHERE tanggal_janji = ?",
        [today]
      );
      const [checkedInResult] = await db.execute(
        "SELECT COUNT(*) as checkedIn FROM APPOINTMENTS WHERE tanggal_janji = ? AND status_janji = 'Confirmed'",
        [today]
      );
      const [pendingResult] = await db.execute(
        "SELECT COUNT(*) as pending FROM APPOINTMENTS WHERE tanggal_janji = ? AND status_janji = 'Pending'",
        [today]
      );
      res.status(200).json({
        total: totalResult[0].total,
        checkedIn: checkedInResult[0].checkedIn,
        pending: pendingResult[0].pending,
      });
    } catch (error) {
      console.error("Error fetching staff summary:", error);
      res.status(500).json({ message: "Gagal mengambil data ringkasan." });
    }
  },

  getAllAppointments: async (req, res) => {
    try {
      const query = `
        SELECT 
          a.id_appointment, a.id_doctor, a.id_patient, a.id_service,
          p.nama_lengkap AS patient_name,
          d_profile.nama_lengkap AS doctor_name,
          a.tanggal_janji, a.waktu_janji, a.status_janji, a.catatan_pasien
        FROM APPOINTMENTS a
        JOIN USERS u_patient ON a.id_patient = u_patient.id_user
        JOIN PROFILE p ON u_patient.id_profile = p.id_profile
        JOIN DOCTORS doc ON a.id_doctor = doc.id_doctor
        JOIN USERS u_doctor ON doc.id_user = u_doctor.id_user
        JOIN PROFILE d_profile ON u_doctor.id_profile = d_profile.id_profile
        ORDER BY a.tanggal_janji DESC, a.waktu_janji DESC
      `;
      const [appointments] = await db.execute(query);
      res.status(200).json(appointments);
    } catch (error) {
      console.error("Error fetching all appointments:", error);
      res.status(500).json({ message: "Gagal mengambil daftar janji temu." });
    }
  },

  getAllDoctors: async (req, res) => {
    try {
      const [doctors] = await db.execute(
        `SELECT d.id_doctor, p.nama_lengkap 
             FROM DOCTORS d
             JOIN USERS u ON d.id_user = u.id_user
             JOIN PROFILE p ON u.id_profile = p.id_profile
             ORDER BY p.nama_lengkap ASC`
      );
      res.status(200).json(doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      res.status(500).json({ message: "Gagal mengambil daftar dokter." });
    }
  },

  getAllServices: async (req, res) => {
    try {
      const [services] = await db.execute(
        `SELECT id_service, nama_layanan FROM SERVICES ORDER BY nama_layanan ASC`
      );
      res.status(200).json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Gagal mengambil daftar layanan." });
    }
  },

  updateAppointment: async (req, res) => {
    const { id } = req.params;
    const {
      id_doctor,
      id_service,
      tanggal_janji,
      waktu_janji,
      status_janji,
      catatan_pasien,
    } = req.body;

    if (
      !id_doctor ||
      !id_service ||
      !tanggal_janji ||
      !waktu_janji ||
      !status_janji
    ) {
      return res
        .status(400)
        .json({ message: "Data tidak lengkap. Layanan wajib diisi." });
    }

    try {
      const query = `
            UPDATE APPOINTMENTS SET
                id_doctor = ?, id_service = ?, tanggal_janji = ?, 
                waktu_janji = ?, status_janji = ?, catatan_pasien = ?
            WHERE id_appointment = ?
        `;
      await db.execute(query, [
        id_doctor,
        id_service,
        tanggal_janji,
        waktu_janji,
        status_janji,
        catatan_pasien,
        id,
      ]);
      res.status(200).json({ message: "Janji temu berhasil diperbarui!" });
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Gagal memperbarui janji temu." });
    }
  },

  createAppointment: async (req, res) => {
    const {
      patient_name,
      id_doctor,
      id_service,
      tanggal_janji,
      waktu_janji,
      status_janji,
      catatan_pasien,
    } = req.body;

    if (
      !patient_name ||
      !id_doctor ||
      !id_service ||
      !tanggal_janji ||
      !waktu_janji ||
      !status_janji
    ) {
      return res.status(400).json({
        message:
          "Nama pasien, dokter, layanan, tanggal, waktu, dan status wajib diisi.",
      });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      let patientUserId;

      const [users] = await connection.execute(
        "SELECT u.id_user FROM USERS u JOIN PROFILE p ON u.id_profile = p.id_profile WHERE p.nama_lengkap = ?",
        [patient_name]
      );

      if (users.length > 0) {
        patientUserId = users[0].id_user;
      } else {
        const [newProfile] = await connection.execute(
          "INSERT INTO PROFILE (nama_lengkap) VALUES (?)",
          [patient_name]
        );
        const newProfileId = newProfile.insertId;

        const tempEmail = `${patient_name
          .replace(/\s+/g, "")
          .toLowerCase()}${Date.now()}@temp.com`;
        const tempUsername = patient_name.replace(/\s+/g, "").toLowerCase();

        const [newUser] = await connection.execute(
          "INSERT INTO USERS (username, email, password, id_level_user, id_status_valid, id_profile) VALUES (?, ?, ?, ?, ?, ?)",
          [tempUsername, tempEmail, "default_password", 4, 1, newProfileId]
        );
        patientUserId = newUser.insertId;
      }

      const appointmentQuery = `
            INSERT INTO APPOINTMENTS (id_patient, id_doctor, id_service, tanggal_janji, waktu_janji, status_janji, catatan_pasien)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
      await connection.execute(appointmentQuery, [
        patientUserId,
        id_doctor,
        id_service,
        tanggal_janji,
        waktu_janji,
        status_janji,
        catatan_pasien,
      ]);

      await connection.commit();
      res.status(201).json({ message: "Janji temu baru berhasil dibuat!" });
    } catch (error) {
      await connection.rollback();
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Gagal membuat janji temu baru." });
    } finally {
      connection.release();
    }
  },
};

module.exports = perawatController;
