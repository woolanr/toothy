// backend/controllers/doctorScheduleController.js
const DoctorSchedule = require("../models/doctorScheduleModel");
const User = require("../models/userModel");

const doctorScheduleController = {
  createSchedule: async (req, res) => {
    const {
      id_doctor,
      hari_dalam_minggu,
      waktu_mulai,
      waktu_selesai,
      is_available,
    } = req.body;
    console.log(
      "doctorScheduleController: createSchedule called with body:",
      req.body
    );

    if (!id_doctor || !hari_dalam_minggu || !waktu_mulai || !waktu_selesai) {
      return res.status(400).json({
        success: false,
        message: "ID Dokter, Hari, Waktu Mulai, dan Waktu Selesai wajib diisi.",
      });
    }

    const day = parseInt(hari_dalam_minggu);
    if (isNaN(day) || day < 1 || day > 7) {
      return res.status(400).json({
        success: false,
        message: "Hari dalam minggu tidak valid (1-7).",
      });
    }
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
    if (!timeRegex.test(waktu_mulai) || !timeRegex.test(waktu_selesai)) {
      return res.status(400).json({
        success: false,
        message: "Format waktu tidak valid (HH:MM atau HH:MM:SS).",
      });
    }
    if (waktu_mulai >= waktu_selesai) {
      return res.status(400).json({
        success: false,
        message: "Waktu mulai harus sebelum waktu selesai.",
      });
    }

    try {
      const doctorExists = await User.findDoctorById(id_doctor);
      if (!doctorExists) {
        return res.status(404).json({
          success: false,
          message: `Dokter dengan ID ${id_doctor} tidak ditemukan.`,
        });
      }

      const hasOverlap = await DoctorSchedule.checkOverlap(
        id_doctor,
        day,
        waktu_mulai,
        waktu_selesai
      );
      if (hasOverlap) {
        return res.status(409).json({
          success: false,
          message:
            "Jadwal yang Anda coba tambahkan bentrok dengan jadwal yang sudah ada untuk dokter ini pada hari yang sama.",
        });
      }

      const scheduleData = {
        id_doctor: parseInt(id_doctor),
        hari_dalam_minggu: day,
        waktu_mulai,
        waktu_selesai,
        is_available:
          is_available === undefined || is_available === null
            ? 1
            : is_available
            ? 1
            : 0,
      };

      const result = await DoctorSchedule.create(scheduleData);

      res.status(201).json({
        success: true,
        message: "Jadwal dokter baru berhasil ditambahkan!",
        data: { id_schedule: result.insertId, ...scheduleData },
      });
      console.log(
        `doctorScheduleController: Schedule created with ID: ${result.insertId} for doctor ID: ${id_doctor}`
      );
    } catch (error) {
      console.error(
        "doctorScheduleController: Error in createSchedule:",
        error
      );
      if (
        error.message.includes("tidak ditemukan") ||
        error.message.includes("tidak valid")
      ) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Terjadi kesalahan server saat menambahkan jadwal dokter.",
      });
    }
  },

  getScheduleById: async (req, res) => {
    console.log("doctorScheduleController: getScheduleById called.");
    const { scheduleId } = req.params;

    if (!scheduleId) {
      return res
        .status(400)
        .json({ success: false, message: "ID Jadwal diperlukan." });
    }

    try {
      const schedule = await DoctorSchedule.findById(parseInt(scheduleId));
      if (!schedule) {
        return res
          .status(404)
          .json({ success: false, message: "Jadwal tidak ditemukan." });
      }
      res.status(200).json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      console.error(
        `doctorScheduleController: Error in getScheduleById for schedule ID ${scheduleId}:`,
        error
      );
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server saat mengambil jadwal dokter.",
      });
    }
  },

  getSchedulesByDoctorId: async (req, res) => {
    console.log("doctorScheduleController: getSchedulesByDoctorId called.");
    const doctorId = req.params.doctorId;

    if (!doctorId) {
      return res
        .status(400)
        .json({ success: false, message: "ID Dokter diperlukan." });
    }

    try {
      const schedules = await DoctorSchedule.findByDoctorId(parseInt(doctorId));
      res.status(200).json({
        success: true,
        data: schedules,
      });
      console.log(
        `doctorScheduleController: Fetched ${schedules.length} schedules for doctor ID: ${doctorId}.`
      );
    } catch (error) {
      console.error(
        `doctorScheduleController: Error in getSchedulesByDoctorId for doctor ID ${doctorId}:`,
        error
      );
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server saat mengambil jadwal dokter.",
      });
    }
  },

  updateSchedule: async (req, res) => {
    console.log("doctorScheduleController: updateSchedule called.");
    const { scheduleId } = req.params;
    const {
      id_doctor,
      hari_dalam_minggu,
      waktu_mulai,
      waktu_selesai,
      is_available,
    } = req.body;

    if (!scheduleId) {
      return res
        .status(400)
        .json({ success: false, message: "ID Jadwal diperlukan." });
    }

    const scheduleDataToUpdate = {};
    if (id_doctor !== undefined) scheduleDataToUpdate.id_doctor = id_doctor;
    if (hari_dalam_minggu !== undefined)
      scheduleDataToUpdate.hari_dalam_minggu = hari_dalam_minggu;
    if (waktu_mulai !== undefined)
      scheduleDataToUpdate.waktu_mulai = waktu_mulai;
    if (waktu_selesai !== undefined)
      scheduleDataToUpdate.waktu_selesai = waktu_selesai;
    if (is_available !== undefined)
      scheduleDataToUpdate.is_available = is_available;

    if (Object.keys(scheduleDataToUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada data yang diberikan untuk diperbarui.",
      });
    }

    if (scheduleDataToUpdate.hari_dalam_minggu !== undefined) {
      const day = parseInt(scheduleDataToUpdate.hari_dalam_minggu);
      if (isNaN(day) || day < 1 || day > 7) {
        return res.status(400).json({
          success: false,
          message: "Hari dalam minggu tidak valid (1-7).",
        });
      }
      scheduleDataToUpdate.hari_dalam_minggu = day;
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
    if (
      scheduleDataToUpdate.waktu_mulai &&
      !timeRegex.test(scheduleDataToUpdate.waktu_mulai)
    ) {
      return res.status(400).json({
        success: false,
        message: "Format waktu mulai tidak valid (HH:MM atau HH:MM:SS).",
      });
    }
    if (
      scheduleDataToUpdate.waktu_selesai &&
      !timeRegex.test(scheduleDataToUpdate.waktu_selesai)
    ) {
      return res.status(400).json({
        success: false,
        message: "Format waktu selesai tidak valid (HH:MM atau HH:MM:SS).",
      });
    }
    if (
      scheduleDataToUpdate.waktu_mulai &&
      scheduleDataToUpdate.waktu_selesai &&
      scheduleDataToUpdate.waktu_mulai >= scheduleDataToUpdate.waktu_selesai
    ) {
      return res.status(400).json({
        success: false,
        message: "Waktu mulai harus sebelum waktu selesai.",
      });
    }

    try {
      const existingSchedule = await DoctorSchedule.findById(
        parseInt(scheduleId)
      );
      if (!existingSchedule) {
        return res
          .status(404)
          .json({ success: false, message: "Jadwal tidak ditemukan." });
      }

      const currentIdDoctor =
        scheduleDataToUpdate.id_doctor !== undefined
          ? scheduleDataToUpdate.id_doctor
          : existingSchedule.id_doctor;
      const currentHari =
        scheduleDataToUpdate.hari_dalam_minggu !== undefined
          ? scheduleDataToUpdate.hari_dalam_minggu
          : existingSchedule.hari_dalam_minggu;
      const currentWaktuMulai =
        scheduleDataToUpdate.waktu_mulai !== undefined
          ? scheduleDataToUpdate.waktu_mulai
          : existingSchedule.waktu_mulai;
      const currentWaktuSelesai =
        scheduleDataToUpdate.waktu_selesai !== undefined
          ? scheduleDataToUpdate.waktu_selesai
          : existingSchedule.waktu_selesai;

      const hasOverlap = await DoctorSchedule.checkOverlap(
        currentIdDoctor,
        currentHari,
        currentWaktuMulai,
        currentWaktuSelesai,
        parseInt(scheduleId)
      );
      if (hasOverlap) {
        return res.status(409).json({
          success: false,
          message:
            "Jadwal yang Anda coba perbarui bentrok dengan jadwal lain yang sudah ada untuk dokter ini pada hari yang sama.",
        });
      }

      const result = await DoctorSchedule.update(
        parseInt(scheduleId),
        scheduleDataToUpdate
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Jadwal tidak ditemukan atau tidak ada perubahan yang dilakukan.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Jadwal dokter berhasil diperbarui!",
        data: { id_schedule: parseInt(scheduleId), ...scheduleDataToUpdate },
      });
      console.log(
        `doctorScheduleController: Schedule ID ${scheduleId} updated successfully.`
      );
    } catch (error) {
      console.error(
        `doctorScheduleController: Error in updateSchedule for schedule ID ${scheduleId}:`,
        error
      );
      if (
        error.message.includes("tidak ditemukan") ||
        error.message.includes("tidak valid") ||
        error.message.includes("bentrok")
      ) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Terjadi kesalahan server saat memperbarui jadwal dokter.",
      });
    }
  },

  deleteSchedule: async (req, res) => {
    console.log("doctorScheduleController: deleteSchedule called.");
    const { scheduleId } = req.params;

    if (!scheduleId) {
      return res
        .status(400)
        .json({ success: false, message: "ID Jadwal diperlukan." });
    }

    try {
      const result = await DoctorSchedule.delete(parseInt(scheduleId));
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Jadwal tidak ditemukan." });
      }
      res.status(200).json({
        success: true,
        message: "Jadwal dokter berhasil dihapus.",
      });
      console.log(
        `doctorScheduleController: Schedule ID ${scheduleId} deleted successfully.`
      );
    } catch (error) {
      console.error(
        `doctorScheduleController: Error in deleteSchedule for schedule ID ${scheduleId}:`,
        error
      );
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server saat menghapus jadwal dokter.",
      });
    }
  },
};

module.exports = doctorScheduleController;
