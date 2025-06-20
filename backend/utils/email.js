// backend/utils/email.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "admhappytoothy@gmail.com",
    pass: "qlvi ttbk yvcm tspf",
  },
});

const sendVerificationEmail = (toEmail, token, type = "verification") => {
  let subject;
  let htmlContent;
  let link;

  if (type === "verification") {
    subject = "Verifikasi Email Akun Happy Toothy Anda";
    link = `http://localhost:3000/verify/${token}`;
    htmlContent = `<p>Terima kasih telah mendaftar di Happy Toothy!</p>
                       <p>Silakan klik tautan berikut untuk memverifikasi alamat email Anda:</p>
                       <a href="${link}">Verifikasi Email Saya</a>
                       <p>Jika Anda tidak merasa mendaftar, abaikan email ini.</p>`;
  } else if (type === "resetPassword") {
    subject = "Reset Password Akun Happy Toothy Anda";
    link = `http://localhost:3000/reset-password?token=${token}`;
    htmlContent = `<p>Anda menerima email ini karena Anda (atau seseorang lain) telah meminta reset password untuk akun Happy Toothy Anda.</p>
                       <p>Silakan klik tautan berikut untuk mereset password Anda:</p>
                       <a href="${link}">Reset Password Saya</a>
                       <p>Tautan ini akan kadaluarsa dalam 1 jam.</p>
                       <p>Jika Anda tidak meminta ini, silakan abaikan email ini dan password Anda tidak akan berubah.</p>`;
  } else {
    console.error("Invalid email type for sendVerificationEmail:", type);
    return;
  }

  const mailOptions = {
    from: "Happy Toothy <admhappytoothy@gmail.com>",
    to: toEmail,
    subject: subject,
    html: htmlContent,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
};

const sendAppointmentConfirmationEmail = (options) => {
  const { to, appointmentDetails } = options;

  const appointmentDate = new Date(
    appointmentDetails.tanggal_janji
  ).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = "Konfirmasi Janji Temu Anda - Happy Toothy";
  const htmlContent = `
    <h2>Konfirmasi Janji Temu Anda di Happy Toothy</h2>
    <p>Halo ${appointmentDetails.patientName},</p>
    <p>Janji temu Anda telah berhasil dikonfirmasi. Berikut adalah detailnya:</p>
    <ul>
      <li><strong>Dokter:</strong> ${appointmentDetails.doctorName}</li>
      <li><strong>Tanggal:</strong> ${appointmentDate}</li>
      <li><strong>Waktu:</strong> ${appointmentDetails.waktu_janji}</li>
      <li><strong>Catatan Anda:</strong> ${
        appointmentDetails.catatan_pasien || "-"
      }</li>
    </ul>
    <p>Mohon datang 15 menit lebih awal dari jadwal. Terima kasih!</p>
    <p><strong>Tim Happy Toothy</strong></p>
  `;

  const mailOptions = {
    from: "Happy Toothy <admhappytoothy@gmail.com>",
    to: to,
    subject: subject,
    html: htmlContent,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending appointment confirmation email:", error);
    } else {
      console.log("Appointment confirmation email sent:", info.response);
    }
  });
};

module.exports = {
  sendVerificationEmail,
  sendAppointmentConfirmationEmail,
};
