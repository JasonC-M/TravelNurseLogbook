import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'

import config from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

// Import routes
import authRoutes from './routes/auth.js'
import contractRoutes from './routes/contracts.js'
import profileRoutes from './routes/profile.js'
import healthRoutes from './routes/health.js'

const app = express()

// Trust proxy if behind reverse proxy (nginx)
app.set('trust proxy', 1)

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}))

// CORS configuration
app.use(cors(config.cors))

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

// Logging middleware
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'))
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Compression middleware
app.use(compression())

// API Routes
app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/contracts', contractRoutes)
app.use('/api/profile', profileRoutes)

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Travel Nurse Logbook API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
})

// Handle unknown routes
app.use(notFoundHandler)

// Global error handler (must be last)
app.use(errorHandler)

// Start server
const startServer = () => {
  try {
    app.listen(config.port, () => {
      console.log(`
🚀 Travel Nurse Logbook API Server Started
┌─────────────────────────────────────────┐
│ Environment: ${config.nodeEnv.padEnd(27)} │
│ Port: ${config.port.toString().padEnd(32)} │
│ URL: http://localhost:${config.port.toString().padEnd(21)} │
│ Health: /api/health${' '.repeat(20)} │
└─────────────────────────────────────────┘
      `)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer()
}

export default app