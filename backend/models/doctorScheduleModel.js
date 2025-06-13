// backend/models/doctorScheduleModel.js
const db = require("../config/database");

const DoctorSchedule = {
  create: async (scheduleData) => {
    const {
      id_doctor,
      hari_dalam_minggu,
      waktu_mulai,
      waktu_selesai,
      is_available = 1,
    } = scheduleData; // Default is_available ke 1 (true)
    console.log("doctorScheduleModel: create called with data:", scheduleData);

    // Validasi dasar untuk tipe data waktu (HH:MM atau HH:MM:SS)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
    if (!timeRegex.test(waktu_mulai) || !timeRegex.test(waktu_selesai)) {
      throw new Error(
        "Format waktu_mulai atau waktu_selesai tidak valid (gunakan HH:MM atau HH:MM:SS)."
      );
    }
    // Validasi hari_dalam_minggu (1-7, 1=Minggu, 2=Senin, ..., 7=Sabtu untuk MySQL DAYOFWEEK())
    const day = parseInt(hari_dalam_minggu);
    if (isNaN(day) || day < 1 || day > 7) {
      throw new Error("Nilai hari_dalam_minggu tidak valid (harus angka 1-7).");
    }

    const sql = `
            INSERT INTO DOCTOR_SCHEDULES
            (id_doctor, hari_dalam_minggu, waktu_mulai, waktu_selesai, is_available)
            VALUES (?, ?, ?, ?, ?)
        `;

    try {
      const [result] = await db.execute(sql, [
        id_doctor,
        day,
        waktu_mulai,
        waktu_selesai,
        is_available,
      ]);
      console.log(
        `doctorScheduleModel: Schedule created with ID: ${result.insertId} for doctor ID: ${id_doctor}`
      );
      return result;
    } catch (error) {
      console.error("doctorScheduleModel: Error in create schedule:", error);
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        throw new Error(`Dokter dengan ID ${id_doctor} tidak ditemukan.`);
      }
      throw error;
    }
  },

  findByDoctorId: async (doctorId) => {
    console.log(
      `doctorScheduleModel: findByDoctorId called for doctorId: ${doctorId}`
    );
    const sql = `
            SELECT id_schedule, id_doctor, hari_dalam_minggu,
                   TIME_FORMAT(waktu_mulai, '%H:%i') AS waktu_mulai,
                   TIME_FORMAT(waktu_selesai, '%H:%i') AS waktu_selesai,
                   is_available
            FROM DOCTOR_SCHEDULES
            WHERE id_doctor = ?
            ORDER BY hari_dalam_minggu ASC, waktu_mulai ASC
        `;

    try {
      const [rows] = await db.execute(sql, [doctorId]);
      console.log(
        `doctorScheduleModel: Found ${rows.length} schedules for doctor ID: ${doctorId}.`
      );
      return rows;
    } catch (error) {
      console.error(
        `doctorScheduleModel: Error in findByDoctorId for doctor ID ${doctorId}:`,
        error
      );
      throw error;
    }
  },

  findById: async (scheduleId) => {
    console.log(
      `doctorScheduleModel: findById called for scheduleId: ${scheduleId}`
    );
    const sql = `
            SELECT id_schedule, id_doctor, hari_dalam_minggu,
                   TIME_FORMAT(waktu_mulai, '%H:%i') AS waktu_mulai,
                   TIME_FORMAT(waktu_selesai, '%H:%i') AS waktu_selesai,
                   is_available
            FROM DOCTOR_SCHEDULES
            WHERE id_schedule = ?
        `;
    try {
      const [rows] = await db.execute(sql, [scheduleId]);
      if (rows.length > 0) {
        console.log(
          `doctorScheduleModel: Found schedule with ID: ${scheduleId}.`
        );
        return rows[0];
      }
      console.log(
        `doctorScheduleModel: Schedule with ID ${scheduleId} not found.`
      );
      return null;
    } catch (error) {
      console.error(
        `doctorScheduleModel: Error in findById for schedule ID ${scheduleId}:`,
        error
      );
      throw error;
    }
  },

  update: async (scheduleId, scheduleData) => {
    const {
      id_doctor,
      hari_dalam_minggu,
      waktu_mulai,
      waktu_selesai,
      is_available,
    } = scheduleData;
    console.log(
      `doctorScheduleModel: update called for scheduleId: ${scheduleId} with data:`,
      scheduleData
    );

    // Validasi waktu dan hari (opsional, bisa juga di controller)
    if (waktu_mulai && waktu_selesai) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
      if (!timeRegex.test(waktu_mulai) || !timeRegex.test(waktu_selesai)) {
        throw new Error(
          "Format waktu_mulai atau waktu_selesai tidak valid (gunakan HH:MM atau HH:MM:SS)."
        );
      }
    }
    if (hari_dalam_minggu !== undefined) {
      const day = parseInt(hari_dalam_minggu);
      if (isNaN(day) || day < 1 || day > 7) {
        throw new Error(
          "Nilai hari_dalam_minggu tidak valid (harus angka 1-7)."
        );
      }
    }

    const updates = [];
    const values = [];

    if (id_doctor !== undefined) {
      updates.push("id_doctor = ?");
      values.push(id_doctor);
    }
    if (hari_dalam_minggu !== undefined) {
      updates.push("hari_dalam_minggu = ?");
      values.push(parseInt(hari_dalam_minggu));
    }
    if (waktu_mulai !== undefined) {
      updates.push("waktu_mulai = ?");
      values.push(waktu_mulai);
    }
    if (waktu_selesai !== undefined) {
      updates.push("waktu_selesai = ?");
      values.push(waktu_selesai);
    }
    if (is_available !== undefined) {
      updates.push("is_available = ?");
      values.push(is_available ? 1 : 0);
    }

    if (updates.length === 0) {
      throw new Error("Tidak ada data yang diberikan untuk diperbarui.");
    }

    const sql = `
            UPDATE DOCTOR_SCHEDULES
            SET ${updates.join(", ")}
            WHERE id_schedule = ?
        `;
    values.push(scheduleId);

    try {
      const [result] = await db.execute(sql, values);
      console.log(
        `doctorScheduleModel: Schedule ID ${scheduleId} updated. Affected rows: ${result.affectedRows}.`
      );
      return result;
    } catch (error) {
      console.error(
        `doctorScheduleModel: Error in update schedule ID ${scheduleId}:`,
        error
      );
      if (error.code === "ER_NO_REFERENCED_ROW_2" && id_doctor !== undefined) {
        throw new Error(`Dokter dengan ID ${id_doctor} tidak ditemukan.`);
      }
      throw error;
    }
  },

  delete: async (scheduleId) => {
    console.log(
      `doctorScheduleModel: delete called for scheduleId: ${scheduleId}`
    );
    const sql = `DELETE FROM DOCTOR_SCHEDULES WHERE id_schedule = ?`;
    try {
      const [result] = await db.execute(sql, [scheduleId]);
      console.log(
        `doctorScheduleModel: Schedule ID ${scheduleId} deleted. Affected rows: ${result.affectedRows}.`
      );
      return result;
    } catch (error) {
      console.error(
        `doctorScheduleModel: Error in delete schedule ID ${scheduleId}:`,
        error
      );
      throw error;
    }
  },

  checkOverlap: async (
    id_doctor,
    hari_dalam_minggu,
    waktu_mulai,
    waktu_selesai,
    excludeScheduleId = null
  ) => {
    console.log(
      `doctorScheduleModel: checkOverlap called for doctor ${id_doctor}, day ${hari_dalam_minggu}, time ${waktu_mulai}-${waktu_selesai}, excluding ${excludeScheduleId}`
    );
    let sql = `
            SELECT COUNT(*) AS count
            FROM DOCTOR_SCHEDULES
            WHERE id_doctor = ?
            AND hari_dalam_minggu = ?
            AND (
                (waktu_mulai < ? AND waktu_selesai > ?) OR -- Existing schedule starts before new ends and ends after new starts
                (waktu_mulai >= ? AND waktu_mulai < ?) OR -- Existing schedule starts within new schedule
                (waktu_selesai > ? AND waktu_selesai <= ?) -- Existing schedule ends within new schedule
            )
            AND is_available = 1 -- Hanya cek bentrokan dengan jadwal yang aktif/tersedia
        `;
    const params = [
      id_doctor,
      hari_dalam_minggu,
      waktu_selesai,
      waktu_mulai,
      waktu_mulai,
      waktu_selesai,
      waktu_mulai,
      waktu_selesai,
    ];

    if (excludeScheduleId) {
      sql += ` AND id_schedule != ?`;
      params.push(excludeScheduleId);
    }

    try {
      const [rows] = await db.execute(sql, params);
      const hasOverlap = rows[0].count > 0;
      console.log(
        `doctorScheduleModel: Overlap check result: ${
          hasOverlap ? "Overlap found" : "No overlap"
        }`
      );
      return hasOverlap;
    } catch (error) {
      console.error("doctorScheduleModel: Error in checkOverlap:", error);
      throw error;
    }
  },
};

module.exports = DoctorSchedule;
