// backend/models/serviceModel.js
const db = require("../config/database");

const Service = {
  create: async (serviceData) => {
    const { nama_layanan, deskripsi, harga, durasi_menit } = serviceData;
    console.log("serviceModel: create called with data:", serviceData);

    const sql = `
            INSERT INTO SERVICES 
            (nama_layanan, deskripsi, harga, durasi_menit, status_layanan) 
            VALUES (?, ?, ?, ?, ?)
        `;

    const status_layanan = "Aktif";

    try {
      const [result] = await db.execute(sql, [
        nama_layanan,
        deskripsi,
        harga,
        durasi_menit,
        status_layanan,
      ]);
      console.log(`serviceModel: Service created with ID: ${result.insertId}`);
      return result;
    } catch (error) {
      console.error("serviceModel: Error in create service:", error);
      throw error;
    }
  },

  findAll: async (statusFilter) => {
    console.log(
      `serviceModel: findAll called with statusFilter: "${statusFilter}"`
    );

    let sql =
      "SELECT id_service, nama_layanan, deskripsi, harga, durasi_menit, status_layanan FROM SERVICES";
    const params = [];

    if (statusFilter === "Aktif") {
      sql += " WHERE status_layanan = ?";
      params.push("Aktif");
    } else if (statusFilter === "Nonaktif") {
      sql += " WHERE status_layanan = ?";
      params.push("Nonaktif");
    } else if (statusFilter === "Semua") {
    } else {
      sql += " WHERE status_layanan = ?";
      params.push("Aktif");
    }

    sql += " ORDER BY nama_layanan ASC";

    try {
      console.log(`serviceModel: Executing SQL: ${sql} with params:`, params);
      const [rows] = await db.execute(sql, params);
      console.log(
        `serviceModel: Found ${rows.length} services with filter "${statusFilter}".`
      );
      return rows;
    } catch (error) {
      console.error(
        `serviceModel: Error in findAll services with filter "${statusFilter}":`,
        error
      );
      throw error;
    }
  },

  // START: METHOD BARU UNTUK MENCARI LAYANAN BERDASARKAN ID

  findById: async (id_service) => {
    console.log(`serviceModel: findById called for id_service: ${id_service}`);
    // Ambil semua kolom yang relevan untuk form edit
    const sql =
      "SELECT id_service, nama_layanan, deskripsi, harga, durasi_menit FROM SERVICES WHERE id_service = ?";

    try {
      const [rows] = await db.execute(sql, [id_service]);
      if (rows.length > 0) {
        console.log(
          `serviceModel: Service found for ID ${id_service}:`,
          rows[0]
        );
        return rows[0];
      } else {
        console.log(`serviceModel: No service found with ID ${id_service}.`);
        return null;
      }
    } catch (error) {
      console.error(
        `serviceModel: Error in findById for service ${id_service}:`,
        error
      );
      throw error;
    }
  },

  update: async (id_service, serviceData) => {
    const { nama_layanan, deskripsi, harga, durasi_menit } = serviceData;
    console.log(
      `serviceModel: update called for id_service: ${id_service} with data:`,
      serviceData
    );

    const sql = `
            UPDATE SERVICES 
            SET nama_layanan = ?, deskripsi = ?, harga = ?, durasi_menit = ?
            WHERE id_service = ?
        `;

    try {
      const values = [
        nama_layanan,
        deskripsi,
        parseFloat(harga),
        durasi_menit ? parseInt(durasi_menit) : null,
        id_service,
      ];
      const [result] = await db.execute(sql, values);
      console.log(
        `serviceModel: Service updated for ID ${id_service}, affected rows: ${result.affectedRows}`
      );
      return result;
    } catch (error) {
      console.error(
        `serviceModel: Error in update service for ID ${id_service}:`,
        error
      );
      throw error;
    }
  },

  deactivate: async (id_service) => {
    console.log(
      `serviceModel: deactivate called for id_service: ${id_service}`
    );
    const sql =
      "UPDATE SERVICES SET status_layanan = 'Nonaktif' WHERE id_service = ? AND status_layanan = 'Aktif'";
    try {
      const [result] = await db.execute(sql, [id_service]);
      console.log(
        `serviceModel: Service deactivated for ID ${id_service}, affected rows: ${result.affectedRows}`
      );
      return result;
    } catch (error) {
      console.error(
        `serviceModel: Error in deactivate service for ID ${id_service}:`,
        error
      );
      throw error;
    }
  },

  activate: async (id_service) => {
    console.log(`serviceModel: activate called for id_service: ${id_service}`);
    const sql =
      "UPDATE SERVICES SET status_layanan = 'Aktif' WHERE id_service = ? AND status_layanan = 'Nonaktif'";

    try {
      const [result] = await db.execute(sql, [id_service]);
      console.log(
        `serviceModel: Service activated for ID ${id_service}, affected rows: ${result.affectedRows}`
      );
      return result;
    } catch (error) {
      console.error(
        `serviceModel: Error in activate service for ID ${id_service}:`,
        error
      );
      throw error;
    }
  },

  findAll: async (statusFilter) => {
    console.log(
      `serviceModel: findAll called with statusFilter: "${statusFilter}"`
    );

    let sql =
      "SELECT id_service, nama_layanan, deskripsi, harga, durasi_menit, status_layanan FROM SERVICES";
    const params = [];

    if (statusFilter === "Aktif") {
      sql += " WHERE status_layanan = ?";
      params.push("Aktif");
    } else if (statusFilter === "Nonaktif") {
      sql += " WHERE status_layanan = ?";
      params.push("Nonaktif");
    } else if (statusFilter === "Semua") {
    } else {
      sql += " WHERE status_layanan = ?";
      params.push("Aktif");
    }

    sql += " ORDER BY nama_layanan ASC";

    try {
      console.log(`serviceModel: Executing SQL: ${sql} with params:`, params);
      const [rows] = await db.execute(sql, params);
      console.log(
        `serviceModel: Found ${rows.length} services with filter "${statusFilter}".`
      );
      return rows;
    } catch (error) {
      console.error(
        `serviceModel: Error in findAll services with filter "${statusFilter}":`,
        error
      );
      throw error;
    }
  },
};

module.exports = Service;
