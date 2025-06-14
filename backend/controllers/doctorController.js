// backend/controllers/doctorController.js
const db = require("../config/database"); // Your MySQL2 Promise Pool
const User = require("../models/userModel"); // For using shared user/doctor model methods
const moment = require("moment"); // For date/time formatting, if not already used, consider adding via npm install moment

const doctorController = {
  // Get Dashboard Data for a Doctor
  getDashboardData: async (req, res) => {
    // --- ADD THIS CONSOLE.LOG ---
    console.log(
      "DoctorController: getDashboardData - req.user at start:",
      req.user
    );
    // --- END ADDED LOG ---

    const id_doctor = req.user.id_doctor; // id_doctor is now directly available from JWT payload
    const today = moment().format("YYYY-MM-DD"); // Current date for today's queue and upcoming appointments

    if (!id_doctor) {
      console.error("Doctor ID is missing from authenticated user data.");
      return res
        .status(401)
        .json({ message: "ID Dokter tidak ditemukan. Harap login kembali." });
    }

    try {
      // 1. Get Today's/Upcoming Appointments
      const [upcomingAppointments] = await db.execute(
        `SELECT 
                    a.id_appointment, 
                    p.nama_lengkap AS patient_name, 
                    a.tanggal_janji, 
                    a.waktu_janji, 
                    a.catatan_pasien, 
                    a.status_janji,
                    s.nama_layanan AS service_name -- Assuming a 'services' table exists and id_service links to it
                 FROM APPOINTMENTS a
                 JOIN PROFILE p ON a.id_patient = p.id_profile
                 LEFT JOIN SERVICES s ON a.id_service = s.id_service
                 WHERE a.id_doctor = ? 
                 AND a.tanggal_janji >= ? 
                 AND a.status_janji IN ('Pending', 'Confirmed') -- Assuming 'Pending' for new appointments and 'Confirmed'
                 ORDER BY a.tanggal_janji ASC, a.waktu_janji ASC`,
        [id_doctor, today]
      );

      // 2. Get Patient Queues (Appointments for today, status 'Pending' or 'Confirmed')
      const [patientQueue] = await db.execute(
        `SELECT 
                    a.id_appointment, 
                    p.nama_lengkap AS patient_name, 
                    a.waktu_janji, 
                    a.status_janji,
                    s.nama_layanan AS service_name
                 FROM APPOINTMENTS a
                 JOIN PROFILE p ON a.id_patient = p.id_profile
                 LEFT JOIN SERVICES s ON a.id_service = s.id_service
                 WHERE a.id_doctor = ? 
                 AND a.tanggal_janji = ? 
                 AND a.status_janji IN ('Pending', 'Confirmed')
                 ORDER BY a.waktu_janji ASC`,
        [id_doctor, today]
      );

      // 3. Get Private Practice Schedule
      // This assumes doctor_schedules uses hari_dalam_minggu (day of the week)
      const [doctorSchedule] = await db.execute(
        `SELECT 
                    id_schedule, 
                    hari_dalam_minggu, 
                    waktu_mulai, 
                    waktu_selesai, 
                    is_available
                 FROM DOCTOR_SCHEDULES
                 WHERE id_doctor = ?
                 ORDER BY FIELD(hari_dalam_minggu, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), waktu_mulai ASC`,
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

  // Get Doctor's Own Profile Details
  getDoctorProfile: async (req, res) => {
    const id_user = req.user.id_user;
    const id_doctor = req.user.id_doctor;
    const id_profile_user = req.user.id_profile; // The profile ID linked to the user table

    if (!id_user || !id_doctor || !id_profile_user) {
      return res
        .status(401)
        .json({ message: "Informasi pengguna atau dokter tidak lengkap." });
    }

    try {
      // Fetch profile data from 'PROFILE' table using id_profile
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

      // Fetch doctor-specific data from 'DOCTORS' table using id_doctor
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

      // Combine and send
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

  // Update Doctor's Own Profile Details
  updateDoctorProfile: async (req, res) => {
    const id_user = req.user.id_user;
    const id_doctor = req.user.id_doctor;
    const id_profile_user = req.user.id_profile; // The profile ID linked to the user table

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
      nik, // from PROFILE
      spesialisasi,
      lisensi_no,
      pengalaman_tahun,
      foto_profil_url, // from DOCTORS
    } = req.body;

    // Data for PROFILE table
    const profileDataToUpdate = {
      nama_lengkap: nama_lengkap,
      email: email,
      no_telepon: no_telepon,
      tanggal_lahir: tanggal_lahir,
      jenis_kelamin: jenis_kelamin,
      alamat: alamat,
      nik: nik,
    };

    // Data for DOCTORS table
    const doctorDataToUpdate = {
      spesialisasi: spesialisasi,
      lisensi_no: lisensi_no,
      pengalaman_tahun: pengalaman_tahun,
      foto_profil_url: foto_profil_url,
    };

    try {
      // Use the comprehensive update method from userModel
      const updateResult = await User.updateFullDoctorDetails(
        id_user,
        id_profile_user,
        id_doctor,
        {}, // No direct update to USERS table via this route (username, password etc.)
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

  // Get Appointment Details and Patient Medical History for Examination Module
  getAppointmentForExamination: async (req, res) => {
    const { id_appointment } = req.params;
    const id_doctor = req.user.id_doctor;

    if (!id_doctor || !id_appointment) {
      return res
        .status(400)
        .json({ message: "ID Dokter atau ID Janji Temu tidak ditemukan." });
    }

    try {
      // Fetch appointment details along with patient's profile data
      const [appointmentDetails] = await db.execute(
        `SELECT 
                    a.id_appointment, a.tanggal_janji, a.waktu_janji, a.catatan_pasien, a.status_janji, a.id_service,
                    p.id_profile, p.nama_lengkap AS patient_name, p.tanggal_lahir, p.jenis_kelamin, p.no_telepon, p.email, p.nik, p.alamat
                 FROM APPOINTMENTS a
                 JOIN PROFILE p ON a.id_patient = p.id_profile
                 WHERE a.id_appointment = ? AND a.id_doctor = ?`,
        [id_appointment, id_doctor]
      );

      if (appointmentDetails.length === 0) {
        return res.status(404).json({
          message: "Janji temu tidak ditemukan atau bukan milik dokter ini.",
        });
      }

      const appointment = appointmentDetails[0];

      // Fetch patient's past dental medical history
      // We need to fetch records linked to this patient's profile ID
      const [medicalHistory] = await db.execute(
        `SELECT 
                    dm.id_record, 
                    dm.examination_date, 
                    dm.chief_complaint, 
                    dm.dental_examination_findings,
                    dm.diagnosis, 
                    dm.treatment_plan, 
                    dm.actions_taken, 
                    dm.doctor_notes,
                    doc_profile.nama_lengkap AS examining_doctor_name, -- Get examining doctor's name
                    s.nama_layanan AS service_name -- Service name for the historical record
                 FROM DENTAL_MEDICAL_RECORDS dm
                 JOIN DOCTORS doc ON dm.id_doctor = doc.id_doctor
                 JOIN PROFILE doc_profile ON doc.id_user = doc_profile.id_user -- Join to get the doctor's name from profile
                 LEFT JOIN APPOINTMENTS a_hist ON dm.id_appointment = a_hist.id_appointment -- Join to get service info for historical records
                 LEFT JOIN SERVICES s ON a_hist.id_service = s.id_service -- Assuming 'services' table exists
                 WHERE dm.id_profile = ? 
                 AND dm.id_appointment != ? -- Exclude the current appointment's record if it already exists (for re-editing)
                 ORDER BY dm.examination_date DESC`,
        [appointment.id_profile, id_appointment]
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

  // Save Examination Result and Update Appointment Status
  saveExaminationResult: async (req, res) => {
    const { id_appointment } = req.params;
    const id_doctor = req.user.id_doctor;
    const id_profile = req.body.id_profile; // Patient's id_profile from frontend form

    const {
      chief_complaint,
      dental_examination_findings,
      diagnosis,
      treatment_plan,
      actions_taken,
      doctor_notes,
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

    const connection = await db.getConnection(); // Get a connection for transaction

    try {
      await connection.beginTransaction();

      // 1. Verify that the appointment exists and belongs to this doctor and patient
      const [apptCheck] = await connection.execute(
        `SELECT id_appointment FROM APPOINTMENTS 
                 WHERE id_appointment = ? AND id_doctor = ? AND id_patient = ?`,
        [id_appointment, id_doctor, id_profile]
      );

      if (apptCheck.length === 0) {
        await connection.rollback();
        return res.status(403).json({
          message:
            "Janji temu tidak valid atau tidak terkait dengan dokter dan pasien ini.",
        });
      }

      // 2. Check if a medical record for this appointment already exists
      const [existingRecord] = await connection.execute(
        "SELECT id_record FROM DENTAL_MEDICAL_RECORDS WHERE id_appointment = ?",
        [id_appointment]
      );

      const examinationData = {
        id_appointment,
        id_profile, // Patient's profile ID
        id_doctor,
        examination_date: moment().format("YYYY-MM-DD HH:mm:ss"), // Current timestamp
        chief_complaint,
        dental_examination_findings,
        diagnosis,
        treatment_plan,
        actions_taken,
        doctor_notes,
      };

      if (existingRecord.length > 0) {
        // Update existing record
        await connection.execute(
          `UPDATE DENTAL_MEDICAL_RECORDS
                     SET chief_complaint = ?, dental_examination_findings = ?, diagnosis = ?, treatment_plan = ?,
                         actions_taken = ?, doctor_notes = ?, examination_date = ?
                     WHERE id_record = ?`,
          [
            examinationData.chief_complaint,
            examinationData.dental_examination_findings,
            examinationData.diagnosis,
            examinationData.treatment_plan,
            examinationData.actions_taken,
            examinationData.doctor_notes,
            examinationData.examination_date,
            existingRecord[0].id_record,
          ]
        );
      } else {
        // Insert new record
        await connection.execute(
          `INSERT INTO DENTAL_MEDICAL_RECORDS (id_appointment, id_profile, id_doctor, examination_date,
                                                        chief_complaint, dental_examination_findings, diagnosis,
                                                        treatment_plan, actions_taken, doctor_notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            examinationData.id_appointment,
            examinationData.id_profile,
            examinationData.id_doctor,
            examinationData.examination_date,
            examinationData.chief_complaint,
            examinationData.dental_examination_findings,
            examinationData.diagnosis,
            examinationData.treatment_plan,
            examinationData.actions_taken,
            examinationData.doctor_notes,
          ]
        );
      }

      // 3. Update appointment status to 'Examined'
      await connection.execute(
        `UPDATE APPOINTMENTS
                 SET status_janji = 'Examined'
                 WHERE id_appointment = ?`,
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
      connection.release(); // Release the connection back to the pool
    }
  },

  // Manage Doctor's Schedule (Add or Update)
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
        // Update existing schedule entry
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
        // Insert new schedule entry
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
