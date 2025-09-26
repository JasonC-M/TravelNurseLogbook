import express from 'express'
import { supabase, createUserClient } from '../config/supabase.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { validateContract, validateId, validatePagination } from '../middleware/validation.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Apply authentication to all routes
router.use(requireAuth)

// Get all contracts for authenticated user
router.get('/', validatePagination, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, sort = 'start_date', order = 'desc' } = req.query
  const offset = (page - 1) * limit

  // Create user-specific client that respects RLS
  const userClient = createUserClient(req.token)

  let query = userClient
    .from('contracts')
    .select('*', { count: 'exact' })
    .eq('user_id', req.user.id)

  // Apply sorting
  if (['start_date', 'end_date', 'hospital_name', 'created_at'].includes(sort)) {
    query = query.order(sort, { ascending: order === 'asc' })
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch contracts: ${error.message}`)
  }

  res.json({
    contracts: data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / limit)
    }
  })
}))

// Get single contract by ID
router.get('/:id', validateId, asyncHandler(async (req, res) => {
  const userClient = createUserClient(req.token)

  const { data, error } = await userClient
    .from('contracts')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        error: 'Contract not found',
        code: 'CONTRACT_NOT_FOUND'
      })
    }
    throw new Error(`Failed to fetch contract: ${error.message}`)
  }

  res.json({ contract: data })
}))

// Create new contract
router.post('/', validateContract, asyncHandler(async (req, res) => {
  const { hospital_name, address, latitude, longitude, start_date, end_date } = req.body

  const userClient = createUserClient(req.token)

  const contractData = {
    user_id: req.user.id,
    hospital_name,
    address: address || null,
    latitude: latitude || null,
    longitude: longitude || null,
    start_date,
    end_date,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data, error } = await userClient
    .from('contracts')
    .insert([contractData])
    .select()
    .single()

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        error: 'Contract with these details already exists',
        code: 'DUPLICATE_CONTRACT'
      })
    }
    throw new Error(`Failed to create contract: ${error.message}`)
  }

  res.status(201).json({
    message: 'Contract created successfully',
    contract: data
  })
}))

// Update contract
router.put('/:id', validateId, validateContract, asyncHandler(async (req, res) => {
  const { hospital_name, address, latitude, longitude, start_date, end_date } = req.body

  const userClient = createUserClient(req.token)

  const updateData = {
    hospital_name,
    address: address || null,
    latitude: latitude || null,
    longitude: longitude || null,
    start_date,
    end_date,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await userClient
    .from('contracts')
    .update(updateData)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        error: 'Contract not found or access denied',
        code: 'CONTRACT_NOT_FOUND'
      })
    }
    throw new Error(`Failed to update contract: ${error.message}`)
  }

  res.json({
    message: 'Contract updated successfully',
    contract: data
  })
}))

// Delete contract
router.delete('/:id', validateId, asyncHandler(async (req, res) => {
  const userClient = createUserClient(req.token)

  const { error } = await userClient
    .from('contracts')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        error: 'Contract not found or access denied',
        code: 'CONTRACT_NOT_FOUND'
      })
    }
    throw new Error(`Failed to delete contract: ${error.message}`)
  }

  res.json({
    message: 'Contract deleted successfully'
  })
}))

// Get contract statistics
router.get('/stats/summary', asyncHandler(async (req, res) => {
  const userClient = createUserClient(req.token)

  const { data, error } = await userClient
    .from('contracts')
    .select('*')
    .eq('user_id', req.user.id)

  if (error) {
    throw new Error(`Failed to fetch contract statistics: ${error.message}`)
  }

  const now = new Date()
  const currentContract = data.find(contract => 
    new Date(contract.start_date) <= now && new Date(contract.end_date) >= now
  )

  const stats = {
    total_contracts: data.length,
    current_contract: currentContract || null,
    completed_contracts: data.filter(contract => new Date(contract.end_date) < now).length,
    upcoming_contracts: data.filter(contract => new Date(contract.start_date) > now).length,
    states_worked: [...new Set(data.map(contract => {
      const state = contract.address?.match(/,\s*([A-Z]{2})\s*\d/)?.[1]
      return state
    }).filter(Boolean))].length
  }

  res.json({ stats })
}))

export default router