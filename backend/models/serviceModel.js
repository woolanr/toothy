// backend/models/serviceModel.js
const db = require('../config/database'); // Pastikan path ini benar ke koneksi database pool kamu

const Service = {
    /**
     * Membuat layanan baru di database.
     * @param {object} serviceData - Objek berisi nama_layanan, deskripsi, harga, durasi_menit.
     * @returns {Promise<object>} - Hasil dari operasi insert (termasuk insertId).
     */
    create: async (serviceData) => {
        const { nama_layanan, deskripsi, harga, durasi_menit } = serviceData;
        console.log('serviceModel: create called with data:', serviceData);

        // Pastikan status_layanan di-handle jika kamu sudah menambahkannya di tabel
        // Untuk sekarang, kita asumsikan 5 kolom utama.
        const sql = 'INSERT INTO SERVICES (id_service, nama_layanan, deskripsi, harga, durasi_menit) VALUES (?, ?, ?, ?)';
        // Jika ada kolom status_layanan dengan default 'Aktif', query di atas sudah cukup.
        // Jika tidak, kamu mungkin perlu menambahkannya di SQL dan values.
        
        try {
            const [result] = await db.execute(sql, [nama_layanan, deskripsi, harga, durasi_menit]);
            console.log(`serviceModel: Service created with ID: ${result.insertId}`);
            return result;
        } catch (error) {
            console.error('serviceModel: Error in create service:', error);
            throw error; // Biarkan controller menangani error HTTP
        }
    },

    /**
     * Mengambil semua layanan dari database.
     * @returns {Promise<Array>} - Array objek layanan.
     */
    findAll: async (statusFilter) => {
        console.log(`serviceModel: findAll called with statusFilter: "${statusFilter}"`);
        
        // PASTIKAN status_layanan ADA DI SELECT LIST INI
        let sql = 'SELECT id_service, nama_layanan, deskripsi, harga, durasi_menit, status_layanan FROM SERVICES';
        const params = [];

        if (statusFilter === 'Aktif') {
            sql += ' WHERE status_layanan = ?';
            params.push('Aktif');
        } else if (statusFilter === 'Nonaktif') {
            sql += ' WHERE status_layanan = ?';
            params.push('Nonaktif');
        } else if (statusFilter === 'Semua') {
            // Tidak ada WHERE clause tambahan, ambil semua status
        } else {
            // Default jika statusFilter tidak valid atau tidak ada: hanya ambil yang Aktif
            sql += ' WHERE status_layanan = ?';
            params.push('Aktif');
        }
        
        sql += ' ORDER BY nama_layanan ASC';
        
        try {
            console.log(`serviceModel: Executing SQL: ${sql} with params:`, params);
            const [rows] = await db.execute(sql, params);
            console.log(`serviceModel: Found ${rows.length} services with filter "${statusFilter}".`);
            // console.log('Sample row data from model:', rows.length > 0 ? rows[0] : 'No rows'); // Log tambahan untuk cek data
            return rows;
        } catch (error) {
            console.error(`serviceModel: Error in findAll services with filter "${statusFilter}":`, error);
            throw error;
        }
    },

    // START: METHOD BARU UNTUK MENCARI LAYANAN BERDASARKAN ID
    /**
     * Mencari layanan berdasarkan ID.
     * @param {number} id_service - ID dari layanan yang dicari.
     * @returns {Promise<object|null>} - Objek layanan jika ditemukan, atau null jika tidak.
     */
    findById: async (id_service) => {
        console.log(`serviceModel: findById called for id_service: ${id_service}`);
        // Ambil semua kolom yang relevan untuk form edit
        const sql = 'SELECT id_service, nama_layanan, deskripsi, harga, durasi_menit FROM SERVICES WHERE id_service = ?';

        try {
            const [rows] = await db.execute(sql, [id_service]);
            if (rows.length > 0) {
                console.log(`serviceModel: Service found for ID ${id_service}:`, rows[0]);
                return rows[0]; 
            } else {
                console.log(`serviceModel: No service found with ID ${id_service}.`);
                return null; 
            }
        } catch (error) {
            console.error(`serviceModel: Error in findById for service ${id_service}:`, error);
            throw error;
        }
    },

     /**
     * Mengupdate data layanan berdasarkan ID.
     * @param {number} id_service - ID dari layanan yang akan diupdate.
     * @param {object} serviceData - Objek berisi data layanan yang akan diupdate (nama_layanan, deskripsi, harga, durasi_menit).
     * @returns {Promise<object>} - Hasil dari operasi update (termasuk affectedRows).
     */
    update: async (id_service, serviceData) => {
        const { nama_layanan, deskripsi, harga, durasi_menit } = serviceData;
        console.log(`serviceModel: update called for id_service: ${id_service} with data:`, serviceData);

        // Siapkan field dan value untuk diupdate
        // Kita akan update semua field yang dikirim, bahkan jika nilainya sama dengan yang lama.
        // Kamu bisa menambahkan logika untuk hanya mengupdate field yang berubah jika perlu.
        const sql = `
            UPDATE SERVICES 
            SET nama_layanan = ?, deskripsi = ?, harga = ?, durasi_menit = ?
            WHERE id_service = ?
        `;
        
        try {
            // Pastikan tipe data sesuai dengan tabelmu
            const values = [
                nama_layanan,
                deskripsi,
                parseFloat(harga), // Harga sebagai float/decimal
                durasi_menit ? parseInt(durasi_menit) : null, // Durasi sebagai integer atau null
                id_service
            ];
            const [result] = await db.execute(sql, values);
            console.log(`serviceModel: Service updated for ID ${id_service}, affected rows: ${result.affectedRows}`);
            return result;
        } catch (error) {
            console.error(`serviceModel: Error in update service for ID ${id_service}:`, error);
            throw error; // Biarkan controller menangani error HTTP
        }
    },

    /**
     * Menonaktifkan layanan (soft delete) dengan mengubah status_layanan menjadi 'Nonaktif'.
     * @param {number} id_service - ID dari layanan yang akan dinonaktifkan.
     * @returns {Promise<object>} - Hasil dari operasi update (termasuk affectedRows).
     */
    deactivate: async (id_service) => {
        console.log(`serviceModel: deactivate called for id_service: ${id_service}`);
        const sql = "UPDATE SERVICES SET status_layanan = 'Nonaktif' WHERE id_service = ? AND status_layanan = 'Aktif'";
        // Kondisi "AND status_layanan = 'Aktif'" ditambahkan agar tidak mengupdate jika sudah Nonaktif,
        // sehingga affectedRows akan 0 jika sudah nonaktif, yang bisa jadi indikasi.
        
        try {
            const [result] = await db.execute(sql, [id_service]);
            console.log(`serviceModel: Service deactivated for ID ${id_service}, affected rows: ${result.affectedRows}`);
            return result;
        } catch (error) {
            console.error(`serviceModel: Error in deactivate service for ID ${id_service}:`, error);
            throw error;
        }
    },

    /**
     * Mengaktifkan kembali layanan dengan mengubah status_layanan menjadi 'Aktif'.
     * @param {number} id_service - ID dari layanan yang akan diaktifkan.
     * @returns {Promise<object>} - Hasil dari operasi update (termasuk affectedRows).
     */
    activate: async (id_service) => {
        console.log(`serviceModel: activate called for id_service: ${id_service}`);
        const sql = "UPDATE SERVICES SET status_layanan = 'Aktif' WHERE id_service = ? AND status_layanan = 'Nonaktif'";
        // Kondisi "AND status_layanan = 'Nonaktif'" ditambahkan agar hanya layanan yang benar-benar nonaktif yang diubah,
        // sehingga affectedRows akan 0 jika sudah aktif, yang bisa jadi indikasi.
        
        try {
            const [result] = await db.execute(sql, [id_service]);
            console.log(`serviceModel: Service activated for ID ${id_service}, affected rows: ${result.affectedRows}`);
            return result;
        } catch (error) {
            console.error(`serviceModel: Error in activate service for ID ${id_service}:`, error);
            throw error; // Biarkan controller menangani error HTTP
        }
    },

    /**
     * Mengambil layanan dari database, bisa difilter berdasarkan status.
     * @param {string} [statusFilter] - Opsional. Bisa 'Aktif', 'Nonaktif', atau 'Semua'. 
     * Default akan mengambil 'Aktif' jika tidak dispesifikkan.
     * @returns {Promise<Array>} - Array objek layanan.
     */
    findAll: async (statusFilter) => {
        console.log(`serviceModel: findAll called with statusFilter: "${statusFilter}"`);
        
        let sql = 'SELECT id_service, nama_layanan, deskripsi, harga, durasi_menit, status_layanan FROM SERVICES';
        const params = [];

        if (statusFilter === 'Aktif') {
            sql += ' WHERE status_layanan = ?';
            params.push('Aktif');
        } else if (statusFilter === 'Nonaktif') {
            sql += ' WHERE status_layanan = ?';
            params.push('Nonaktif');
        } else if (statusFilter === 'Semua') {
            // Tidak ada WHERE clause tambahan, ambil semua status
        } else {
            // Default jika statusFilter tidak valid atau tidak ada: hanya ambil yang Aktif
            sql += ' WHERE status_layanan = ?';
            params.push('Aktif');
        }
        
        sql += ' ORDER BY nama_layanan ASC';
        
        try {
            console.log(`serviceModel: Executing SQL: ${sql} with params:`, params);
            const [rows] = await db.execute(sql, params);
            console.log(`serviceModel: Found ${rows.length} services with filter "${statusFilter}".`);
            return rows;
        } catch (error) {
            console.error(`serviceModel: Error in findAll services with filter "${statusFilter}":`, error);
            throw error;
        }
    },
    // TODO: Nanti kita tambahkan fungsi lain di sini:
    // update: async (id_service, serviceData) => { ... },
    // remove: async (id_service) => { ... }, // atau softDelete/deactivate
};

module.exports = Service;