// backend/controllers/doctorController.js
const db = require("../config/database");
const User = require("../models/userModel");
const moment = require("moment");

const doctorController = {
  // UPDATED: The queries in this function are now fixed
  getDashboardData: async (req, res) => {
    const id_doctor = req.user.id_doctor;
    const today = moment().format("YYYY-MM-DD");
    if (!id_doctor) {
      return res
        .status(401)
        .json({ message: "ID Dokter tidak ditemukan. Harap login kembali." });
    }

    try {
      // Corrected Query for Upcoming Appointments
      const [upcomingAppointments] = await db.execute(
        `SELECT 
            a.id_appointment, p.nama_lengkap AS patient_name, a.tanggal_janji, 
            a.waktu_janji, a.catatan_pasien, a.status_janji, s.nama_layanan AS service_name
         FROM APPOINTMENTS a
         JOIN USERS u ON a.id_patient = u.id_user
         JOIN PROFILE p ON u.id_profile = p.id_profile
         LEFT JOIN SERVICES s ON a.id_service = s.id_service
         WHERE a.id_doctor = ? 
         AND a.tanggal_janji >= ? 
         AND a.status_janji IN ('Pending', 'Confirmed')
         ORDER BY a.tanggal_janji ASC, a.waktu_janji ASC`,
        [id_doctor, today]
      );

      // Corrected Query for Patient Queue Today
      const [patientQueue] = await db.execute(
        `SELECT 
            a.id_appointment, p.nama_lengkap AS patient_name, 
            a.waktu_janji, a.status_janji, s.nama_layanan AS service_name
         FROM APPOINTMENTS a
         JOIN USERS u ON a.id_patient = u.id_user
         JOIN PROFILE p ON u.id_profile = p.id_profile
         LEFT JOIN SERVICES s ON a.id_service = s.id_service
         WHERE a.id_doctor = ? 
         AND a.tanggal_janji = ? 
         AND a.status_janji IN ('Pending', 'Confirmed')
         ORDER BY a.waktu_janji ASC`,
        [id_doctor, today]
      );

      const [doctorSchedule] = await db.execute(
        `SELECT id_schedule, hari_dalam_minggu, waktu_mulai, waktu_selesai, is_available
         FROM DOCTOR_SCHEDULES
         WHERE id_doctor = ?
         ORDER BY hari_dalam_minggu ASC, waktu_mulai ASC`,
        [id_doctor]
      );

      res.status(200).json({
        upcomingAppointments,
        patientQueue,
        doctorSchedule,
      });
    } catch (error) {
      console.error("Error in getDashboardData:", error);
      res.status(500).json({
        message: "Terjadi kesalahan server saat mengambil data dashboard.",
      });
    }
  },

  getDoctorProfile: async (req, res) => {
    const id_user = req.user.id_user;
    const id_doctor = req.user.id_doctor;
    const id_profile_user = req.user.id_profile;

    if (!id_user || !id_doctor || !id_profile_user) {
      return res
        .status(401)
        .json({ message: "Informasi pengguna atau dokter tidak lengkap." });
    }

    try {
      const [profileRows] = await db.execute(
        `SELECT 
                    nama_lengkap, email, no_telepon, tanggal_lahir, jenis_kelamin, alamat, nik
                 FROM PROFILE 
                 WHERE id_profile = ?`,
        [id_profile_user]
      );
      const profileData = profileRows[0];

      if (!profileData) {
        return res
          .status(404)
          .json({ message: "Data profil tidak ditemukan." });
      }

      const [doctorRows] = await db.execute(
        `SELECT 
                    spesialisasi, lisensi_no, pengalaman_tahun, foto_profil_url, rating_rata2
                 FROM DOCTORS 
                 WHERE id_doctor = ?`,
        [id_doctor]
      );
      const doctorData = doctorRows[0];

      if (!doctorData) {
        return res
          .status(404)
          .json({ message: "Data dokter tidak ditemukan." });
      }

      res.status(200).json({
        ...profileData,
        ...doctorData,
      });
    } catch (error) {
      console.error("Error in getDoctorProfile:", error);
      res.status(500).json({
        message: "Terjadi kesalahan server saat mengambil profil dokter.",
      });
    }
  },

  updateDoctorProfile: async (req, res) => {
    const id_user = req.user.id_user;
    const id_doctor = req.user.id_doctor;
    const id_profile_user = req.user.id_profile;

    if (!id_user || !id_doctor || !id_profile_user) {
      return res
        .status(401)
        .json({ message: "Informasi pengguna atau dokter tidak lengkap." });
    }

    const {
      nama_lengkap,
      email,
      no_telepon,
      tanggal_lahir,
      jenis_kelamin,
      alamat,
      nik,
      spesialisasi,
      lisensi_no,
      pengalaman_tahun,
      foto_profil_url,
    } = req.body;

    const profileDataToUpdate = {
      nama_lengkap: nama_lengkap,
      email: email,
      no_telepon: no_telepon,
      tanggal_lahir: tanggal_lahir,
      jenis_kelamin: jenis_kelamin,
      alamat: alamat,
      nik: nik,
    };

    const doctorDataToUpdate = {
      spesialisasi: spesialisasi,
      lisensi_no: lisensi_no,
      pengalaman_tahun: pengalaman_tahun,
      foto_profil_url: foto_profil_url,
    };

    try {
      const updateResult = await User.updateFullDoctorDetails(
        id_user,
        id_profile_user,
        id_doctor,
        {},
        profileDataToUpdate,
        doctorDataToUpdate
      );

      if (updateResult.success) {
        res.status(200).json({ message: "Profil dokter berhasil diperbarui!" });
      } else {
        res.status(500).json({ message: "Gagal memperbarui profil dokter." });
      }
    } catch (error) {
      console.error("Error in updateDoctorProfile:", error);
      res
        .status(500)
        .json({ message: "Terjadi kesalahan server saat memperbarui profil." });
    }
  },

  getAppointmentForExamination: async (req, res) => {
    const { id_appointment } = req.params;
    const id_doctor = req.user.id_doctor;

    if (!id_doctor || !id_appointment) {
      return res
        .status(400)
        .json({ message: "ID Dokter atau ID Janji Temu tidak ditemukan." });
    }

    try {
      // Corrected the JOIN logic here to go through USERS first
      const [appointmentDetails] = await db.execute(
        `SELECT 
              a.id_appointment, a.tanggal_janji, a.waktu_janji, a.catatan_pasien, a.status_janji, a.id_service,
              p.id_profile, p.nama_lengkap AS patient_name, p.tanggal_lahir, p.jenis_kelamin, p.no_telepon, p.email, p.nik, p.alamat
           FROM APPOINTMENTS a
           JOIN USERS u ON a.id_patient = u.id_user
           JOIN PROFILE p ON u.id_profile = p.id_profile
           WHERE a.id_appointment = ? AND a.id_doctor = ?`,
        [id_appointment, id_doctor]
      );

      if (appointmentDetails.length === 0) {
        return res.status(404).json({
          message: "Janji temu tidak ditemukan atau bukan milik dokter ini.",
        });
      }

      const appointment = appointmentDetails[0];

      // The medical history query is correct
      const [medicalHistory] = await db.execute(
        `SELECT 
              dm.id_record, dm.examination_date, dm.chief_complaint, dm.dental_examination_findings,
              dm.diagnosis, dm.treatment_plan, dm.actions_taken, dm.doctor_notes,
              doc_profile.nama_lengkap AS examining_doctor_name,
              s.nama_layanan AS service_name
           FROM DENTAL_MEDICAL_RECORDS dm
           JOIN DOCTORS doc ON dm.id_doctor = doc.id_doctor
           JOIN USERS u ON doc.id_user = u.id_user 
           JOIN PROFILE doc_profile ON u.id_profile = doc_profile.id_profile
           LEFT JOIN APPOINTMENTS a_hist ON dm.id_appointment = a_hist.id_appointment
           LEFT JOIN SERVICES s ON a_hist.id_service = s.id_service
           WHERE dm.id_profile = ? 
           ORDER BY dm.examination_date DESC`,
        [appointment.id_profile]
      );

      res.status(200).json({
        appointment,
        medicalHistory,
      });
    } catch (error) {
      console.error("Error in getAppointmentForExamination:", error);
      res.status(500).json({
        message: "Terjadi kesalahan server saat mengambil detail janji temu.",
      });
    }
  },

  saveExaminationResult: async (req, res) => {
    const { id_appointment } = req.params;
    const id_doctor = req.user.id_doctor;
    const {
      id_profile,
      chief_complaint,
      dental_examination_findings,
      diagnosis,
      treatment_plan,
      actions_taken,
      doctor_notes,
      resep_obat,
    } = req.body;

    if (
      !id_doctor ||
      !id_appointment ||
      !id_profile ||
      !chief_complaint ||
      !diagnosis
    ) {
      return res.status(400).json({
        message:
          "Data pemeriksaan tidak lengkap (ID Dokter, ID Janji Temu, ID Profil Pasien, Keluhan Utama, Diagnosa wajib diisi).",
      });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [existingRecord] = await connection.execute(
        "SELECT id_record FROM DENTAL_MEDICAL_RECORDS WHERE id_appointment = ?",
        [id_appointment]
      );

      if (existingRecord.length > 0) {
        await connection.execute(
          `UPDATE DENTAL_MEDICAL_RECORDS
           SET chief_complaint = ?, dental_examination_findings = ?, diagnosis = ?, treatment_plan = ?,
               actions_taken = ?, doctor_notes = ?, resep_obat = ?
           WHERE id_record = ?`,
          [
            chief_complaint,
            dental_examination_findings,
            diagnosis,
            treatment_plan,
            actions_taken,
            doctor_notes,
            resep_obat || null,
            existingRecord[0].id_record,
          ]
        );
      } else {
        await connection.execute(
          `INSERT INTO DENTAL_MEDICAL_RECORDS (id_appointment, id_profile, id_doctor, examination_date, chief_complaint, dental_examination_findings, diagnosis, treatment_plan, actions_taken, doctor_notes, resep_obat)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id_appointment,
            id_profile,
            id_doctor,
            new Date(),
            chief_complaint,
            dental_examination_findings,
            diagnosis,
            treatment_plan,
            actions_taken,
            doctor_notes,
            resep_obat || null,
          ]
        );
      }

      await connection.execute(
        `UPDATE APPOINTMENTS SET status_janji = 'Completed' WHERE id_appointment = ?`,
        [id_appointment]
      );

      await connection.commit();
      res.status(200).json({
        message:
          "Hasil pemeriksaan berhasil disimpan dan status janji temu diperbarui.",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error in saveExaminationResult:", error);
      res.status(500).json({
        message: "Terjadi kesalahan server saat menyimpan hasil pemeriksaan.",
      });
    } finally {
      connection.release();
    }
  },

  manageDoctorSchedule: async (req, res) => {
    const id_doctor = req.user.id_doctor;
    const {
      id_schedule,
      hari_dalam_minggu,
      waktu_mulai,
      waktu_selesai,
      is_available,
    } = req.body;
    if (
      !id_doctor ||
      !hari_dalam_minggu ||
      !waktu_mulai ||
      !waktu_selesai ||
      is_available === undefined
    ) {
      return res.status(400).json({
        message:
          "Data jadwal tidak lengkap (hari, waktu mulai, waktu selesai, dan ketersediaan wajib diisi).",
      });
    }
    try {
      if (id_schedule) {
        const [result] = await db.execute(
          `UPDATE DOCTOR_SCHEDULES
           SET hari_dalam_minggu = ?, waktu_mulai = ?, waktu_selesai = ?, is_available = ?
           WHERE id_schedule = ? AND id_doctor = ?`,
          [
            hari_dalam_minggu,
            waktu_mulai,
            waktu_selesai,
            is_available,
            id_schedule,
            id_doctor,
          ]
        );
        if (result.affectedRows > 0) {
          res.status(200).json({ message: "Jadwal berhasil diperbarui." });
        } else {
          res.status(404).json({
            message: "Jadwal tidak ditemukan atau bukan milik dokter ini.",
          });
        }
      } else {
        const [result] = await db.execute(
          `INSERT INTO DOCTOR_SCHEDULES (id_doctor, hari_dalam_minggu, waktu_mulai, waktu_selesai, is_available)
           VALUES (?, ?, ?, ?, ?)`,
          [
            id_doctor,
            hari_dalam_minggu,
            waktu_mulai,
            waktu_selesai,
            is_available,
          ]
        );
        res.status(201).json({
          message: "Jadwal baru berhasil ditambahkan.",
          id_schedule: result.insertId,
        });
      }
    } catch (error) {
      console.error("Error in manageDoctorSchedule:", error);
      res
        .status(500)
        .json({ message: "Terjadi kesalahan server saat mengelola jadwal." });
    }
  },
};

module.exports = doctorController;
