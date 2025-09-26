import express from 'express'
import { supabase } from '../config/supabase.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = express.Router()

// Basic health check
router.get('/', asyncHandler(async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  }
  
  res.json(health)
}))

// Detailed health check with database connectivity
router.get('/detailed', asyncHandler(async (req, res) => {
  const startTime = Date.now()
  
  // Test database connection
  let dbStatus = 'unknown'
  let dbResponseTime = null
  
  try {
    const dbStartTime = Date.now()
    const { error } = await supabase
      .from('contracts')
      .select('id')
      .limit(1)
    
    dbResponseTime = Date.now() - dbStartTime
    dbStatus = error ? 'error' : 'healthy'
  } catch (error) {
    dbStatus = 'error'
    console.error('Database health check failed:', error)
  }
  
  const totalResponseTime = Date.now() - startTime
  
  const health = {
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    responseTime: `${totalResponseTime}ms`,
    services: {
      database: {
        status: dbStatus,
        responseTime: dbResponseTime ? `${dbResponseTime}ms` : null
      },
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
      }
    }
  }
  
  const statusCode = health.status === 'healthy' ? 200 : 503
  res.status(statusCode).json(health)
}))

export default router