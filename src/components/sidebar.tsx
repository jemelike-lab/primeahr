'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Heart, LayoutDashboard, Users, Building2, Briefcase, FileText, ClipboardCheck, ClipboardList, BarChart3, Shield, Settings, LogOut, ChevronLeft, Menu, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { UserRole } from '@/types/database'

interface SidebarProps { user: { name: string; email: string; role: UserRole; avatarUrl: string|null } }

const nav:{name:string;href:string;icon:any}[] = [
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

const SIDEBAR = '#1c2b2a'
const ACCENT = '#e08a3c'

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
    <button onClick={()=>setMobileOpen(true)} className="lg:hidden fixed top-4 left-4 z-50" style={{padding:8,borderRadius:12,background:SIDEBAR,color:'#fff',boxShadow:'0 4px 12px rgba(0,0,0,0.18)'}}><Menu className="w-5 h-5"/></button>

    {/* Overlay */}
    {mobileOpen && <div className="lg:hidden fixed inset-0 z-40" style={{background:'rgba(28,43,42,0.5)',backdropFilter:'blur(2px)'}} onClick={()=>setMobileOpen(false)}/>}

    {/* Sidebar */}
    <aside className={`fixed lg:relative z-40 h-full transition-all duration-300 ${mobileOpen?'translate-x-0':'-translate-x-full lg:translate-x-0'} ${collapsed?'w-[68px]':'w-64'} flex flex-col`} style={{background:SIDEBAR}}>

      {/* Brand */}
      <div className={`flex items-center gap-3 px-5 py-5 ${collapsed?'justify-center px-3':''}`} style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <div style={{width:36,height:36,borderRadius:11,background:ACCENT,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 8px rgba(224,138,60,0.4)'}}>
          <Heart className="w-5 h-5" style={{color:'#fff'}} fill="#fff"/>
        </div>
        {!collapsed && <div className="min-w-0"><h1 style={{fontSize:15,fontWeight:800,color:'#fff',letterSpacing:'-0.02em',margin:0}}>PrimeaHR</h1><p style={{fontSize:10,color:'#8fa09e',margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>Beatrice Loving Heart</p></div>}
      </div>

      {/* Collapse toggle */}
      <button onClick={()=>setCollapsed(!collapsed)} className="hidden lg:flex absolute -right-3 top-16 items-center justify-center z-50" style={{width:24,height:24,borderRadius:'50%',background:'#26403e',border:'1px solid rgba(255,255,255,0.1)',color:'#8fa09e'}}>
        <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${collapsed?'rotate-180':''}`}/>
      </button>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" style={{display:'flex',flexDirection:'column',gap:3}}>
        {nav.map((item) => {
          const active = isActive(item.href)
          return (
            <Link key={item.name} href={item.href} onClick={()=>setMobileOpen(false)}
              className={`group ${collapsed?'justify-center':''}`}
              style={{display:'flex',alignItems:'center',gap:12,padding:collapsed?'10px 0':'10px 12px',borderRadius:10,fontSize:13.5,fontWeight:active?700:500,textDecoration:'none',transition:'all 0.18s',
                background:active?ACCENT:'transparent',
                color:active?'#fff':'#b6c2c0',
                boxShadow:active?'0 2px 8px rgba(224,138,60,0.35)':'none'}}>
              <item.icon className="w-[18px] h-[18px]" style={{flexShrink:0,color:active?'#fff':'#8fa09e'}}/>
              {!collapsed && <span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* AI badge */}
      {!collapsed && (
        <div style={{margin:'0 12px 12px',padding:12,borderRadius:11,background:'rgba(224,138,60,0.1)',border:'1px solid rgba(224,138,60,0.18)'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,color:'#f0b27e'}}><Sparkles className="w-3.5 h-3.5"/>AI-Powered Platform</div>
          <p style={{fontSize:10,color:'#8fa09e',marginTop:3}}>Claude API · Smart Forms · OCR</p>
        </div>
      )}

      {/* User */}
      <div className={`px-3 py-3 ${collapsed?'px-2':''}`} style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
        <div className={`flex items-center gap-3 ${collapsed?'justify-center':''}`}>
          <div style={{width:34,height:34,borderRadius:'50%',background:ACCENT,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>
            {user.name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p style={{fontSize:12.5,fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',margin:0}}>{user.name}</p>
              <p style={{fontSize:10,color:'#8fa09e',margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{rl[user.role]||user.role}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleSignOut} title="Sign out" style={{padding:7,borderRadius:9,background:'transparent',border:'none',cursor:'pointer',color:'#8fa09e',transition:'all 0.18s'}} className="hover:!text-white">
              <LogOut className="w-4 h-4"/>
            </button>
          )}
        </div>
      </div>
            <div style={{textAlign:"center",fontSize:9,color:"#5a6b69",padding:"8px 12px",lineHeight:1.3}}>Protected by PrimeaHR &middot; 256-bit encryption<br/>Built and powered by VELOX &ldquo;Automated Operations&rdquo; LLC</div>
    </aside>
  </>)
}
