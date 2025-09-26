import express from 'express'
import { supabase, supabaseAuth } from '../config/supabase.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { validateLogin, validateRegister } from '../middleware/validation.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Register new user
router.post('/register', validateRegister, asyncHandler(async (req, res) => {
  const { email, password, first_name, last_name } = req.body

  console.log('Registration attempt:', { email, first_name, last_name })

  // Register user with Supabase Auth
  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name,
        last_name
      }
    }
  })

  console.log('Supabase signup result:', { data: !!data, error: error?.message })

  if (error) {
    console.error('Registration error:', error)
    return res.status(400).json({
      error: error.message,
      code: 'REGISTRATION_FAILED'
    })
  }

  // If user is created but needs email confirmation
  if (data.user && !data.session) {
    return res.status(201).json({
      message: 'Registration successful. Please check your email for confirmation.',
      user: {
        id: data.user.id,
        email: data.user.email
      },
      requiresEmailConfirmation: true
    })
  }

  // If user is created and session is available (auto-confirmed)
  res.status(201).json({
    message: 'Registration successful',
    user: {
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata
    },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at
    }
  })
}))

// Login user
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    return res.status(401).json({
      error: error.message,
      code: 'LOGIN_FAILED'
    })
  }

  res.json({
    message: 'Login successful',
    user: {
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata
    },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at
    }
  })
}))

// Refresh token
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body

  if (!refresh_token) {
    return res.status(400).json({
      error: 'Refresh token is required',
      code: 'MISSING_REFRESH_TOKEN'
    })
  }

  const { data, error } = await supabaseAuth.auth.refreshSession({
    refresh_token
  })

  if (error) {
    return res.status(401).json({
      error: error.message,
      code: 'REFRESH_FAILED'
    })
  }

  res.json({
    message: 'Token refreshed successfully',
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at
    }
  })
}))

// Logout user
router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const { error } = await supabaseAuth.auth.signOut()

  if (error) {
    return res.status(400).json({
      error: error.message,
      code: 'LOGOUT_FAILED'
    })
  }

  res.json({
    message: 'Logout successful'
  })
}))

// Get current user
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      user_metadata: req.user.user_metadata,
      created_at: req.user.created_at,
      last_sign_in_at: req.user.last_sign_in_at
    }
  })
}))

// Request password reset
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({
      error: 'Email is required',
      code: 'MISSING_EMAIL'
    })
  }

  const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL || 'https://localhost'}/reset-password`
  })

  if (error) {
    return res.status(400).json({
      error: error.message,
      code: 'PASSWORD_RESET_FAILED'
    })
  }

  res.json({
    message: 'Password reset email sent. Please check your inbox.'
  })
}))

// Update password
router.post('/update-password', requireAuth, asyncHandler(async (req, res) => {
  const { password } = req.body

  if (!password) {
    return res.status(400).json({
      error: 'New password is required',
      code: 'MISSING_PASSWORD'
    })
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'Password must be at least 6 characters long',
      code: 'PASSWORD_TOO_SHORT'
    })
  }

  const { error } = await supabaseAuth.auth.updateUser({
    password: password
  })

  if (error) {
    return res.status(400).json({
      error: error.message,
      code: 'PASSWORD_UPDATE_FAILED'
    })
  }

  res.json({
    message: 'Password updated successfully'
  })
}))

export default router