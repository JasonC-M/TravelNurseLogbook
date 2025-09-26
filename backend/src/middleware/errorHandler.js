import config from '../config/env.js'

// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  // Log error details (in production, use proper logging service)
  console.error('Error occurred:', {
    message: err.message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  })

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.details || err.message
    })
  }

  if (err.name === 'UnauthorizedError' || err.message === 'jwt malformed') {
    return res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    })
  }

  if (err.name === 'ForbiddenError') {
    return res.status(403).json({
      error: 'Access forbidden',
      code: 'FORBIDDEN_ERROR'
    })
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      error: 'Resource not found',
      code: 'NOT_FOUND_ERROR'
    })
  }

  // Supabase specific errors
  if (err.message && err.message.includes('duplicate key')) {
    return res.status(409).json({
      error: 'Resource already exists',
      code: 'DUPLICATE_RESOURCE'
    })
  }

  if (err.message && err.message.includes('foreign key')) {
    return res.status(400).json({
      error: 'Invalid reference to related resource',
      code: 'INVALID_REFERENCE'
    })
  }

  // Default server error
  const statusCode = err.statusCode || err.status || 500
  const message = config.nodeEnv === 'production' 
    ? 'Internal server error' 
    : err.message

  res.status(statusCode).json({
    error: message,
    code: 'INTERNAL_SERVER_ERROR',
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  })
}

// 404 handler for unknown routes
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND'
  })
}

// Async error wrapper to catch Promise rejections
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export default { errorHandler, notFoundHandler, asyncHandler }