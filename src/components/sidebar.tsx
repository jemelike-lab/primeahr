'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Heart, LayoutDashboard, Users, Building2, Briefcase, FileText, ClipboardCheck, ClipboardList, BarChart3, Shield, Settings, LogOut, ChevronLeft, Menu, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { UserRole } from '@/types/database'

interface SidebarProps { user: { name: string; email: string; role: UserRole; avatarUrl: string|null } }

const nav:{name:string;href:string;icon:any;soon?:boolean;badge?:string}[] = [
  {name:'Dashboard',href:'/',icon:LayoutDashboard},
  {name:'Employees',href:'/employees',icon:Users},
  {name:'Departments',href:'/departments',icon:Building2},
  {name:'Roles',href:'/roles',icon:Briefcase},
  {name:'Recruiting',href:'/recruiting',icon:ClipboardCheck},
  {name:'Offer Letters',href:'/offers',icon:FileText},
  {name:'Documents',href:'/documents',icon:FileText},
  {name:'Onboarding',href:'/onboarding',icon:ClipboardList},
  {name:'Analytics',href:'/analytics',icon:BarChart3},
  {name:'Compliance',href:'/compliance',icon:Shield},
  {name:'Settings',href:'/settings',icon:Settings},
]

export function Sidebar({user}:SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const supabase = createClient()

  async function handleSignOut() { await supabase.auth.signOut(); router.push('/login'); router.refresh() }
  const isActive = (h:string)=> h==='/' ? pathname==='/' : pathname.startsWith(h)
  const rl:any = {admin:'Administrator',hr_manager:'HR Manager',manager:'Manager',employee:'Employee'}

  return(<>
    {/* Mobile toggle */}
    <button onClick={()=>setMobileOpen(true)} className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-slate-900 text-white shadow-lg"><Menu className="w-5 h-5"/></button>

    {/* Overlay */}
    {mobileOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={()=>setMobileOpen(false)}/>}

    {/* Sidebar */}
    <aside className={`fixed lg:relative z-40 h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 transition-all duration-300 ${mobileOpen?'translate-x-0':'-translate-x-full lg:translate-x-0'} ${collapsed?'w-[68px]':'w-64'} flex flex-col`}>

      {/* Logo */}
      <div className={`flex items-center gap-3 px-5 py-5 border-b border-white/5 ${collapsed?'justify-center px-3':''}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
          <Heart className="w-5 h-5 text-white" fill="white"/>
        </div>
        {!collapsed && <div className="min-w-0"><h1 className="text-sm font-bold text-white tracking-tight">PrimeaHR</h1><p className="text-[10px] text-slate-400 truncate">Beatrice Loving Heart</p></div>}
      </div>

      {/* Collapse toggle */}
      <button onClick={()=>setCollapsed(!collapsed)} className="hidden lg:flex absolute -right-3 top-16 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-50">
        <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${collapsed?'rotate-180':''}`}/>
      </button>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map((item,i) => {
          const active = isActive(item.href)
          return (
            <Link key={item.name} href={item.soon?'#':item.href} onClick={()=>setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                ${active
                  ? 'bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 text-emerald-400 shadow-sm shadow-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}
                ${item.soon ? 'opacity-40 cursor-not-allowed' : ''}`}
              style={{animationDelay: `${i*30}ms`}}>
              <div className={`flex-shrink-0 ${active?'text-emerald-400':'text-slate-500 group-hover:text-slate-300'} transition-colors`}>
                <item.icon className="w-[18px] h-[18px]"/>
              </div>
              {!collapsed && (
                <span className="truncate">{item.name}</span>
              )}
              {!collapsed && active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>}
              {!collapsed && item.soon && <span className="ml-auto text-[9px] uppercase tracking-wider text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded-full">Soon</span>}
            </Link>
          )
        })}
      </nav>

      {/* AI badge */}
      {!collapsed && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/10">
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-300"><Sparkles className="w-3.5 h-3.5"/>AI-Powered Platform</div>
          <p className="text-[10px] text-slate-500 mt-1">Claude API · Smart Forms · OCR</p>
        </div>
      )}

      {/* User */}
      <div className={`border-t border-white/5 px-3 py-3 ${collapsed?'px-2':''}`}>
        <div className={`flex items-center gap-3 ${collapsed?'justify-center':''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.name.split(' ').map((n:string)=>n[0]).join('').slice(0,2)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{rl[user.role]||user.role}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleSignOut} title="Sign out" className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut className="w-4 h-4"/>
            </button>
          )}
        </div>
      </div>
    </aside>
  </>)
}
