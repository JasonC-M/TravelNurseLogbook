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

// Create sample contracts for testing/demo
router.post('/sample', asyncHandler(async (req, res) => {
  const userClient = createUserClient(req.token)
  
  // Sample contract data - 20 diverse healthcare facilities
  const sampleContracts = [
    { hospital_name: 'Seattle Children\'s Hospital', address: '4800 Sand Point Way NE, Seattle, WA 98105', latitude: 47.6625, longitude: -122.2947, start_date: '2025-07-01', end_date: '2025-09-30' },
    { hospital_name: 'Kuakini Medical Center', address: '347 N Kuakini St, Honolulu, HI 96817', latitude: 21.3099, longitude: -157.8581, start_date: '2025-03-18', end_date: '2025-06-17' },
    { hospital_name: 'Providence Alaska Medical Center', address: '3200 Providence Dr, Anchorage, AK 99508', latitude: 61.1928, longitude: -149.8683, start_date: '2024-12-02', end_date: '2025-03-04' },
    { hospital_name: 'Guam Regional Medical City', address: '133 Route 3, Dededo, Guam 96929', latitude: 13.5139, longitude: 144.8430, start_date: '2024-08-19', end_date: '2024-11-18' },
    { hospital_name: 'Samuel Simmonds Memorial Hospital', address: '7000 Uula St, Utqiagvik, AK 99723', latitude: 71.2906, longitude: -156.7886, start_date: '2024-05-06', end_date: '2024-08-05' },
    { hospital_name: 'Mayo Clinic Hospital', address: '5777 E Mayo Blvd, Phoenix, AZ 85054', latitude: 33.6159, longitude: -111.9626, start_date: '2024-01-22', end_date: '2024-04-22' },
    { hospital_name: 'Lyndon B. Johnson Tropical Medical Center', address: 'Pago Pago, AS 96799', latitude: -14.2781, longitude: -170.7025, start_date: '2023-10-09', end_date: '2024-01-08' },
    { hospital_name: 'Queen\'s Medical Center', address: '1301 Punchbowl St, Honolulu, HI 96813', latitude: 21.3099, longitude: -157.8581, start_date: '2023-06-26', end_date: '2023-09-25' },
    { hospital_name: 'Central Peninsula Hospital', address: '250 Hospital Pl, Soldotna, AK 99669', latitude: 60.4878, longitude: -151.0581, start_date: '2023-03-13', end_date: '2023-06-12' },
    { hospital_name: 'Roy J. Carver Pavilion', address: '200 Hawkins Dr, Iowa City, IA 52242', latitude: 41.6581, longitude: -91.5569, start_date: '2022-11-28', end_date: '2023-02-27' },
    { hospital_name: 'Schneider Regional Medical Center', address: '9048 Sugar Estate, St Thomas, VI 00802', latitude: 18.3358, longitude: -64.8963, start_date: '2022-08-15', end_date: '2022-11-14' },
    { hospital_name: 'Bartlett Regional Hospital', address: '3260 Hospital Dr, Juneau, AK 99801', latitude: 58.2539, longitude: -134.3708, start_date: '2022-05-02', end_date: '2022-08-01' },
    { hospital_name: 'Tampa General Hospital', address: '1 Tampa General Cir, Tampa, FL 33606', latitude: 27.9447, longitude: -82.4633, start_date: '2022-01-17', end_date: '2022-04-18' },
    { hospital_name: 'Banner University Medical Center', address: '1625 N Campbell Ave, Tucson, AZ 85719', latitude: 32.2431, longitude: -110.9531, start_date: '2021-10-04', end_date: '2022-01-03' },
    { hospital_name: 'Fairbanks Memorial Hospital', address: '1650 Cowles St, Fairbanks, AK 99701', latitude: 64.8378, longitude: -147.7164, start_date: '2021-06-21', end_date: '2021-09-20' },
    { hospital_name: 'Johns Hopkins Hospital', address: '1800 Orleans St, Baltimore, MD 21287', latitude: 39.2970, longitude: -76.5936, start_date: '2021-03-08', end_date: '2021-06-07' },
    { hospital_name: 'Commonwealth Health Center', address: 'Navy Hill Rd, Saipan, MP 96950', latitude: 15.1979, longitude: 145.7579, start_date: '2020-11-23', end_date: '2021-02-22' },
    { hospital_name: 'Mount Sinai Hospital', address: '1468 Madison Ave, New York, NY 10029', latitude: 40.7831, longitude: -73.9712, start_date: '2020-08-10', end_date: '2020-11-09' },
    { hospital_name: 'Mat-Su Regional Medical Center', address: '2500 S Woodworth Loop, Palmer, AK 99645', latitude: 61.5844, longitude: -149.1156, start_date: '2020-04-27', end_date: '2020-07-27' },
    { hospital_name: 'Massachusetts General Hospital', address: '55 Fruit St, Boston, MA 02114', latitude: 42.3631, longitude: -71.0686, start_date: '2020-01-13', end_date: '2020-04-13' }
  ]

  // Insert all sample contracts
  const { data, error } = await userClient
    .from('contracts')
    .insert(sampleContracts)
    .select()

  if (error) {
    throw new Error(`Failed to create sample contracts: ${error.message}`)
  }

  res.status(201).json({
    message: 'Sample contracts created successfully',
    count: data.length,
    contracts: data
  })
}))

// Delete all contracts for authenticated user
router.delete('/all', asyncHandler(async (req, res) => {
  const userClient = createUserClient(req.token)
  
  // First get count of contracts to be deleted
  const { count: contractCount, error: countError } = await userClient
    .from('contracts')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    throw new Error(`Failed to count contracts: ${countError.message}`)
  }

  // Delete all contracts for the user (RLS ensures only user's contracts are deleted)
  const { error } = await userClient
    .from('contracts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Matches all records

  if (error) {
    throw new Error(`Failed to delete contracts: ${error.message}`)
  }

  res.json({
    message: 'All contracts deleted successfully',
    deleted_count: contractCount || 0
  })
}))

export default router