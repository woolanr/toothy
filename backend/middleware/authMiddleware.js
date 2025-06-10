const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
    let token;
    console.log('--- START PROTECT MIDDLEWARE ---');
    console.log('Request URL:', req.originalUrl);
    console.log('Request Headers:', req.headers.authorization); 

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        console.log('Condition met: Authorization header exists and starts with Bearer.');
        token = req.headers.authorization.split(' ')[1];
        console.log('Token extracted:', token ? token.substring(0, 10) + '...' : 'No token');

        try {
            if (!token) { 
                console.log('Protect: Token is empty after split.');
                return res.status(401).json({ message: 'Tidak terautentikasi: Token kosong.' });
            }

            const decoded = jwt.verify(token, config.jwtSecret);
            console.log('Middleware Protect: JWT decoded successfully:', decoded);

            const user = await User.findById(decoded.id_user);
            if (!user) {
                console.log('Protect: User not found in DB with decoded ID:', decoded.id_user);
                return res.status(401).json({ message: 'Tidak terautentikasi: Pengguna tidak ditemukan.' });
            }
            req.user = {
                id_user: user.id_user,
                username: user.username,
                id_level_user: user.id_level_user,
            };
            console.log('Protect: req.user set to:', req.user.username, 'Level:', req.user.id_level_user);

            console.log('--- END PROTECT MIDDLEWARE (SUCCESS) ---');
            next();

        } catch (error) {
            console.error('Protect: Error during token verification or user lookup:', error.message);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Tidak terautentikasi: Sesi berakhir (Token kadaluarsa).' });
            }

            return res.status(401).json({ message: 'Tidak terautentikasi: Token tidak valid.' });
        }
    } else {
        console.log('Condition NOT met: No Authorization header or not Bearer token found.');
        console.log('--- END PROTECT MIDDLEWARE (FAIL - NO TOKEN) ---');
        return res.status(401).json({ message: 'Tidak terautentikasi: Tidak ada token disediakan.' });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) { 
            console.log('AuthorizeRoles: req.user is empty or missing id_level_user.');
            return res.status(403).json({ message: 'Akses ditolak. Informasi peran tidak tersedia.' });
        }

        console.log('AuthorizeRoles: User in req.user:', req.user.username, 'Level:', req.user.id_level_user);
        console.log('AuthorizeRoles: Roles required:', roles);

        if (!roles.includes(req.user.id_level_user)) {
            console.log(`AuthorizeRoles: Access denied for user ${req.user.username} (Level: ${req.user.id_level_user}) on route: ${req.originalUrl}. Required levels: ${roles.join(', ')}`);
            return res.status(403).json({ message: 'Anda tidak memiliki izin untuk mengakses halaman ini.' });
        }
        console.log('AuthorizeRoles: User is authorized. Continuing...');
        next();
    };
};

module.exports = { protect, authorizeRoles };