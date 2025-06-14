// backend/controllers/authController.js
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/userModel");
const { sendVerificationEmail } = require("../utils/email");
const jwt = require("jsonwebtoken");
const config = require("../config/config");

const authController = {
  register: async (req, res) => {
    console.log("Register function started.");
    const { nama_lengkap, email, username, password } = req.body;
    let id_level_user = req.body.id_level_user || 4;

    id_level_user = parseInt(id_level_user);

    if (!nama_lengkap || !email || !username || !password) {
      console.log("Validation failed: Missing fields.");
      return res.status(400).json({ message: "Semua kolom harus diisi." });
    }
    if (!username.trim() || !password.trim()) {
      console.log("Validation failed: Username/password empty.");
      return res
        .status(400)
        .json({ message: "Username dan password tidak boleh kosong." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log("Validation failed: Invalid email format.");
      return res.status(400).json({ message: "Format email tidak valid." });
    }

    try {
      console.log("Checking existing username and email...");
      const existingUserByUsername = await User.findByUsername(username);
      if (existingUserByUsername.length > 0) {
        console.log("Username already exists.");
        return res.status(409).json({ message: "Username sudah terdaftar." });
      }

      const existingUserByEmail = await User.findByEmail(email);
      if (existingUserByEmail.length > 0) {
        console.log("Email already exists.");
        return res.status(409).json({ message: "Email sudah terdaftar." });
      }

      console.log("Hashing password...");
      const hashedPassword = await bcrypt.hash(password, 10);

      const id_status_valid = id_level_user === 1 ? 1 : 2;
      const verificationToken = id_level_user !== 1 ? uuidv4() : null;
      const verificationExpires =
        id_level_user !== 1 ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

      console.log("Calling createFullUser to save user and profile...");
      const userCreationResult = await User.createFullUser({
        username,
        email,
        password: hashedPassword,
        nama_lengkap,
        id_level_user,
        id_status_valid,
        verification_token: verificationToken,
        verification_expires: verificationExpires,
      });
      console.log("createFullUser completed. Result:", userCreationResult);

      if (id_level_user !== 1) {
        console.log("Sending verification email...");
        sendVerificationEmail(email, verificationToken, "verification");
        console.log("Email sent. Rendering verification page...");
        return res.render("verification", {
          message:
            "Registrasi berhasil! Silakan periksa email Anda untuk verifikasi.",
        });
      } else {
        console.log("Admin registration successful. Sending JSON response.");
        return res.status(201).json({
          message: "Registrasi admin berhasil.",
          user: {
            id_user: userCreationResult.newUserId,
            username,
            id_level_user,
          },
        });
      }
    } catch (error) {
      console.error(
        "Error during registration (caught by try...catch):",
        error
      );
      if (error.code === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ message: "Username atau email sudah terdaftar." });
      }
      res
        .status(500)
        .json({ message: "Terjadi kesalahan server saat registrasi." });
    }
  },

  verifyEmail: async (req, res) => {
    console.log("Verify email function started for token:", req.params.token);
    const { token } = req.params;

    if (!token) {
      console.log("Verification failed: Token not found.");
      return res.status(400).render("verification", {
        message: "Token verifikasi tidak ditemukan.",
      });
    }

    try {
      const users = await User.findByVerificationToken(token);

      if (users.length === 0) {
        console.log("Verification failed: Invalid or expired token.");
        return res.status(404).render("verification", {
          message: "Tautan verifikasi tidak valid atau sudah kadaluarsa.",
        });
      }

      const user = users[0];
      console.log("User found for verification:", user.username);

      if (
        user.verification_expires &&
        new Date() > new Date(user.verification_expires)
      ) {
        console.log("Verification failed: Token expired.");
        return res.status(400).render("verification", {
          message:
            "Tautan verifikasi sudah kadaluarsa. Mohon kirim ulang email verifikasi.",
        });
      }

      if (user.id_status_valid === 1) {
        console.log("User already verified. Redirecting to login.");
        return res.redirect("/login?verified=already");
      }

      console.log("Updating user status to valid and clearing token...");
      await User.updateStatusValid(user.id_user, 1);
      await User.clearVerificationToken(user.id_user);

      console.log("Email verified successfully. Redirecting to login.");
      res.redirect("/login?verified=true");
    } catch (error) {
      console.error("Error during email verification:", error);
      res.status(500).render("verification", {
        message: "Terjadi kesalahan server saat memverifikasi email.",
      });
    }
  },

  resendVerificationEmail: async (req, res) => {
    console.log(
      "Resend verification email request received for email:",
      req.body.email
    );
    const { email } = req.body;
    if (!email) {
      console.log("Resend failed: Email not provided.");
      return res.status(400).json({ message: "Email tidak boleh kosong." });
    }

    try {
      const users = await User.findByEmail(email);
      if (users.length === 0) {
        console.log(
          "Resend: Email not found, but returning success for security."
        );
        return res.status(200).json({
          message: "Jika email terdaftar, link verifikasi telah dikirim ulang.",
        });
      }

      const user = users[0];
      console.log("User found for resend:", user.username);

      if (user.id_status_valid === 1) {
        console.log("Resend: User already verified.");
        return res
          .status(400)
          .json({ message: "Akun Anda sudah diverifikasi. Silakan login." });
      }

      console.log("Generating new verification token for resend...");
      const newVerificationToken = uuidv4();
      const newVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      console.log("Updating verification token in DB for user:", user.id_user);
      await User.updateVerificationToken(
        user.id_user,
        newVerificationToken,
        newVerificationExpires
      );

      console.log("Sending new verification email...");
      sendVerificationEmail(user.email, newVerificationToken, "verification");

      console.log("Resend verification email successful.");
      res.status(200).json({
        message: "Link verifikasi telah berhasil dikirim ulang ke email Anda.",
      });
    } catch (error) {
      console.error("Error during resend verification email:", error);
      res.status(500).json({
        message: "Terjadi kesalahan server saat memproses permintaan.",
      });
    }
  },

  login: async (req, res) => {
    console.log("Login request received for username:", req.body.username);

    const { username, password } = req.body;

    if (!username || !password) {
      console.log("Login failed: Username/password empty.");
      return res
        .status(400)
        .json({ message: "Username dan password harus diisi." });
    }

    try {
      console.log("Fetching user from DB...");
      const users = await User.findByUsername(username);
      console.log("User fetched from DB. Users array:", users);

      if (users.length === 0) {
        console.log("Login failed: User not found.");
        return res
          .status(401)
          .json({ message: "Username atau password salah." });
      }

      const user = users[0];
      console.log(
        "User object fetched from DB:",
        user.username,
        "Status:",
        user.id_status_valid
      );

      if (user.id_status_valid !== 1) {
        console.log(
          "Login failed: User status is not valid (current status:",
          user.id_status_valid,
          ")."
        );
        if (user.id_status_valid === 3) {
          return res.status(403).json({
            message: "Akun Anda telah dinonaktifkan. Silakan hubungi admin.",
          });
        }
        return res.status(401).json({
          message: "Akun Anda belum diverifikasi. Silakan periksa email Anda.",
        });
      }

      console.log("Comparing password using bcrypt...");
      const isMatch = await bcrypt.compare(password, user.password);
      console.log("Password match status (isMatch):", isMatch);

      if (!isMatch) {
        console.log("Login failed: Password mismatch.");
        return res
          .status(401)
          .json({ message: "Username atau password salah." });
      }

      let id_doctor = null;
      if (user.id_level_user === 2) {
        const doctorRecord = await User.findDoctorRecordByUserId(user.id_user);
        if (doctorRecord) {
          id_doctor = doctorRecord.id_doctor;
        } else {
          console.warn(
            `Doctor user (id_user: ${user.id_user}) found but no corresponding entry in 'doctors' table.`
          );
          return res.status(500).json({
            message: "Doctor profile incomplete. Please contact admin.",
          });
        }
      }

      const token = jwt.sign(
        {
          id_user: user.id_user,
          id_level_user: user.id_level_user,
          username: user.username,
          id_profile: user.id_profile,
          id_doctor: id_doctor,
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      console.log("Login successful! Sending 200 OK response.");
      res.status(200).json({
        message: "Login berhasil!",
        token: token,
        user: {
          id_user: user.id_user,
          username: user.username,
          id_level_user: user.id_level_user,
        },
      });
    } catch (error) {
      console.error(
        "Error during login process (caught by try...catch):",
        error
      );
      res.status(500).json({ message: "Terjadi kesalahan server." });
    }
  },

  forgotPassword: async (req, res) => {
    console.log("Forgot password request for email:", req.body.email);
    const { email } = req.body;

    if (!email) {
      console.log("Forgot password failed: Email not provided.");
      return res.status(400).json({ message: "Email harus diisi." });
    }

    try {
      const users = await User.findByEmail(email);

      if (users.length === 0) {
        console.log(
          "Forgot password: Email not found, but returning success for security."
        );
        return res.status(200).json({
          message:
            "Jika email terdaftar, tautan reset password telah dikirim ke email Anda.",
        });
      }

      const user = users[0];
      console.log("User found for forgot password:", user.username);

      const resetToken = uuidv4();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

      console.log("Saving reset token to DB...");
      await User.saveResetToken(user.id_user, resetToken, resetExpires);

      console.log("Sending reset password email...");
      sendVerificationEmail(email, resetToken, "resetPassword");

      console.log("Reset password link sent successfully.");
      res.status(200).json({
        message: "Tautan reset password telah dikirim ke email Anda.",
      });
    } catch (error) {
      console.error("Error during forgot password:", error);
      res.status(500).json({ message: "Terjadi kesalahan server." });
    }
  },

  resetPassword: async (req, res) => {
    console.log("Reset password request for token.");
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      console.log("Reset password failed: Token or new password missing.");
      return res
        .status(400)
        .json({ message: "Token dan password baru harus diisi." });
    }

    try {
      const users = await User.findByResetToken(token);

      if (users.length === 0) {
        console.log("Reset password failed: Invalid or expired token.");
        return res.status(400).json({
          message: "Token reset password tidak valid atau sudah kadaluarsa.",
        });
      }

      const user = users[0];
      console.log("User found for reset password:", user.username);

      console.log("Hashing new password...");
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      console.log("Updating password and clearing reset token...");
      await User.updatePassword(user.id_user, hashedPassword);
      await User.clearResetToken(user.id_user);

      console.log("Password reset successfully.");
      res.status(200).json({
        message:
          "Password berhasil direset. Silakan login dengan password baru Anda.",
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res
        .status(500)
        .json({ message: "Terjadi kesalahan server saat mereset password." });
    }
  },
};

module.exports = authController;
