// ─── Admin Page ────────────────────────────────────────────────────────────
// Server-side gated page: redirects to /login if unauthenticated, to
// /dashboard if authenticated but not an admin. Only `role = 'admin'`
// profiles reach the AdminDashboard client component.
//
// Server-side pre-fetch: loads the full users list so the AdminDashboard
// renders immediately without a client-side loading state.
// ──────────────────────────────────────────────────────────────────────────

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminDashboard } from './AdminDashboard'

export const metadata = { title: 'Admin | FRC Scout Pro' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return <AdminDashboard users={users ?? []} />
}
