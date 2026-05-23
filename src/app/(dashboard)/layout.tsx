import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { AiChat } from '@/components/ai-chat'

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
    <div className="flex h-screen" style={{background:'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'}}>
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto" style={{background:'rgba(241,245,249,0.92)',backdropFilter:'blur(20px)'}}>{children}<AiChat/></main>
    </div>
  )
}
