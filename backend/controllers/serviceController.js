// backend/controllers/serviceController.js
const Service = require('../models/serviceModel'); // Impor Service model

const serviceController = {
    /**
     * Membuat layanan baru.
     */
    createService: async (req, res) => {
        // Ambil data dari body request
        const { nama_layanan, deskripsi, harga, durasi_menit } = req.body;
        console.log('serviceController: createService called with body:', req.body);

        // Validasi dasar (lakukan validasi lebih detail jika perlu)
        if (!nama_layanan || !harga) { // Anggap nama layanan dan harga wajib
            return res.status(400).json({ 
                success: false, 
                message: 'Nama layanan dan harga wajib diisi.' 
            });
        }
        if (harga < 0 || (durasi_menit && durasi_menit < 0)) {
            return res.status(400).json({
                success: false,
                message: 'Harga dan durasi menit tidak boleh negatif.'
            });
        }

        try {
            const serviceData = {
                nama_layanan,
                deskripsi: deskripsi || null, // Kirim null jika deskripsi kosong
                harga: parseFloat(harga),       // Pastikan harga adalah angka
                durasi_menit: durasi_menit ? parseInt(durasi_menit) : null // Kirim null jika durasi kosong, pastikan angka jika ada
            };

            const result = await Service.create(serviceData);
            
            res.status(201).json({
                success: true,
                message: 'Layanan baru berhasil ditambahkan!',
                data: { id_service: result.insertId, ...serviceData }
            });
            console.log(`serviceController: Service created with ID: ${result.insertId}`);

        } catch (error) {
            console.error('serviceController: Error in createService:', error);
            // Cek jika error karena duplikasi nama_layanan (jika kamu set UNIQUE di DB)
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, message: 'Nama layanan sudah ada. Gunakan nama lain.' });
            }
            res.status(500).json({ 
                success: false, 
                message: 'Terjadi kesalahan server saat menambahkan layanan baru.' 
            });
        }
    },

 getAllServices: async (req, res) => {
        const status = req.query.status; // Ambil parameter 'status' dari query URL (cth: ?status=Aktif)
        console.log(`serviceController: getAllServices called with status query: "${status}"`);
        
        try {
            // Kirim parameter status ke model. Model akan handle default jika status tidak ada.
            const services = await Service.findAll(status); 
            res.status(200).json({
                success: true,
                data: services
            });
            console.log(`serviceController: Fetched ${services.length} services with status filter "${status}".`);
        } catch (error) {
            console.error('serviceController: Error in getAllServices:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Terjadi kesalahan server saat mengambil daftar layanan.' 
            });
        }
    },

    getServiceById: async (req, res) => {
        const serviceId = req.params.id;
        console.log(`serviceController: getServiceById called for ID: ${serviceId}`);

        try {
            const service = await Service.findById(serviceId);

            if (service) {
                res.status(200).json({
                    success: true,
                    data: service
                });
                console.log(`serviceController: Service data found and sent for ID: ${serviceId}`);
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Layanan tidak ditemukan.'
                });
                console.log(`serviceController: Service not found for ID: ${serviceId}`);
            }
        } catch (error) {
            console.error(`serviceController: Error in getServiceById for ID ${serviceId}:`, error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil data layanan.'
            });
        }
    },

    updateService: async (req, res) => {
        const serviceId = req.params.id; // Ambil  dari parameter URL
        const { nama_layanan, deskripsi, harga, durasi_menit } = req.body;
        console.log(`serviceController: updateService called for ID: ${serviceId} with body:`, req.body);

        // Validasi dasar
        if (!nama_layanan || harga === undefined || harga === null) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nama layanan dan harga wajib diisi.' 
            });
        }
        if (parseFloat(harga) < 0 || (durasi_menit && parseInt(durasi_menit) < 0)) {
            return res.status(400).json({
                success: false,
                message: 'Harga dan durasi menit tidak boleh negatif.'
            });
        }

        try {
            // Cek dulu apakah layanan dengan ID tersebut ada
            const existingService = await Service.findById(serviceId);
            if (!existingService) {
                return res.status(404).json({ success: false, message: 'Layanan yang akan diupdate tidak ditemukan.' });
            }

            const serviceDataToUpdate = {
                nama_layanan,
                deskripsi: deskripsi || null,
                harga: parseFloat(harga),
                durasi_menit: durasi_menit ? parseInt(durasi_menit) : null
            };

            const result = await Service.update(serviceId, serviceDataToUpdate);

            if (result.affectedRows > 0) {
                res.status(200).json({
                    success: true,
                    message: 'Layanan berhasil diupdate!',
                    data: { id_service: serviceId, ...serviceDataToUpdate }
                });
                console.log(`serviceController: Service updated successfully for ID: ${serviceId}`);
            } else {
                // Ini bisa terjadi jika data yang diinput sama dengan data yang sudah ada, sehingga tidak ada baris yang ter-update,
                // atau jika layanan dengan ID tersebut tidak ditemukan (meskipun sudah dicek di atas).
                res.status(200).json({ // Atau bisa juga 304 Not Modified, tapi 200 dengan pesan lebih umum
                    success: true, // Operasi dianggap sukses karena tidak ada error, meski tidak ada perubahan
                    message: 'Data layanan tidak berubah atau layanan tidak ditemukan untuk diupdate.',
                    dataUnchanged: true 
                });
                console.log(`serviceController: Service data unchanged or not found for update for ID: ${serviceId}`);
            }

        } catch (error) {
            console.error(`serviceController: Error in updateService for ID ${serviceId}:`, error);
            // Cek jika error karena duplikasi nama_layanan (jika kamu set UNIQUE di DB dan tidak menangani ini di model update)
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, message: 'Nama layanan sudah ada. Gunakan nama lain.' });
            }
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan server saat mengupdate layanan.'
            });
        }
    },

    deactivateService: async (req, res) => {
        const serviceId = req.params.id;
        console.log(`serviceController: deactivateService called for ID: ${serviceId}`);

        try {
            // Cek dulu apakah layanan dengan ID tersebut ada (opsional, karena UPDATE tidak error jika WHERE tidak match)
            // Namun, lebih baik untuk memberikan pesan yang lebih spesifik.
            const existingService = await Service.findById(serviceId);
            if (!existingService) {
                return res.status(404).json({ success: false, message: 'Layanan tidak ditemukan.' });
            }
            // Pastikan layanan belum nonaktif (jika query di model tidak menangani ini)
            if (existingService.status_layanan === 'Nonaktif') {
                 return res.status(400).json({ success: false, message: 'Layanan ini sudah nonaktif.' });
            }

            const result = await Service.deactivate(serviceId);

            if (result.affectedRows > 0) {
                res.status(200).json({ 
                    success: true, 
                    message: 'Layanan berhasil dinonaktifkan.' 
                });
                console.log(`serviceController: Service deactivated successfully for ID: ${serviceId}`);
            } else {
                // Ini bisa terjadi jika layanan tidak ditemukan oleh query UPDATE di model (misalnya, sudah nonaktif)
                res.status(404).json({ 
                    success: false, 
                    message: 'Layanan tidak ditemukan atau sudah nonaktif.' 
                });
                console.log(`serviceController: Service not found or already inactive for deactivation for ID: ${serviceId}`);
            }
        } catch (error) {
            console.error(`serviceController: Error in deactivateService for ID ${serviceId}:`, error);
            res.status(500).json({ 
                success: false, 
                message: 'Terjadi kesalahan server saat menonaktifkan layanan.' 
            });
        }
    },

    activateService: async (req, res) => {
        const serviceId = req.params.id;
        console.log(`serviceController: activateService called for ID: ${serviceId}`);

        try {
            // Opsional: Cek dulu apakah layanan ada (findById sudah mengambil status)
            const existingService = await Service.findById(serviceId);
            if (!existingService) {
                return res.status(404).json({ success: false, message: 'Layanan tidak ditemukan.' });
            }
            if (existingService.status_layanan === 'Aktif') {
                 return res.status(400).json({ success: false, message: 'Layanan ini sudah aktif.' });
            }

            const result = await Service.activate(serviceId);

            if (result.affectedRows > 0) {
                res.status(200).json({ 
                    success: true, 
                    message: 'Layanan berhasil diaktifkan kembali.' 
                });
                console.log(`serviceController: Service activated successfully for ID: ${serviceId}`);
            } else {
                // Ini bisa terjadi jika layanan tidak ditemukan oleh query UPDATE di model (misalnya, sudah aktif)
                res.status(404).json({ 
                    success: false, 
                    message: 'Layanan tidak ditemukan atau sudah aktif.' 
                });
                console.log(`serviceController: Service not found or already active for activation for ID: ${serviceId}`);
            }
        } catch (error) {
            console.error(`serviceController: Error in activateService for ID ${serviceId}:`, error);
            res.status(500).json({ 
                success: false, 
                message: 'Terjadi kesalahan server saat mengaktifkan layanan.' 
            });
        }
    },

    // TODO: Nanti tambahkan fungsi controller lain di sini:
    // updateService: async (req, res) => { ... },
    // deleteService: async (req, res) => { ... },
};

module.exports = serviceController;