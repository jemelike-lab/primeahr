import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: employee } = await supabase.from('employees').select('id, first_name, last_name, email, user_role, avatar_url').eq('auth_user_id', user.id).single()
  return (<div className="flex h-screen bg-slate-50"><Sidebar user={{ name: employee ? `${employee.first_name} ${employee.last_name}` : user.email || 'User', email: employee?.email || user.email || '', role: employee?.user_role || 'employee', avatarUrl: employee?.avatar_url || null }} /><main className="flex-1 overflow-auto"><div className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</div></main></div>)
}