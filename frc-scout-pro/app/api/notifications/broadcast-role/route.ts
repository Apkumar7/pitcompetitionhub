// POST /api/notifications/broadcast-role
// Sends a notification to every user whose team_role matches the given role.
// Used for: breakdown alerts → pit_crew, match results → drive_team.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const { title, body, type, team_role } = await req.json()
  if (!title || !team_role) {
    return NextResponse.json({ error: 'title and team_role are required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: targets } = await supabase
    .from('profiles')
    .select('id')
    .eq('team_role', team_role)

  if (!targets || targets.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const rows = targets.map((p: { id: string }) => ({
    user_id: p.id,
    title,
    body: body ?? null,
    type: type ?? 'info',
    read: false,
  }))

  const { error } = await supabase.from('notifications').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, sent: rows.length })
}
