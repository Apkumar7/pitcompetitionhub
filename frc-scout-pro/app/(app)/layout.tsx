import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { OfflineBanner } from '@/components/shared/OfflineBanner'
import { OnlineStatusSync } from '@/components/shared/OnlineStatusSync'
import type { Profile } from '@/types/database.types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const resolvedProfile: Profile = profile ?? {
    id: user.id,
    email: user.email ?? '',
    display_name: user.email ?? 'Scout',
    role: 'scout',
    team_number: null,
    team_role: null,
    created_at: new Date().toISOString(),
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#07070e]">
      <TopNav profile={resolvedProfile} />
      <OfflineBanner />
      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        {children}
      </main>
      <MobileNav />
      <OnlineStatusSync />
    </div>
  )
}
