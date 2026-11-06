import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'premium_restaurant_secret_key_123';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a JWT token for an authenticated user.
 * Encodes: id, role, name, email
 */
export function signToken(user) {
  const userId = user._id ? String(user._id) : String(user.id);
  return jwt.sign(
    {
      id: userId,
      role: user.role || 'user',
      name: user.name,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Middleware: Verifies the JWT Bearer token from the Authorization header.
 * Attaches decoded user payload to `req.user`.
 * Returns 401 Unauthorized if token is missing, invalid, or expired.
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No authorization header provided.' 
    });
  }

  // Support "Bearer <token>" format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid authorization header format. Format must be "Bearer <token>".' 
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has expired. Please log in again.', 
        expired: true 
      });
    }
    return res.status(401).json({ 
      success: false, 
      message: 'Token is invalid or malformed.' 
    });
  }
}

/**
 * Role-based authorization middleware factory.
 * Usage: authorizeRoles('admin'), authorizeRoles('owner', 'admin')
 */
export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User authentication required.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Requires one of roles: [${roles.join(', ')}]. Current role: ${req.user.role}` 
      });
    }

    next();
  };
}

// Convenience middlewares
export const requireAdmin = authorizeRoles('admin');
export const requireOwner = authorizeRoles('owner', 'admin');
