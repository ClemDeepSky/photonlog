import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const url = Deno.env.get('SUPABASE_URL')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)
  const uid = user.id
  const db = createClient(url, service)

  const step = async (label: string, p: PromiseLike<{ error: unknown }>) => {
    const { error } = await p
    if (error) throw new Error(`${label}: ${(error as { message?: string }).message ?? error}`)
  }

  try {
    // Projects to delete: personal projects + projects of teams owned by the user
    const { data: ownedTeams } = await db.from('teams').select('id').eq('owner_id', uid)
    const teamIds: string[] = []
    // Hand each owned team to the longest-standing other member; delete only teams left empty
    for (const t of ownedTeams ?? []) {
      const { data: heir } = await db.from('team_members').select('user_id').eq('team_id', t.id)
        .neq('user_id', uid).order('joined_at', { ascending: true }).limit(1).maybeSingle()
      if (!heir) { teamIds.push(t.id); continue }
      await step('transfer team', db.from('teams').update({ owner_id: heir.user_id }).eq('id', t.id))
      await step('transfer role', db.from('team_members').update({ role: 'owner' }).eq('team_id', t.id).eq('user_id', heir.user_id))
      await step('transfer projects', db.from('projects').update({ created_by: heir.user_id }).eq('team_id', t.id).eq('created_by', uid))
    }
    const { data: personal } = await db.from('projects').select('id').eq('created_by', uid).is('team_id', null)
    let projectIds = (personal ?? []).map((p) => p.id)
    if (teamIds.length) {
      const { data: tp } = await db.from('projects').select('id').in('team_id', teamIds)
      projectIds = projectIds.concat((tp ?? []).map((p) => p.id))
    }

    // User contributions in other teams' projects
    const { data: contribs } = await db.from('project_contributions').select('id').eq('user_id', uid)
    const contribIds = (contribs ?? []).map((c) => c.id)

    const delChildren = async (col: 'project_id' | 'contribution_id', ids: string[]) => {
      if (!ids.length) return
      if (col === 'project_id') await step('batches', db.from('session_batches').delete().in('project_id', ids))
      await step('frames', db.from('project_frames').delete().in(col, ids))
      if (col === 'contribution_id') {
        const { data: s } = await db.from('project_sessions').select('id').in('contribution_id', ids)
        const sIds = (s ?? []).map((x) => x.id)
        if (sIds.length) await step('batches', db.from('session_batches').delete().in('session_id', sIds))
        const { data: a } = await db.from('project_acquisitions').select('id').in('contribution_id', ids)
        const aIds = (a ?? []).map((x) => x.id)
        if (aIds.length) await step('batches', db.from('session_batches').delete().in('acquisition_id', aIds))
        const { data: pn } = await db.from('project_panes').select('id').in('contribution_id', ids)
        const pIds = (pn ?? []).map((x) => x.id)
        if (pIds.length) await step('batches', db.from('session_batches').delete().in('pane_id', pIds))
      }
      await step('sessions', db.from('project_sessions').delete().in(col, ids))
      await step('acquisitions', db.from('project_acquisitions').delete().in(col, ids))
      await step('panes', db.from('project_panes').delete().in(col, ids))
    }

    await delChildren('contribution_id', contribIds)
    await step('contributions', db.from('project_contributions').delete().eq('user_id', uid))
    if (projectIds.length) {
      await delChildren('project_id', projectIds)
      await step('project contributions', db.from('project_contributions').delete().in('project_id', projectIds))
      await step('projects', db.from('projects').delete().in('id', projectIds))
    }
    if (teamIds.length) await step('teams', db.from('teams').delete().in('id', teamIds))

    // Detach user's sites/equipment from remaining shared rows, then delete them
    const { data: sites } = await db.from('observing_sites').select('id').eq('user_id', uid)
    const siteIds = (sites ?? []).map((s) => s.id)
    if (siteIds.length) {
      await step('detach sites', db.from('projects').update({ observing_site_id: null }).in('observing_site_id', siteIds))
      await step('detach sites c', db.from('project_contributions').update({ observing_site_id: null }).in('observing_site_id', siteIds))
    }
    const { data: eq } = await db.from('equipment_profiles').select('id').eq('user_id', uid)
    const eqIds = (eq ?? []).map((e) => e.id)
    if (eqIds.length) await step('detach equipment', db.from('project_contributions').update({ equipment_profile_id: null }).in('equipment_profile_id', eqIds))
    await step('sites', db.from('observing_sites').delete().eq('user_id', uid))
    await step('equipment', db.from('equipment_profiles').delete().eq('user_id', uid))
    await step('memberships', db.from('team_members').delete().eq('user_id', uid))

    // Storage files
    for (const [bucket, prefix] of [['avatars', uid], ['team-logos', `projects/${uid}`]] as const) {
      const { data: files } = await db.storage.from(bucket).list(prefix, { limit: 1000 })
      if (files?.length) await db.storage.from(bucket).remove(files.map((f) => `${prefix}/${f.name}`))
    }

    const { error } = await db.auth.admin.deleteUser(uid)
    if (error) throw error
    return json({ ok: true })
  } catch (e) {
    console.error(e)
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
