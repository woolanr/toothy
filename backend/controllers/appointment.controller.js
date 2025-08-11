const pool = require("../config/database");
const { sendAppointmentConfirmationEmail } = require("../utils/email");
const asyncHandler = require("express-async-handler");
const moment = require("moment");

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { status_janji } = req.body;
  const { id } = req.params;

  const [currentAppointment] = await pool.query(
    "SELECT status_janji FROM appointments WHERE id_appointment = ?",
    [id]
  );

  if (!currentAppointment || currentAppointment.length === 0) {
    return res.status(404).json({ message: "Janji temu tidak ditemukan" });
  }
  const previousStatus = currentAppointment[0].status_janji;

  await pool.query(
    "UPDATE appointments SET status_janji = ? WHERE id_appointment = ?",
    [status_janji, id]
  );

  if (
    status_janji.toLowerCase() === "confirmed" &&
    previousStatus.toLowerCase() !== "confirmed"
  ) {
    const [detailsResult] = await pool.query(
      `SELECT 
         a.id_patient,
         a.tanggal_janji,
         a.waktu_janji,
         a.catatan_pasien,
         p_patient.nama_lengkap AS patientName,
         p_patient.email AS patientEmail,
         p_doctor.nama_lengkap AS doctorName
       FROM appointments a
       JOIN USERS u_patient ON a.id_patient = u_patient.id_user
       JOIN PROFILE p_patient ON u_patient.id_profile = p_patient.id_profile
       JOIN DOCTORS d ON a.id_doctor = d.id_doctor
       JOIN USERS u_doctor ON d.id_user = u_doctor.id_user
       JOIN PROFILE p_doctor ON u_doctor.id_profile = p_doctor.id_profile
       WHERE a.id_appointment = ?`,
      [id]
    );

    if (detailsResult.length > 0) {
      const details = detailsResult[0];

      const notifTitle = "Janji Temu Dikonfirmasi";
      const notifMessage = `Kabar baik! Janji temu Anda dengan dr. ${
        details.doctorName
      } pada tanggal ${moment(details.tanggal_janji).format(
        "DD MMMM YYYY"
      )} telah dikonfirmasi.`;

      await pool.query(
        `INSERT INTO NOTIFICATIONS (id_user, title, message) VALUES (?, ?, ?)`,
        [details.id_patient, notifTitle, notifMessage]
      );

      sendAppointmentConfirmationEmail({
        to: details.patientEmail,
        appointmentDetails: {
          patientName: details.patientName,
          doctorName: details.doctorName,
          tanggal_janji: details.tanggal_janji,
          waktu_janji: details.waktu_janji,
          catatan_pasien: details.catatan_pasien,
        },
      });
    }
  }

  res.status(200).json({ message: "Status janji temu berhasil diperbarui." });
});

module.exports = {
  updateAppointmentStatus,
};
