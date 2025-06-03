// backend/config/database.js

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'woolanr',
    password: 'maululusPL2025',
    database: 'happy_toothy',
    waitForConnections: true, 
    connectionLimit: 10, 
    queueLimit: 0,
    connectTimeout: 20000,
    timeout: 60 * 1000
});

pool.getConnection()
    .then(connection => {
        console.log('Connected to MySQL database via pool');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to database via pool:', err);
        process.exit(1);
    });

module.exports = pool;