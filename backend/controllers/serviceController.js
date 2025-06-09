// backend/controllers/serviceController.js
const Service = require('../models/serviceModel'); // Impor Service model

const serviceController = {

    createService: async (req, res) => {
        const { nama_layanan, deskripsi, harga, durasi_menit } = req.body;
        console.log('serviceController: createService called with body:', req.body);

        if (!nama_layanan || !harga) { 
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
                deskripsi: deskripsi || null, 
                harga: parseFloat(harga),  
                durasi_menit: durasi_menit ? parseInt(durasi_menit) : null
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
        const status = req.query.status;
        console.log(`serviceController: getAllServices called with status query: "${status}"`);
        
        try {
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
        const serviceId = req.params.id; 
        const { nama_layanan, deskripsi, harga, durasi_menit } = req.body;
        console.log(`serviceController: updateService called for ID: ${serviceId} with body:`, req.body);

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
                res.status(200).json({ 
                    success: true, 
                    message: 'Data layanan tidak berubah atau layanan tidak ditemukan untuk diupdate.',
                    dataUnchanged: true 
                });
                console.log(`serviceController: Service data unchanged or not found for update for ID: ${serviceId}`);
            }

        } catch (error) {
            console.error(`serviceController: Error in updateService for ID ${serviceId}:`, error);
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
            const existingService = await Service.findById(serviceId);
            if (!existingService) {
                return res.status(404).json({ success: false, message: 'Layanan tidak ditemukan.' });
            }
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
};

module.exports = serviceController;