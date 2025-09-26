import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get JWT token from request
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Verify the user token and get user info
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader)
    
    if (userError || !user) {
      throw new Error('Invalid token or user not found')
    }

    console.log(`🗑️ Starting complete account deletion for user: ${user.id}`)

    // Step 1: Delete all user contracts
    console.log('Deleting contracts...')
    const { error: contractsError } = await supabaseAdmin
      .from('contracts')
      .delete()
      .eq('user_id', user.id)

    if (contractsError) {
      console.error('Error deleting contracts:', contractsError)
      // Don't throw - continue with other deletions
    }

    // Step 2: Delete user profile  
    console.log('Deleting user profile...')
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('user_id', user.id)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      // Don't throw - continue with auth deletion
    }

    // Step 3: Delete the authentication account (THIS IS THE KEY STEP)
    console.log('Deleting auth account...')
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError)
      throw new Error(`Failed to delete auth account: ${deleteUserError.message}`)
    }

    console.log('✅ Complete account deletion successful')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account completely deleted. User can now re-register with same email.' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Delete user function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})