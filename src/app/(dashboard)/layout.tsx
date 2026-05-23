import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const s = await createClient()
  const { data: { user: authUser } } = await s.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: emp } = await s.from('employees').select('first_name, last_name, user_role, avatar_url').eq('auth_user_id', authUser.id).single()
  const user = {
    name: emp ? `${emp.first_name} ${emp.last_name}` : authUser.email?.split('@')[0] || 'User',
    email: authUser.email || '',
    role: (emp?.user_role || 'employee') as any,
    avatarUrl: emp?.avatar_url || null
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  )
}
