import express from 'express'
import { supabase, supabaseAdmin, createUserClient } from '../config/supabase.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { validateProfile } from '../middleware/validation.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Apply authentication to all routes
router.use(requireAuth)

// Get user profile
router.get('/', asyncHandler(async (req, res) => {
  const userClient = createUserClient(req.token)

  const { data, error } = await userClient
    .from('user_profiles')
    .select('*')
    .eq('user_id', req.user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Profile doesn't exist, create a basic one
      const newProfile = {
        user_id: req.user.id,  // Changed from 'id' to 'user_id'
        email: req.user.email,
        first_name: req.user.user_metadata?.first_name || null,
        last_name: req.user.user_metadata?.last_name || null,
        map_preferences: {
          "conus": true,
          "alaska": true,
          "hawaii": true,
          "puerto-rico": true,
          "us-virgin-islands": true,
          "guam": false,
          "american-samoa": false,
          "northern-mariana": false,
          "canada": false,
          "mexico": false,
          "caribbean": false,
          "europe": false,
          "asia-pacific": false,
          "other-international": false
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdProfile, error: createError } = await userClient
        .from('user_profiles')
        .insert([newProfile])
        .select()
        .single()

      if (createError) {
        throw new Error(`Failed to create profile: ${createError.message}`)
      }

      return res.json({ profile: createdProfile })
    }
    throw new Error(`Failed to fetch profile: ${error.message}`)
  }

  res.json({ profile: data })
}))

// Update user profile
router.put('/', validateProfile, asyncHandler(async (req, res) => {
  const { first_name, last_name, full_name, email, profile_complete, first_login, map_preferences } = req.body

  const userClient = createUserClient(req.token)

  // Only include fields that exist in the database schema
  const updateData = {
    updated_at: new Date().toISOString()
  }

  // Add fields only if they're provided (matching exact schema)
  if (first_name !== undefined) updateData.first_name = first_name || null
  if (last_name !== undefined) updateData.last_name = last_name || null
  if (full_name !== undefined) updateData.full_name = full_name || null
  if (email !== undefined) updateData.email = email || null
  if (profile_complete !== undefined) updateData.profile_complete = profile_complete
  if (first_login !== undefined) updateData.first_login = first_login
  
  // Add map_preferences if provided
  if (map_preferences !== undefined) {
    updateData.map_preferences = map_preferences
  }

  // First check if profile exists
  const { data: existingProfile } = await userClient
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', req.user.id)
    .single()

  let result

  if (existingProfile) {
    // Update existing profile
    const { data, error } = await userClient
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', req.user.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`)
    }

    result = data
  } else {
    // Create new profile
    const newProfile = {
      user_id: req.user.id,  // Changed from 'id' to 'user_id'
      email: req.user.email,
      ...updateData,
      created_at: new Date().toISOString()
    }

    const { data, error } = await userClient
      .from('user_profiles')
      .insert([newProfile])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create profile: ${error.message}`)
    }

    result = data
  }

  // Also update user metadata in auth if first_name or last_name changed
  if (first_name || last_name) {
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        first_name: first_name || req.user.user_metadata?.first_name,
        last_name: last_name || req.user.user_metadata?.last_name
      }
    })

    if (authError) {
      console.warn('Failed to update auth metadata:', authError.message)
    }
  }

  res.json({
    message: 'Profile updated successfully',
    profile: result
  })
}))

// Complete user account deletion - removes ALL data including auth account
router.delete('/', asyncHandler(async (req, res) => {
  const userClient = createUserClient(req.token)

  console.log(`🗑️ Starting complete account deletion for user: ${req.user.id}`)

  try {
    // 1. Delete all user contracts
    console.log('🗑️ Deleting user contracts...')
    const { error: contractsError } = await userClient
      .from('contracts')
      .delete()
      .eq('user_id', req.user.id)

    if (contractsError) {
      console.error('Error deleting contracts:', contractsError)
      throw new Error(`Failed to delete contracts: ${contractsError.message}`)
    }

    // 2. Delete user profile
    console.log('🗑️ Deleting user profile...')
    const { error: profileError } = await userClient
      .from('user_profiles')
      .delete()
      .eq('user_id', req.user.id)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      throw new Error(`Failed to delete profile: ${profileError.message}`)
    }

    // 3. Delete the Supabase auth user (this removes login capability)
    console.log('🗑️ Deleting Supabase auth account...')
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(req.user.id)

    if (authError) {
      console.error('Error deleting auth user:', authError)
      throw new Error(`Failed to delete authentication account: ${authError.message}`)
    }

    console.log(`✅ Complete account deletion successful for user: ${req.user.id}`)
    
    res.json({
      success: true,
      message: 'Account completely deleted. All profile data, contracts, and authentication account have been permanently removed.'
    })

  } catch (error) {
    console.error('🚨 Account deletion failed:', error)
    throw new Error(`Account deletion failed: ${error.message}`)
  }
}))

// Get profile statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const userClient = createUserClient(req.token)

  // Get profile info
  const { data: profile } = await userClient
    .from('user_profiles')
    .select('*')
    .eq('user_id', req.user.id)
    .single()

  // Get contracts count
  const { data: contracts } = await userClient
    .from('contracts')
    .select('id, start_date, end_date')
    .eq('user_id', req.user.id)

  const now = new Date()
  const totalContracts = contracts?.length || 0
  const completedContracts = contracts?.filter(c => new Date(c.end_date) < now).length || 0
  
  // Calculate total days worked (rough estimate)
  const totalDaysWorked = contracts?.reduce((total, contract) => {
    const start = new Date(contract.start_date)
    const end = new Date(contract.end_date)
    const days = Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)))
    return total + days
  }, 0) || 0

  const stats = {
    profile_completeness: calculateProfileCompleteness(profile),
    total_contracts: totalContracts,
    completed_contracts: completedContracts,
    estimated_days_worked: totalDaysWorked,
    member_since: req.user.created_at,
    last_login: req.user.last_sign_in_at
  }

  res.json({ stats })
}))

// Helper function to calculate profile completeness
function calculateProfileCompleteness(profile) {
  if (!profile) return 0

  // Use fields that exist in the actual database schema for profile completeness
  const fields = ['first_name', 'last_name', 'full_name', 'email']
  const completedFields = fields.filter(field => profile[field] && profile[field].trim())
  
  return Math.round((completedFields.length / fields.length) * 100)
}

export default router