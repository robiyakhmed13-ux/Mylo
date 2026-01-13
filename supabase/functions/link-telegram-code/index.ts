// Supabase Edge Function: link-telegram-code
// Creates and validates linking codes for connecting Telegram to mobile accounts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting: max 5 codes per user per hour
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(userId)
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 3600000 }) // 1 hour
    return true
  }
  
  if (limit.count >= 5) {
    return false
  }
  
  limit.count++
  return true
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const { action } = await req.json()

    // CREATE: Generate a new linking code (requires auth)
    if (action === 'create') {
      // Verify user authentication
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      })

      const token = authHeader.replace('Bearer ', '')
      const { data: claims, error: claimsError } = await supabase.auth.getUser(token)
      
      if (claimsError || !claims?.user?.id) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const userId = claims.user.id

      // Check rate limit
      if (!checkRateLimit(userId)) {
        return new Response(
          JSON.stringify({ error: 'Too many requests. Please wait before generating a new code.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate 6-character alphanumeric code
      const code = Array.from(
        { length: 6 },
        () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
      ).join('')

      const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

      // Delete any existing codes for this user
      await supabaseAdmin
        .from('telegram_users')
        .update({ linking_code: null, code_expires_at: null })
        .eq('user_id', userId)

      // Check if user already has a telegram_users entry
      const { data: existing } = await supabaseAdmin
        .from('telegram_users')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        // Update existing entry
        await supabaseAdmin
          .from('telegram_users')
          .update({
            linking_code: code,
            code_expires_at: expiresAt.toISOString()
          })
          .eq('user_id', userId)
      } else {
        // Create new entry with placeholder telegram_id
        await supabaseAdmin
          .from('telegram_users')
          .insert({
            telegram_id: -Date.now(), // Negative placeholder
            user_id: userId,
            linking_code: code,
            code_expires_at: expiresAt.toISOString()
          })
      }

      return new Response(
        JSON.stringify({
          success: true,
          code,
          expires_at: expiresAt.toISOString(),
          expires_in_seconds: 300
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // VERIFY: Validate a linking code and link accounts (called by bot)
    if (action === 'verify') {
      const { code, telegram_id, telegram_username } = await req.json()

      if (!code || !telegram_id) {
        return new Response(
          JSON.stringify({ error: 'Missing code or telegram_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Find the code
      const { data: linkData, error: linkError } = await supabaseAdmin
        .from('telegram_users')
        .select('user_id, code_expires_at')
        .eq('linking_code', code.toUpperCase())
        .maybeSingle()

      if (linkError || !linkData) {
        return new Response(
          JSON.stringify({ error: 'Code not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check expiration
      if (new Date(linkData.code_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Code expired' }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const userId = linkData.user_id

      // Check if this telegram_id is already linked to another account
      const { data: existingLink } = await supabaseAdmin
        .from('telegram_users')
        .select('user_id')
        .eq('telegram_id', telegram_id)
        .neq('user_id', userId)
        .maybeSingle()

      if (existingLink) {
        return new Response(
          JSON.stringify({ error: 'Telegram account already linked to another user' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Link the accounts
      // Update telegram_users entry
      await supabaseAdmin
        .from('telegram_users')
        .upsert({
          telegram_id,
          telegram_username,
          user_id: userId,
          linking_code: null,
          code_expires_at: null,
          last_active: new Date().toISOString()
        }, { onConflict: 'telegram_id' })

      // Update profile with telegram info
      await supabaseAdmin
        .from('profiles')
        .update({
          telegram_id,
          telegram_username
        })
        .eq('id', userId)

      // Link any existing telegram transactions
      await supabaseAdmin
        .from('telegram_transactions')
        .update({ user_id: userId })
        .eq('telegram_user_id', telegram_id)
        .is('user_id', null)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Accounts linked successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Link code error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Operation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
