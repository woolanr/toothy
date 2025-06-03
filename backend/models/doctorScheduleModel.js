// backend/models/doctorScheduleModel.js
const db = require('../config/database'); // Pastikan path ini benar

const DoctorSchedule = {
    /**
     * Membuat entri jadwal baru untuk seorang dokter.
     * @param {object} scheduleData - Objek berisi id_doctor, hari_dalam_minggu, waktu_mulai, waktu_selesai, is_available.
     * @returns {Promise<object>} - Hasil dari operasi insert (termasuk insertId).
     */
    create: async (scheduleData) => {
        const { id_doctor, hari_dalam_minggu, waktu_mulai, waktu_selesai, is_available = 1 } = scheduleData; // Default is_available ke 1 (true)
        console.log('doctorScheduleModel: create called with data:', scheduleData);

        // Validasi dasar untuk tipe data waktu (HH:MM atau HH:MM:SS)
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
        if (!timeRegex.test(waktu_mulai) || !timeRegex.test(waktu_selesai)) {
            throw new Error('Format waktu_mulai atau waktu_selesai tidak valid (gunakan HH:MM atau HH:MM:SS).');
        }
        // Validasi hari_dalam_minggu (1-7, 1=Minggu, 2=Senin, ..., 7=Sabtu untuk MySQL DAYOFWEEK())
        const day = parseInt(hari_dalam_minggu);
        if (isNaN(day) || day < 1 || day > 7) {
            throw new Error('Nilai hari_dalam_minggu tidak valid (harus angka 1-7).');
        }

        const sql = `
            INSERT INTO DOCTOR_SCHEDULES 
            (id_doctor, hari_dalam_minggu, waktu_mulai, waktu_selesai, is_available) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        try {
            const [result] = await db.execute(sql, [id_doctor, day, waktu_mulai, waktu_selesai, is_available]);
            console.log(`doctorScheduleModel: Schedule created with ID: ${result.insertId} for doctor ID: ${id_doctor}`);
            return result;
        } catch (error) {
            console.error('doctorScheduleModel: Error in create schedule:', error);
            // Cek jika ada error spesifik, misalnya foreign key constraint untuk id_doctor
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                throw new Error(`Dokter dengan ID ${id_doctor} tidak ditemukan.`);
            }
            // Cek jika ada error unique constraint jika kamu membuatnya (misal, dokter tidak boleh punya jadwal bentrok di hari yang sama)
            // if (error.code === 'ER_DUP_ENTRY') { ... }
            throw error; 
        }
    },

    /**
     * Mengambil semua entri jadwal untuk dokter tertentu.
     * @param {number} doctorId - ID dari dokter.
     * @returns {Promise<Array>} - Array objek jadwal.
     */
    findByDoctorId: async (doctorId) => {
        console.log(`doctorScheduleModel: findByDoctorId called for doctorId: ${doctorId}`);
        // Mengambil semua kolom yang relevan, diurutkan berdasarkan hari dan waktu mulai
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
            console.log(`doctorScheduleModel: Found ${rows.length} schedules for doctor ID: ${doctorId}.`);
            return rows;
        } catch (error) {
            console.error(`doctorScheduleModel: Error in findByDoctorId for doctor ID ${doctorId}:`, error);
            throw error;
        }
    }

    // TODO: Nanti kita tambahkan fungsi lain di sini untuk CRUD jadwal:
    // findById: async (scheduleId) => { ... }, // Untuk mengambil satu jadwal spesifik (untuk edit)
    // update: async (scheduleId, scheduleData) => { ... },
    // delete: async (scheduleId) => { ... }, // Atau toggleIsAvailable
};

module.exports = DoctorSchedule;