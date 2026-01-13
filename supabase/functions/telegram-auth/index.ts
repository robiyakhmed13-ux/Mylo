// Supabase Edge Function: telegram-auth
// Verifies Telegram Mini App initData and creates/authenticates users

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
}

interface ParsedInitData {
  query_id?: string
  user?: TelegramUser
  auth_date: number
  hash: string
}

/**
 * Parse initData string into an object
 */
function parseInitData(initData: string): ParsedInitData {
  const params = new URLSearchParams(initData)
  const result: any = {}
  
  for (const [key, value] of params.entries()) {
    if (key === 'user') {
      try {
        result.user = JSON.parse(value)
      } catch {
        result.user = null
      }
    } else if (key === 'auth_date') {
      result.auth_date = parseInt(value, 10)
    } else {
      result[key] = value
    }
  }
  
  return result as ParsedInitData
}

/**
 * Verify Telegram initData signature using Web Crypto API
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
async function verifyTelegramInitData(initData: string, botToken: string): Promise<boolean> {
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    
    if (!hash) return false
    
    // Remove hash from params and sort alphabetically
    params.delete('hash')
    const checkParams: string[] = []
    params.forEach((value, key) => {
      checkParams.push(`${key}=${value}`)
    })
    checkParams.sort()
    const dataCheckString = checkParams.join('\n')
    
    // Create secret key from bot token using Web Crypto API
    const encoder = new TextEncoder()
    const keyData = encoder.encode('WebAppData')
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const secretKeyBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(botToken)
    )
    
    // Create HMAC of data check string
    const secretKey = await crypto.subtle.importKey(
      'raw',
      secretKeyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      secretKey,
      encoder.encode(dataCheckString)
    )
    
    // Convert to hex
    const calculatedHash = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    return calculatedHash === hash
  } catch (error) {
    console.error('Verification error:', error)
    return false
  }
}

/**
 * Check if auth_date is not too old (max 24 hours)
 */
function isAuthDateValid(authDate: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  const maxAge = 24 * 60 * 60 // 24 hours
  return (now - authDate) < maxAge
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { initData } = await req.json()

    if (!initData || typeof initData !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid initData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the initData signature
    const isValid = await verifyTelegramInitData(initData, TELEGRAM_BOT_TOKEN)
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid Telegram signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the verified data
    const parsedData = parseInitData(initData)

    // Check auth_date is not too old
    if (!isAuthDateValid(parsedData.auth_date)) {
      return new Response(
        JSON.stringify({ error: 'Authentication data expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate user exists
    if (!parsedData.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Missing user data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const telegramUser = parsedData.user
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Check if user exists in telegram_users table
    const { data: existingTgUser } = await supabase
      .from('telegram_users')
      .select('user_id, telegram_username, first_name')
      .eq('telegram_id', telegramUser.id)
      .maybeSingle()

    let userId: string
    const email = `tg_${telegramUser.id}@telegram.monex.app`
    const password = `tg_${telegramUser.id}_${TELEGRAM_BOT_TOKEN.slice(-10)}_secret`

    if (existingTgUser?.user_id) {
      // User is linked - use existing account
      userId = existingTgUser.user_id
      
      // Update last_active and any changed info
      await supabase
        .from('telegram_users')
        .update({
          telegram_username: telegramUser.username || existingTgUser.telegram_username,
          first_name: telegramUser.first_name || existingTgUser.first_name,
          last_active: new Date().toISOString()
        })
        .eq('telegram_id', telegramUser.id)
    } else {
      // New user or unlinked - create a new account
      
      // Try to sign in first (user might exist from previous session)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInData?.user) {
        userId = signInData.user.id
      } else if (signInError?.message?.includes('Invalid login credentials')) {
        // User doesn't exist, create new
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' '),
            telegram_id: telegramUser.id,
            telegram_username: telegramUser.username,
            source: 'telegram_miniapp'
          }
        })

        if (createError) {
          throw createError
        }

        userId = newUser.user!.id

        // Create profile for new user
        await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email,
            full_name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') || 'Telegram User',
            telegram_id: telegramUser.id,
            telegram_username: telegramUser.username
          }, { onConflict: 'id' })
      } else if (signInError) {
        throw signInError
      } else {
        throw new Error('Unexpected authentication state')
      }

      // Create or update telegram_users entry
      await supabase
        .from('telegram_users')
        .upsert({
          telegram_id: telegramUser.id,
          telegram_username: telegramUser.username,
          first_name: telegramUser.first_name,
          user_id: userId,
          last_active: new Date().toISOString()
        }, { onConflict: 'telegram_id' })
    }

    // Sign in to get session token
    const { data: session, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (sessionError || !session.session) {
      throw new Error('Failed to create session: ' + (sessionError?.message || 'No session returned'))
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        telegram_id: telegramUser.id,
        session: {
          access_token: session.session.access_token,
          refresh_token: session.session.refresh_token,
          expires_at: session.session.expires_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Telegram auth error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Authentication failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
