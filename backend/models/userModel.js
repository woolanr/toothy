// backend/models/userModel.js
const db = require("../config/database"); // Ini adalah Promise Pool dari mysql2/promise

const User = {
  // --- FUNGSI AUTHENTIKASI UTAMA ---
  findByUsername: async (username) => {
    const [rows] = await db.execute("SELECT * FROM USERS WHERE username = ?", [
      username,
    ]);
    return rows; // Mengembalikan array
  },
  findByEmail: async (email) => {
    const [rows] = await db.execute("SELECT * FROM USERS WHERE email = ?", [
      email,
    ]);
    return rows;
  },
  findById: async (id_user) => {
    const query = `
        SELECT 
            u.id_user, 
                u.username, 
                u.email, 
                u.id_level_user, 
                u.id_status_valid,
                u.id_profile,
                p.nama_lengkap, 
                p.jenis_kelamin, 
                p.tanggal_lahir, 
                p.alamat, 
                p.no_telepon
            FROM USERS u 
            LEFT JOIN PROFILE p ON u.id_profile = p.id_profile 
            WHERE u.id_user = ?
        `;
    const [rows] = await db.execute(query, [id_user]);
    return rows.length > 0 ? rows[0] : null;
  },

  // --- FUNGSI UTAMA: CREATE USER DAN PROFILE DALAM SATU TRANSAKSI ---
  createFullUser: async (data) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Insert ke tabel PROFILE
      const profileData = {
        nama_lengkap: data.nama_lengkap,
        email: data.email,
        // Tambahkan kolom lain dari tabel PROFILE yang relevan di sini jika ada di form registrasi
        // Misalnya: nik, alamat, no_telepon, id_divisi (jika tidak null)
      };
      const [profileResult] = await connection.execute(
        "INSERT INTO PROFILE (nama_lengkap, email) VALUES (?, ?)", // <-- PERBAIKAN DI SINI
        [profileData.nama_lengkap, profileData.email] // <-- Pastikan urutan nilai sesuai kolom
      );
      const newProfileId = profileResult.insertId;

      // 2. Insert ke tabel USERS
      const userFields = [
        "username",
        "email",
        "password",
        "id_profile",
        "id_level_user",
        "id_status_valid",
        "verification_token",
        "verification_expires",
      ];
      const userValues = [
        data.username,
        data.email,
        data.password,
        newProfileId,
        data.id_level_user,
        data.id_status_valid,
        data.verification_token,
        data.verification_expires,
      ];

      const [userResult] = await connection.execute(
        `INSERT INTO USERS (${userFields.join(", ")}) VALUES (${userFields
          .map(() => "?")
          .join(", ")})`,
        userValues
      );
      const newUserId = userResult.insertId;

      await connection.commit(); // Komit transaksi
      return { newUserId, newProfileId };
    } catch (error) {
      await connection.rollback(); // Rollback jika ada error
      console.error("Transaction failed in createFullUser (SQL Error):", error); // Lebih spesifik lognya
      throw error;
    } finally {
      connection.release();
    }
  },

  updateFullDoctorDetails: async (
    userId,
    profileId,
    doctorId,
    userDataToUpdate,
    profileDataToUpdate,
    doctorSpecificDataToUpdate
  ) => {
    const connection = await db.getConnection();
    console.log(
      `userModel: updateFullDoctorDetails called for userId: ${userId}, profileId: ${profileId}, doctorId: ${doctorId}`
    );
    console.log("Data to update USERS:", userDataToUpdate);
    console.log("Data to update PROFILE:", profileDataToUpdate);
    console.log("Data to update DOCTORS:", doctorSpecificDataToUpdate);

    try {
      await connection.beginTransaction();

      // 1. Update tabel USERS
      // Hanya update jika ada data di userDataToUpdate
      if (Object.keys(userDataToUpdate).length > 0) {
        // Buat SET clause secara dinamis (contoh sederhana)
        let userSetClauses = [];
        let userValues = [];
        for (const key in userDataToUpdate) {
          if (userDataToUpdate[key] !== undefined) {
            // Pastikan nilai tidak undefined
            userSetClauses.push(`${key} = ?`);
            userValues.push(userDataToUpdate[key]);
          }
        }
        if (userSetClauses.length > 0) {
          userValues.push(userId); // Tambahkan userId untuk WHERE clause
          const userSql = `UPDATE USERS SET ${userSetClauses.join(
            ", "
          )} WHERE id_user = ?`;
          await connection.execute(userSql, userValues);
          console.log(`userModel: USERS table updated for id_user: ${userId}`);
        }
      }

      // 2. Update tabel PROFILE
      // Hanya update jika ada data di profileDataToUpdate dan profileId valid
      if (profileId && Object.keys(profileDataToUpdate).length > 0) {
        let profileSetClauses = [];
        let profileValues = [];
        for (const key in profileDataToUpdate) {
          if (profileDataToUpdate[key] !== undefined) {
            profileSetClauses.push(`${key} = ?`);
            profileValues.push(profileDataToUpdate[key]);
          }
        }
        if (profileSetClauses.length > 0) {
          profileValues.push(profileId); // Tambahkan profileId untuk WHERE clause
          const profileSql = `UPDATE PROFILE SET ${profileSetClauses.join(
            ", "
          )} WHERE id_profile = ?`;
          await connection.execute(profileSql, profileValues);
          console.log(
            `userModel: PROFILE table updated for id_profile: ${profileId}`
          );
        }
      } else if (!profileId && Object.keys(profileDataToUpdate).length > 0) {
        // Kasus jika dokter ini belum punya profile (seharusnya tidak terjadi jika createFullDoctorWithDetails benar)
        // Kamu bisa memilih untuk membuat profile baru di sini atau mengabaikannya.
        // Untuk sekarang, kita asumsikan profileId selalu ada untuk dokter yang diedit.
        console.warn(
          `userModel: profileId is missing for userId: ${userId}, cannot update profile.`
        );
      }

      // 3. Update tabel DOCTORS
      // Hanya update jika ada data di doctorSpecificDataToUpdate
      if (Object.keys(doctorSpecificDataToUpdate).length > 0) {
        let doctorSetClauses = [];
        let doctorValues = [];
        for (const key in doctorSpecificDataToUpdate) {
          if (doctorSpecificDataToUpdate[key] !== undefined) {
            doctorSetClauses.push(`${key} = ?`);
            doctorValues.push(doctorSpecificDataToUpdate[key]);
          }
        }
        if (doctorSetClauses.length > 0) {
          doctorValues.push(doctorId); // Tambahkan doctorId untuk WHERE clause
          const doctorSql = `UPDATE DOCTORS SET ${doctorSetClauses.join(
            ", "
          )} WHERE id_doctor = ?`;
          await connection.execute(doctorSql, doctorValues);
          console.log(
            `userModel: DOCTORS table updated for id_doctor: ${doctorId}`
          );
        }
      }

      await connection.commit();
      console.log(
        "userModel: Transaction committed successfully for doctor update."
      );
      return { success: true, message: "Data dokter berhasil diupdate." };
    } catch (error) {
      await connection.rollback();
      console.error(
        "userModel: Transaction failed in updateFullDoctorDetails:",
        error
      );
      throw error;
    } finally {
      connection.release();
      console.log(
        "userModel: Connection released after doctor update attempt."
      );
    }
  },

  // START: METHOD BARU UNTUK MEMBUAT DOKTER LENGKAP (USER, PROFILE, DOCTOR)
  createFullDoctorWithDetails: async (doctorData) => {
    const connection = await db.getConnection();
    console.log(
      "userModel: createFullDoctorWithDetails called with data:",
      doctorData
    );

    try {
      await connection.beginTransaction();

      // 1. Insert ke tabel PROFILE
      // Field yang kamu kirim dari controller untuk profile: nama_lengkap, email, no_telepon
      // Pastikan tabel PROFILE kamu punya kolom-kolom ini.
      const profileSql =
        "INSERT INTO PROFILE (nama_lengkap, email, no_telepon) VALUES (?, ?, ?)";
      const profileValues = [
        doctorData.nama_lengkap,
        doctorData.email,
        doctorData.no_telepon, // Bisa NULL jika opsional dan diizinkan di DB
      ];
      const [profileResult] = await connection.execute(
        profileSql,
        profileValues
      );
      const newProfileId = profileResult.insertId;
      console.log("userModel: Profile created with ID:", newProfileId);

      // 2. Insert ke tabel USERS
      // Field yang dibutuhkan: username, email, password (sudah di-hash), id_profile, id_level_user, id_status_valid
      // Kolom lain seperti verification_token dll di-set NULL karena admin yang buat
      const userSql =
        "INSERT INTO USERS (username, email, password, id_profile, id_level_user, id_status_valid, verification_token, verification_expires, reset_password_token, reset_password_expires) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)";
      const userValues = [
        doctorData.username,
        doctorData.email,
        doctorData.password, // Password sudah di-hash di controller
        newProfileId, // FK ke profile yang baru dibuat
        doctorData.id_level_user, // Seharusnya 2 (Dokter), dari controller
        doctorData.id_status_valid, // Seharusnya 1 (Valid), dari controller
      ];
      const [userResult] = await connection.execute(userSql, userValues);
      const newUserId = userResult.insertId;
      console.log(
        "userModel: User (doctor account) created with ID:",
        newUserId
      );

      // 3. Insert ke tabel DOCTORS
      // Field yang dibutuhkan: id_user, spesialisasi, lisensi_no, pengalaman_tahun
      const doctorSql =
        "INSERT INTO DOCTORS (id_user, spesialisasi, lisensi_no, pengalaman_tahun) VALUES (?, ?, ?, ?)";
      const doctorSpecificValues = [
        newUserId, // id_user dari user yang baru saja dibuat
        doctorData.spesialisasi,
        doctorData.lisensi_no,
        doctorData.pengalaman_tahun,
      ];
      const [doctorResult] = await connection.execute(
        doctorSql,
        doctorSpecificValues
      );
      const newDoctorId = doctorResult.insertId;
      console.log(
        "userModel: Doctor details created with ID (doctors table PK):",
        newDoctorId
      );

      await connection.commit();
      console.log("userModel: Transaction committed successfully.");

      return { newUserId, newProfileId, newDoctorId };
    } catch (error) {
      await connection.rollback();
      console.error(
        "userModel: Transaction failed in createFullDoctorWithDetails:",
        error
      );
      throw error;
    } finally {
      connection.release();
      console.log("userModel: Connection released.");
    }
  },

  softDeleteDoctorByDoctorId: async (doctorId) => {
    console.log(
      `userModel: softDeleteDoctorByDoctorId called for doctorId: ${doctorId}`
    );
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Cari id_user dari tabel doctors berdasarkan id_doctor
      const [doctorRows] = await connection.execute(
        "SELECT id_user FROM DOCTORS WHERE id_doctor = ?",
        [doctorId]
      );

      if (doctorRows.length === 0) {
        console.log(
          `userModel: No doctor found with id_doctor: ${doctorId}. No user to deactivate.`
        );
        await connection.rollback(); // Tidak perlu commit jika tidak ada yang diubah
        return { affectedRows: 0 }; // Kembalikan 0 baris terpengaruh
      }
      const userIdToDeactivate = doctorRows[0].id_user;
      console.log(
        `userModel: Found userId: ${userIdToDeactivate} for doctorId: ${doctorId}`
      );

      // 2. Update id_status_valid di tabel USERS menjadi 3 (atau status nonaktifmu)
      const statusNonaktif = 3; // Asumsi 3 adalah status nonaktif/keluar
      const [updateResult] = await connection.execute(
        "UPDATE USERS SET id_status_valid = ? WHERE id_user = ? AND id_status_valid != ?", // Tambahkan pengecekan agar tidak update jika sudah nonaktif
        [statusNonaktif, userIdToDeactivate, statusNonaktif]
      );

      await connection.commit();
      console.log(
        `userModel: User account (ID: ${userIdToDeactivate}) associated with doctorId: ${doctorId} has been deactivated. Affected rows by user update: ${updateResult.affectedRows}`
      );
      return updateResult; // Mengembalikan hasil operasi update (termasuk affectedRows)
    } catch (error) {
      await connection.rollback();
      console.error(
        "userModel: Transaction failed in softDeleteDoctorByDoctorId:",
        error
      );
      throw error;
    } finally {
      connection.release();
      console.log(
        "userModel: Connection released after softDeleteDoctorByDoctorId attempt."
      );
    }
  },

  deleteDoctorEntryByUserId: async (userId) => {
    console.log(
      `userModel: deleteDoctorEntryByUserId called for userId: ${userId}`
    );
    const sql = "DELETE FROM DOCTORS WHERE id_user = ?";

    try {
      const [result] = await db.execute(sql, [userId]);
      if (result.affectedRows > 0) {
        console.log(
          `   Successfully deleted doctor-specific details for user ${userId}.`
        );
      } else {
        console.log(
          `   No doctor-specific details found to delete for user ${userId}, or already deleted.`
        );
      }
      return result; // Mengembalikan hasil operasi delete
    } catch (error) {
      console.error(
        `userModel: Error deleting doctor entry for userId ${userId}:`,
        error
      );
      throw error; // Biarkan controller menangani error HTTP
    }
  },

  // --- FUNGSI VERIFIKASI & RESET TOKEN (Diubah ke async/await) ---
  updateStatusValid: async (id_user, id_status_valid) => {
    const [result] = await db.execute(
      "UPDATE USERS SET id_status_valid = ? WHERE id_user = ?",
      [id_status_valid, id_user]
    );
    return result;
  },

  findByVerificationToken: async (token) => {
    const [rows] = await db.execute(
      "SELECT * FROM USERS WHERE verification_token = ? AND verification_expires > NOW()",
      [token]
    );
    return rows;
  },

  clearVerificationToken: async (id_user) => {
    const [result] = await db.execute(
      "UPDATE USERS SET verification_token = NULL, verification_expires = NULL WHERE id_user = ?",
      [id_user]
    );
    return result;
  },

  // --- FUNGSI UNTUK KIRIM ULANG VERIFIKASI (Diubah ke async/await) ---
  updateVerificationToken: async (id_user, newToken, newExpires) => {
    const [result] = await db.execute(
      "UPDATE USERS SET verification_token = ?, verification_expires = ? WHERE id_user = ?",
      [newToken, newExpires, id_user]
    );
    return result;
  },

  // --- FUNGSI RESET PASSWORD (Diubah ke async/await) ---
  saveResetToken: async (id_user, token, expires) => {
    const [result] = await db.execute(
      "UPDATE USERS SET reset_password_token = ?, reset_password_expires = ? WHERE id_user = ?",
      [token, expires, id_user]
    );
    return result;
  },

  findByResetToken: async (token) => {
    const [rows] = await db.execute(
      "SELECT * FROM USERS WHERE reset_password_token = ? AND reset_password_expires > NOW()",
      [token]
    );
    return rows;
  },

  updatePassword: async (id_user, hashedPassword) => {
    const [result] = await db.execute(
      "UPDATE USERS SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id_user = ?",
      [hashedPassword, id_user]
    );
    return result;
  },

  clearResetToken: async (id_user) => {
    const [result] = await db.execute(
      "UPDATE USERS SET reset_password_token = NULL, reset_password_expires = NULL WHERE id_user = ?",
      [id_user]
    );
    return result;
  },

  // --- FUNGSI DOKTER DAN LAYANAN ---
  findDoctorById: async (id_doctor) => {
    const query = `
            SELECT 
                d.id_doctor, d.id_user, d.spesialisasi, d.lisensi_no, d.pengalaman_tahun, d.foto_profil_url, d.rating_rata2,
                u.username, u.email, u.id_profile,
                p.nama_lengkap, p.no_telepon 
            FROM DOCTORS d 
            JOIN USERS u ON d.id_user = u.id_user 
            JOIN PROFILE p ON u.id_profile = p.id_profile 
            WHERE d.id_doctor = ?
        `;
    const [rows] = await db.execute(query, [id_doctor]);
    return rows.length > 0 ? rows[0] : null;
  },

  findAllDoctors: async () => {
    const [rows] = await db.execute(
      "SELECT d.*, u.username, u.email, p.nama_lengkap, p.no_telepon FROM DOCTORS d JOIN USERS u ON d.id_user = u.id_user JOIN PROFILE p ON u.id_profile = p.id_profile WHERE u.id_level_user = 2 AND u.id_status_valid = 1"
    ); // Saya tambahkan filter dokter aktif
    return rows;
  },

  findAllDoctorsWithDetails: async () => {
    console.log("userModel: findAllDoctorsWithDetails called."); // Tambahkan log untuk memastikan
    const query = `
            SELECT 
                d.id_doctor,
                u.id_user,
                u.username,
                u.nama_lengkap,
                u.email,
                u.no_telp, 
                d.spesialisasi,
                d.lisensi_no,
                d.pengalaman_tahun
            FROM 
                doctors d
            JOIN 
                users u ON d.id_user = u.id_user
            WHERE 
                u.id_level_user = 2 
                AND u.id_status_valid = 1; 
        `;
    try {
      const [rows] = await db.execute(query);
      return rows;
    } catch (error) {
      console.error("Error in User.findAllDoctorsWithDetails model:", error);
      throw error;
    }
  },

  findDoctorRecordByUserId: async (userId) => {
    console.log(
      `userModel: findDoctorRecordByUserId called for userId: ${userId}`
    );
    const query = "SELECT id_doctor FROM DOCTORS WHERE id_user = ?";
    const [rows] = await db.execute(query, [userId]);
    return rows.length > 0 ? rows[0] : null;
  },

  updateDoctorDetails: async (doctorId, doctorData) => {
    console.log(
      `userModel: updateDoctorDetails called for doctorId: ${doctorId} with data:`,
      doctorData
    );
    if (!doctorId || Object.keys(doctorData).length === 0) {
      console.log("userModel: No doctorId or data to update doctor details.");
      return { affectedRows: 0 };
    }
    let setClauses = [];
    let values = [];
    for (const key in doctorData) {
      if (doctorData[key] !== undefined) {
        setClauses.push(`${key} = ?`);
        values.push(doctorData[key]);
      }
    }
    if (setClauses.length === 0) return { affectedRows: 0 };
    values.push(doctorId);
    const sql = `UPDATE DOCTORS SET ${setClauses.join(
      ", "
    )} WHERE id_doctor = ?`;
    const [result] = await db.execute(sql, values);
    console.log(
      `userModel: DOCTORS table updated for id_doctor: ${doctorId}, affected rows: ${result.affectedRows}`
    );
    return result;
  },

  // Method untuk membuat entri baru di tabel DOCTORS untuk user yang sudah ada
  createDoctorEntryForUser: async (userId, doctorData) => {
    console.log(
      `userModel: createDoctorEntryForUser called for userId: ${userId} with data:`,
      doctorData
    );
    const { spesialisasi, lisensi_no, pengalaman_tahun } = doctorData;
    const sql =
      "INSERT INTO DOCTORS (id_user, spesialisasi, lisensi_no, pengalaman_tahun) VALUES (?, ?, ?, ?)";
    const values = [userId, spesialisasi, lisensi_no, pengalaman_tahun];
    const [result] = await db.execute(sql, values);
    console.log(
      `userModel: New entry in DOCTORS created for userId: ${userId}, new id_doctor: ${result.insertId}`
    );
    return result;
  },

  findAllServices: async () => {
    const [rows] = await db.execute("SELECT * FROM SERVICES");
    return rows;
  },

  // --- FUNGSI BOOKING & APPOINTMENT (Diubah ke async/await) ---
  findAvailableDoctorSchedules: async (id_doctor, date) => {
    console.log(
      "userModel: findAvailableDoctorSchedules - Executing DB query."
    );
    console.log("userModel: Query params:", [id_doctor, date, date]);
    const [rows] = await db.execute(
      `
            SELECT
                ds.id_schedule, ds.waktu_mulai, ds.waktu_selesai
            FROM DOCTOR_SCHEDULES ds
            WHERE ds.id_doctor = ?
            AND ds.hari_dalam_minggu = DAYOFWEEK(?)
            AND ds.is_available = TRUE
            AND NOT EXISTS (
                SELECT 1
                FROM APPOINTMENTS a
                JOIN SERVICES s ON a.id_service = s.id_service
                WHERE a.id_doctor = ds.id_doctor
                AND a.tanggal_janji = ?
                AND (
                    TIME_TO_SEC(a.waktu_janji) < TIME_TO_SEC(ds.waktu_selesai) 
                    AND TIME_TO_SEC(a.waktu_janji) + COALESCE(s.durasi_menit, 0) * 60 > TIME_TO_SEC(ds.waktu_mulai)
                )
            )
            ORDER BY ds.waktu_mulai ASC
        `,
      [id_doctor, date, date]
    );
    console.log(
      "userModel: findAvailableDoctorSchedules - DB query results:",
      rows
    );
    return rows;
  },

  createAppointment: async (appointmentData) => {
    const [result] = await db.execute("INSERT INTO APPOINTMENTS SET ?", [
      appointmentData,
    ]);
    return result;
  },

  findUpcomingAppointmentsByPatientId: async (id_patient) => {
    const [rows] = await db.execute(
      `
            SELECT 
            a.id_appointment, a.tanggal_janji, a.waktu_janji, a.status_janji, a.catatan_pasien,
            d.spesialisasi, 
            p.nama_lengkap AS doctor_name, 
            s.nama_layanan
            FROM APPOINTMENTS a
            JOIN DOCTORS d ON a.id_doctor = d.id_doctor
            JOIN USERS u_doctor ON d.id_user = u_doctor.id_user
            JOIN PROFILE p ON u_doctor.id_profile = p.id_profile
            JOIN SERVICES s ON a.id_service = s.id_service
            WHERE a.id_patient = ? 
            AND a.tanggal_janji >= CURDATE()
            AND a.status_janji IN ('Pending', 'Confirmed', 'Rescheduled')
            ORDER BY a.tanggal_janji ASC, a.waktu_janji ASC
            `,
      [id_patient]
    );
    return rows;
  },

  findPastAppointmentsByPatientId: async (id_patient) => {
    const [rows] = await db.execute(
      `
            SELECT 
                a.id_appointment, a.tanggal_janji, a.waktu_janji, a.status_janji, a.catatan_pasien,
                d.spesialisasi, 
                p.nama_lengkap AS doctor_name, 
                s.nama_layanan
            FROM APPOINTMENTS a
            JOIN DOCTORS d ON a.id_doctor = d.id_doctor
            JOIN USERS u_doctor ON d.id_user = u_doctor.id_user
            JOIN PROFILE p ON u_doctor.id_profile = p.id_profile
            JOIN SERVICES s ON a.id_service = s.id_service
            WHERE a.id_patient = ? 
            AND (a.tanggal_janji < CURDATE() OR a.status_janji IN ('Completed', 'Cancelled'))
            ORDER BY a.tanggal_janji DESC, a.waktu_janji DESC
            `,
      [id_patient]
    );
    return rows;
  },

  // --- FUNGSI PENGELOLAAN USER (Diubah ke async/await) ---
  findAll: async () => {
    console.log("userModel: findAll - Executing DB query for all users.");
    const [rows] = await db.execute(
      "SELECT u.id_user, u.username, u.email, u.id_level_user, u.id_status_valid, p.id_profile, p.nama_lengkap, p.jenis_kelamin, p.tanggal_lahir, p.alamat, p.no_telepon FROM USERS u LEFT JOIN PROFILE p ON u.id_profile = p.id_profile"
    );
    console.log("userModel: findAll - DB query results:", rows);
    console.log(
      "userModel: findAll - DB query results length:",
      rows ? rows.length : 0
    );
    return rows;
  },

  updateUser: async (id_user, userDataToUpdate) => {
    console.log(
      `userModel: updateUser called for id_user: ${id_user} with data:`,
      userDataToUpdate
    );

    // Pastikan ada data untuk diupdate
    if (Object.keys(userDataToUpdate).length === 0) {
      console.log("userModel: No data provided to update for user:", id_user);
      return { affectedRows: 0, message: "Tidak ada data yang diupdate." }; // Tidak ada yang diupdate
    }

    // Buat SET clause secara dinamis
    let setClauses = [];
    let values = [];

    for (const key in userDataToUpdate) {
      // Pastikan hanya field yang valid untuk tabel USERS yang dimasukkan
      // dan nilainya tidak undefined
      if (
        userDataToUpdate[key] !==
        undefined /* && kamu bisa tambahkan validasi nama kolom di sini jika perlu */
      ) {
        setClauses.push(`${key} = ?`);
        values.push(userDataToUpdate[key]);
      }
    }

    if (setClauses.length === 0) {
      console.log("userModel: No valid fields to update for user:", id_user);
      return {
        affectedRows: 0,
        message: "Tidak ada field valid yang diupdate.",
      };
    }

    values.push(id_user); // Tambahkan id_user untuk WHERE clause

    const sql = `UPDATE USERS SET ${setClauses.join(", ")} WHERE id_user = ?`;
    console.log("userModel: Executing SQL:", sql, "with values:", values);

    try {
      const [result] = await db.execute(sql, values);
      console.log(
        "userModel: updateUser successful, affected rows:",
        result.affectedRows
      );
      return result;
    } catch (error) {
      console.error(
        `userModel: Error updating user with id_user ${id_user}:`,
        error
      );
      throw error; // Biarkan controller menangani error HTTP
    }
  },

  updateProfile: async (id_profile, profileDataToUpdate) => {
    console.log(
      `userModel: updateProfile called for id_profile: ${id_profile} with data:`,
      profileDataToUpdate
    );

    // Pastikan ada data untuk diupdate dan id_profile valid
    if (!id_profile || Object.keys(profileDataToUpdate).length === 0) {
      console.log(
        "userModel: No data or id_profile provided to update profile."
      );
      // Kamu bisa throw error atau return indikasi tidak ada update
      // Untuk konsistensi dengan updateUser, kita bisa return affectedRows 0
      return {
        affectedRows: 0,
        message: "Tidak ada data profil atau ID profil yang diupdate.",
      };
    }

    let setClauses = [];
    let values = [];

    // Bangun SET clause secara dinamis untuk field yang ada di profileDataToUpdate
    // Pastikan key di profileDataToUpdate sesuai dengan nama kolom di tabel PROFILE
    for (const key in profileDataToUpdate) {
      if (profileDataToUpdate[key] !== undefined) {
        // Hanya update jika ada nilainya
        setClauses.push(`${key} = ?`);
        values.push(profileDataToUpdate[key]);
      }
    }

    if (setClauses.length === 0) {
      console.log(
        "userModel: No valid fields to update for profile:",
        id_profile
      );
      return {
        affectedRows: 0,
        message: "Tidak ada field profil valid yang diupdate.",
      };
    }

    values.push(id_profile); // Tambahkan id_profile untuk WHERE clause

    const sql = `UPDATE PROFILE SET ${setClauses.join(
      ", "
    )} WHERE id_profile = ?`;
    console.log(
      "userModel: Executing SQL for profile update:",
      sql,
      "with values:",
      values
    );

    try {
      const [result] = await db.execute(sql, values);
      console.log(
        "userModel: updateProfile successful, affected rows:",
        result.affectedRows
      );
      return result;
    } catch (error) {
      console.error(
        `userModel: Error updating profile with id_profile ${id_profile}:`,
        error
      );
      throw error; // Biarkan controller menangani error HTTP
    }
  },
};

module.exports = User;
