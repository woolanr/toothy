// backend/utils/email.js
const nodemailer = require('nodemailer');

// Konfigurasi transporter email (ganti dengan informasi akun email kamu)
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'admhappytoothy@gmail.com',
        pass: 'qlvi ttbk yvcm tspf'
    }
});

/**
 * Mengirim email verifikasi atau reset password.
 * @param {string} toEmail - Alamat email penerima.
 * @param {string} token - Token verifikasi atau reset.
 * @param {string} type - 'verification' atau 'resetPassword'.
 */
const sendVerificationEmail = (toEmail, token, type = 'verification') => { // Tambah parameter 'type'
    let subject;
    let htmlContent;
    let link;

    if (type === 'verification') {
        subject = 'Verifikasi Email Akun Happy Toothy Anda';
        link = `http://localhost:3000/verify/${token}`; // URL untuk verifikasi email
        htmlContent = `<p>Terima kasih telah mendaftar di Happy Toothy!</p>
                       <p>Silakan klik tautan berikut untuk memverifikasi alamat email Anda:</p>
                       <a href="${link}">Verifikasi Email Saya</a>
                       <p>Jika Anda tidak merasa mendaftar, abaikan email ini.</p>`;
    } else if (type === 'resetPassword') {
        subject = 'Reset Password Akun Happy Toothy Anda';
        link = `http://localhost:3000/reset-password?token=${token}`; // URL untuk reset password
        htmlContent = `<p>Anda menerima email ini karena Anda (atau seseorang lain) telah meminta reset password untuk akun Happy Toothy Anda.</p>
                       <p>Silakan klik tautan berikut untuk mereset password Anda:</p>
                       <a href="${link}">Reset Password Saya</a>
                       <p>Tautan ini akan kadaluarsa dalam 1 jam.</p>
                       <p>Jika Anda tidak meminta ini, silakan abaikan email ini dan password Anda tidak akan berubah.</p>`;
    } else {
        console.error('Invalid email type for sendVerificationEmail:', type);
        return; // Hentikan jika jenis email tidak valid
    }

    const mailOptions = {
        from: 'Happy Toothy <admhappytoothy@gmail.com>', // Ganti dengan nama dan alamat email kamu
        to: toEmail,
        subject: subject,
        html: htmlContent
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
};

module.exports = { sendVerificationEmail };