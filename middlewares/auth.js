const jwt = require('jsonwebtoken');

// Auth middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access token required' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid or expired token' 
        });
    }
};

// Optional auth (for public endpoints that can work with or without auth)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
            req.user = decoded;
        }
        next();
    } catch (error) {
        // Continue without auth
        next();
    }
};

// Check if user has access to specific session
const checkSessionAccess = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'User authentication required' 
            });
        }

        // For now, allow all authenticated users
        // You can add specific session ownership checks here
        next();
    } catch (error) {
        console.error('Session access check error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Session access check failed' 
        });
    }
};

module.exports = {
    authenticateToken,
    optionalAuth,
    checkSessionAccess
};
