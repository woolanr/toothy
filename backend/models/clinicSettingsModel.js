// backend/models/clinicSettingsModel.js
const db = require("../config/database");

const ClinicSettings = {
  getAllSettings: async () => {
    const sql = `SELECT id, setting_key, setting_value, data_type, description FROM CLINIC_SETTINGS ORDER BY setting_key ASC`;
    try {
      const [rows] = await db.execute(sql);
      console.log(`clinicSettingsModel: Fetched ${rows.length} settings.`);
      return rows;
    } catch (error) {
      console.error("clinicSettingsModel: Error in getAllSettings:", error);
      throw error;
    }
  },

  updateSetting: async (key, value, dataType = "string") => {
    const sql = `
            INSERT INTO CLINIC_SETTINGS (setting_key, setting_value, data_type)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE setting_value = ?, data_type = ?
        `;
    try {
      const [result] = await db.execute(sql, [
        key,
        value,
        dataType,
        value,
        dataType,
      ]);
      console.log(
        `clinicSettingsModel: Setting '${key}' updated/inserted. Affected rows: ${result.affectedRows}`
      );
      return result;
    } catch (error) {
      console.error(
        `clinicSettingsModel: Error updating setting '${key}':`,
        error
      );
      throw error;
    }
  },

  getSettingByKey: async (key) => {
    const sql = `SELECT setting_value, data_type FROM CLINIC_SETTINGS WHERE setting_key = ?`;
    try {
      const [rows] = await db.execute(sql, [key]);
      if (rows.length > 0) {
        return rows[0];
      }
      return null;
    } catch (error) {
      console.error(
        `clinicSettingsModel: Error getting setting by key '${key}':`,
        error
      );
      throw error;
    }
  },
  // Anda bisa tambahkan fungsi deleteSettingByKey jika diperlukan, tapi jarang untuk pengaturan
};

module.exports = ClinicSettings;
