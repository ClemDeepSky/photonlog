import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'Photonlog'
const SENDER_DOMAIN = 'notify.photonlog.app'
const ROOT_DOMAIN = 'photonlog.app'
const FROM_DOMAIN = 'notify.photonlog.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // Client scoped to the caller so RLS / is_team_admin run with their identity.
  const userClient = createClient(supabaseUrl, anonKey ?? serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let invitationId: string
  try {
    const body = await req.json()
    invitationId = body.invitation_id
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!invitationId || typeof invitationId !== 'string') {
    return new Response(JSON.stringify({ error: 'invitation_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: invitation } = await adminClient
    .from('team_invitations')
    .select('id, token, email, team_id, status, teams(name)')
    .eq('id', invitationId)
    .single()

  if (!invitation || invitation.status !== 'pending') {
    return new Response(JSON.stringify({ error: 'Invitation introuvable ou déjà utilisée' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: isAdmin } = await userClient.rpc('is_team_admin', { _team_id: invitation.team_id })
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const siteUrl = `https://${ROOT_DOMAIN}`
  const confirmationUrl = `${siteUrl}/invite/${invitation.token}`
  const teamName = (invitation.teams as { name?: string } | null)?.name ?? SITE_NAME

  const html = await renderAsync(
    React.createElement(InviteEmail, { siteName: SITE_NAME, siteUrl, confirmationUrl })
  )
  const text = await renderAsync(
    React.createElement(InviteEmail, { siteName: SITE_NAME, siteUrl, confirmationUrl }),
    { plainText: true }
  )

  const messageId = crypto.randomUUID()

  // Transactional (app) emails require an unsubscribe token for the recipient.
  let unsubscribeToken: string
  const { data: existingToken } = await adminClient
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', invitation.email)
    .maybeSingle()
  if (existingToken?.token) {
    unsubscribeToken = existingToken.token
  } else {
    unsubscribeToken = crypto.randomUUID()
    const { error: tokenError } = await adminClient.from('email_unsubscribe_tokens').insert({
      token: unsubscribeToken,
      email: invitation.email,
    })
    if (tokenError) {
      console.error('Failed to create unsubscribe token', { error: tokenError, invitationId })
    }
  }

  await adminClient.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'team-invite',
    recipient_email: invitation.email,
    status: 'pending',
  })

  const { error: enqueueError } = await adminClient.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      idempotency_key: messageId,
      to: invitation.email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: `Rejoignez ${teamName} sur Photonlog`,
      html,
      text,
      purpose: 'transactional',
      label: 'team-invite',
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('Failed to enqueue team invite email', { error: enqueueError, invitationId })
    await adminClient.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'team-invite',
      recipient_email: invitation.email,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    return new Response(JSON.stringify({ error: "Échec de l'envoi de l'email" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Team invite email enqueued', { invitationId, email: invitation.email })
  return new Response(JSON.stringify({ success: true, queued: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
