// backend/controllers/clinicSettingsController.js
const ClinicSettings = require('../models/clinicSettingsModel');

const clinicSettingsController = {

    getClinicSettings: async (req, res) => {
        console.log('clinicSettingsController: getClinicSettings called.');
        try {
            const settingsArray = await ClinicSettings.getAllSettings();
            const settingsObject = {};
            settingsArray.forEach(setting => {
                let value = setting.setting_value;
                if (setting.data_type === 'integer') {
                    value = parseInt(value);
                } else if (setting.data_type === 'boolean') {
                    value = (value === 'true'); 
                }
                settingsObject[setting.setting_key] = value;
            });

            res.status(200).json({
                success: true,
                data: settingsObject
            });
            console.log('clinicSettingsController: Sent clinic settings.');
        } catch (error) {
            console.error('clinicSettingsController: Error in getClinicSettings:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan server saat mengambil pengaturan klinik.'
            });
        }
    },

    updateClinicSettings: async (req, res) => {
        console.log('clinicSettingsController: updateClinicSettings called with body:', req.body);
        const updatedSettings = req.body; 

        if (Object.keys(updatedSettings).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada pengaturan yang diberikan untuk diperbarui.'
            });
        }

        try {
            const results = [];
            for (const key in updatedSettings) {
                if (updatedSettings.hasOwnProperty(key)) {
                    let value = updatedSettings[key];
                    let dataType = 'string';

                    if (typeof value === 'number') {
                        dataType = 'integer';
                    } else if (typeof value === 'boolean') {
                        dataType = 'boolean';
                        value = value ? 'true' : 'false'; 
                    } else if (typeof value === 'string') {
                        dataType = 'string';
                    }
                    
                    results.push(await ClinicSettings.updateSetting(key, String(value), dataType)); 
                }
            }

            res.status(200).json({
                success: true,
                message: 'Pengaturan klinik berhasil diperbarui!',
                updatedCount: results.length
            });
            console.log('clinicSettingsController: Clinic settings updated successfully.');
        } catch (error) {
            console.error('clinicSettingsController: Error in updateClinicSettings:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Terjadi kesalahan server saat memperbarui pengaturan klinik.'
            });
        }
    }
};

module.exports = clinicSettingsController;