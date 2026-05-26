// ─── Notification Create Route ─────────────────────────────────────────────
// POST /api/notifications/create
//
// Body: { title, body?, type?, user_id? }
//   user_id  → create for one specific user
//   omitted  → broadcast to ALL profiles (used for event sync announcements)
//
// Uses the service role client so it can write to notifications regardless
// of RLS. Called from:
//   • Signup  → welcome notification for the new user
//   • Sync    → "Event synced" broadcast
//   • Scouting submission → "New scouting data" alert for lead/admin users
// ──────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const { title, body, type, user_id } = await req.json()

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  if (user_id) {
    // Single-user notification
    const { error } = await supabase.from('notifications').insert({
      user_id,
      title,
      body: body ?? null,
      type: type ?? 'info',
      read: false,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Broadcast: send to every profile
    const { data: profiles } = await supabase.from('profiles').select('id')
    const rows = (profiles ?? []).map((p: { id: string }) => ({
      user_id: p.id,
      title,
      body: body ?? null,
      type: type ?? 'info',
      read: false,
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('notifications').insert(rows)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
