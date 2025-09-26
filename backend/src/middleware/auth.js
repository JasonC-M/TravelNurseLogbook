import jwt from 'jsonwebtoken'
import config from '../config/env.js'
import { supabase } from '../config/supabase.js'

// Middleware to verify JWT token and authenticate user
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Authorization header missing',
        code: 'MISSING_AUTH_HEADER'
      })
    }

    const token = authHeader.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({
        error: 'Token missing from authorization header',
        code: 'MISSING_TOKEN'
      })
    }

    // Verify JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      })
    }

    // Add user information to request
    req.user = user
    req.token = token
    
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    })
  }
}

// Optional auth - doesn't fail if no token provided
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      
      if (token) {
        const { data: { user }, error } = await supabase.auth.getUser(token)
        
        if (!error && user) {
          req.user = user
          req.token = token
        }
      }
    }
    
    next()
  } catch (error) {
    // Don't fail on optional auth errors
    console.warn('Optional auth warning:', error.message)
    next()
  }
}

// Middleware to check if user has specific roles/permissions
export const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      })
    }

    const userRole = req.user.user_metadata?.role || 'user'
    
    if (roles.length > 0 && !roles.includes(userRole)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: roles,
        userRole
      })
    }

    next()
  }
}

export default { requireAuth, optionalAuth, requireRole }