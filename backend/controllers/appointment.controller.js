// backend/controllers/appointment.controller.js

const pool = require("../config/database"); // Make sure this path is correct
const { sendAppointmentConfirmationEmail } = require("../utils/email"); // Import our new function
const asyncHandler = require("express-async-handler"); // Assuming you use this for error handling

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { status_janji } = req.body;
  const { id } = req.params; // This is the id_appointment from the URL

  // 1. Get current status to prevent sending emails for no reason
  const [currentAppointment] = await pool.query(
    "SELECT status_janji FROM appointments WHERE id_appointment = ?",
    [id]
  );

  if (!currentAppointment || currentAppointment.length === 0) {
    return res.status(404).json({ message: "Appointment not found" });
  }
  const previousStatus = currentAppointment[0].status_janji;

  // 2. Update the status in the database
  await pool.query(
    "UPDATE appointments SET status_janji = ? WHERE id_appointment = ?",
    [status_janji, id]
  );

  // 3. If status is now 'confirmed', send the notification
  if (status_janji === "confirmed" && previousStatus !== "confirmed") {
    // Get details for the email
    const [details] = await pool.query(
      `SELECT 
        p.username AS patientName, 
        p.email AS patientEmail, 
        d.username AS doctorName,
        a.tanggal_janji,
        a.waktu_janji,
        a.catatan_pasien
      FROM appointments a
      JOIN users p ON a.id_patient = p.id_user
      JOIN users d ON a.id_doctor = d.id_user
      WHERE a.id_appointment = ?`,
      [id]
    );

    if (details.length > 0) {
      // Call the email function with the details
      sendAppointmentConfirmationEmail({
        to: details[0].patientEmail,
        appointmentDetails: details[0],
      });
    }
  }

  res.status(200).json({ message: "Appointment status updated successfully." });
});

module.exports = {
  updateAppointmentStatus,
};
