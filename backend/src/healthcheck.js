// Health check script for Docker
import { supabase } from './config/supabase.js'

async function healthCheck() {
  try {
    // Test database connection
    const { error } = await supabase
      .from('contracts')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('Health check failed:', error.message)
      process.exit(1)
    }
    
    console.log('Health check passed')
    process.exit(0)
  } catch (error) {
    console.error('Health check error:', error.message)
    process.exit(1)
  }
}

healthCheck()