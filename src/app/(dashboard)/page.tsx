
import { createClient } from '@/lib/supabase/server'
import { Users, Briefcase, FileCheck, TrendingUp, ChevronRight, Shield, ClipboardList, ArrowUpRight, Bell, Activity, Zap, Building2, Award } from 'lucide-react'
import Link from 'next/link'

const DOC_KEYS = ['w4','mw507','ssn_card','drivers_license','diploma','cpr_cert','tb_test','hipaa','handbook','background_consent','personal_data','payroll_schedule','emergency_contact','background_re']
function daysUntil(d:string|null):number|null { if(!d) return null; return Math.ceil((new Date(d).getTime()-Date.now())/(86400000)) }

export default async function DashboardPage() {
  const s = await createClient()
  const [{data:emps},{data:docs},{data:reqs},{data:cands},{data:depts}] = await Promise.all([
    s.from('employees').select('id,first_name,last_name,department_id,is_active,nursing_license_expiry,cpr_cert_expiry,tb_test_expiry,hipaa_training_expiry,background_check_status,created_at,employment_status').eq('is_active',true),
    s.from('employee_documents').select('employee_id,name,status'),
    s.from('requisitions').select('id,title,status,departments(name),number_of_openings,positions_filled').eq('status','open'),
    s.from('candidates').select('id,first_name,last_name,stage,applied_at,requisitions(title)').order('applied_at',{ascending:false}).limit(6),
    s.from('departments').select('id,name').eq('is_active',true),
  ])
  const empCount = emps?.length||0
  const deptCount = depts?.length||0
  const openReqs = reqs?.length||0
  const fullyOnboarded = (emps||[]).filter(e => { const d=(docs||[]).filter(x=>x.employee_id===e.id); return DOC_KEYS.every(k=>d.find((x:any)=>x.name===k&&x.status==='approved')) }).length
  const onboardPct = empCount>0 ? Math.round(fullyOnboarded/empCount*100) : 0
  const credAlerts = (emps||[]).flatMap(e=>[
    {emp:e,type:'Nursing License',expiry:e.nursing_license_expiry},
    {emp:e,type:'CPR Cert',expiry:e.cpr_cert_expiry},
    {emp:e,type:'TB Test',expiry:e.tb_test_expiry},
    {emp:e,type:'HIPAA',expiry:e.hipaa_training_expiry},
  ]).filter(r=>r.expiry&&daysUntil(r.expiry)!==null&&daysUntil(r.expiry)!<=90).sort((a,b)=>(daysUntil(a.expiry)||999)-(daysUntil(b.expiry)||999)).slice(0,5)
  const bgCleared = (emps||[]).filter(e=>e.background_check_status==='cleared').length
  const compPct = credAlerts.length===0?100:Math.max(0,100-credAlerts.length*8)
  const circ = 2*Math.PI*40
  const dashOff = circ-(compPct/100)*circ
  const activeCandsCount = (cands||[]).filter(c=>!['hired','dispositioned'].includes(c.stage)).length

  return (
    <div style={{minHeight:'100vh'}}>
      {/* === DARK HERO SECTION === */}
      <div style={{background:'linear-gradient(180deg, #0c1222 0%, #111827 100%)', padding:'32px 32px 48px 32px'}}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:32,animation:'fadeUp 0.5s ease-out'}}>
          <div>
            <h1 style={{fontSize:28,fontWeight:800,color:'#f8fafc',letterSpacing:'-0.025em',margin:0}}>Good {new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}</h1>
            <p style={{fontSize:14,color:'#64748b',marginTop:4}}>Here’s what’s happening at Beatrice Loving Heart today</p>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{padding:'8px 16px',borderRadius:12,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',color:'#94a3b8',fontSize:12,fontWeight:600}}>
              {new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
            </div>
          </div>
        </div>

        {/* Stat Cards - Glass on Dark */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:20}}>
          {/* Card 1: Employees */}
          <div style={{background:'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(6,78,59,0.15) 100%)',borderRadius:20,padding:24,border:'1px solid rgba(16,185,129,0.15)',position:'relative',overflow:'hidden',animation:'fadeUp 0.4s ease-out 0.05s both'}}>
            <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:'rgba(16,185,129,0.08)'}}/>
            <div style={{position:'relative',zIndex:1}}>
              <div style={{width:44,height:44,borderRadius:14,background:'rgba(16,185,129,0.2)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}>
                <Users style={{width:22,height:22,color:'#34d399'}}/>
              </div>
              <div style={{fontSize:36,fontWeight:800,color:'#f0fdf4',letterSpacing:'-0.03em',lineHeight:1}}>{empCount}</div>
              <div style={{fontSize:13,fontWeight:600,color:'#6ee7b7',marginTop:6}}>Active Employees</div>
              <div style={{fontSize:11,color:'#4ade80',marginTop:4,display:'flex',alignItems:'center',gap:4}}>
                <span style={{display:'inline-flex',alignItems:'center',gap:2,background:'rgba(16,185,129,0.15)',padding:'2px 8px',borderRadius:20,fontWeight:700}}>{deptCount} depts</span>
              </div>
            </div>
          </div>

          {/* Card 2: Onboarding */}
          <div style={{background:'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(29,78,216,0.15) 100%)',borderRadius:20,padding:24,border:'1px solid rgba(59,130,246,0.15)',position:'relative',overflow:'hidden',animation:'fadeUp 0.4s ease-out 0.1s both'}}>
            <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:'rgba(59,130,246,0.08)'}}/>
            <div style={{position:'relative',zIndex:1}}>
              <div style={{width:44,height:44,borderRadius:14,background:'rgba(59,130,246,0.2)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}>
                <ClipboardList style={{width:22,height:22,color:'#60a5fa'}}/>
              </div>
              <div style={{fontSize:36,fontWeight:800,color:'#eff6ff',letterSpacing:'-0.03em',lineHeight:1}}>{onboardPct}%</div>
              <div style={{fontSize:13,fontWeight:600,color:'#93c5fd',marginTop:6}}>Onboarding Rate</div>
              <div style={{marginTop:8,height:4,borderRadius:4,background:'rgba(59,130,246,0.15)',overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:4,background:'linear-gradient(90deg,#3b82f6,#60a5fa)',width:onboardPct+'%',animation:'fillBar 1.2s ease-out 0.5s both'}}/>
              </div>
              <div style={{fontSize:10,color:'#60a5fa',marginTop:4}}>{fullyOnboarded}/{empCount} complete</div>
            </div>
          </div>

          {/* Card 3: Recruiting */}
          <div style={{background:'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(91,33,182,0.15) 100%)',borderRadius:20,padding:24,border:'1px solid rgba(139,92,246,0.15)',position:'relative',overflow:'hidden',animation:'fadeUp 0.4s ease-out 0.15s both'}}>
            <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:'rgba(139,92,246,0.08)'}}/>
            <div style={{position:'relative',zIndex:1}}>
              <div style={{width:44,height:44,borderRadius:14,background:'rgba(139,92,246,0.2)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}>
                <Briefcase style={{width:22,height:22,color:'#a78bfa'}}/>
              </div>
              <div style={{fontSize:36,fontWeight:800,color:'#f5f3ff',letterSpacing:'-0.03em',lineHeight:1}}>{openReqs}</div>
              <div style={{fontSize:13,fontWeight:600,color:'#c4b5fd',marginTop:6}}>Open Positions</div>
              <div style={{fontSize:11,color:'#a78bfa',marginTop:4,display:'flex',alignItems:'center',gap:4}}>
                <span style={{display:'inline-flex',alignItems:'center',gap:2,background:'rgba(139,92,246,0.15)',padding:'2px 8px',borderRadius:20,fontWeight:700}}>{activeCandsCount} candidates</span>
              </div>
            </div>
          </div>

          {/* Card 4: Compliance Ring */}
          <div style={{background:'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(217,119,6,0.12) 100%)',borderRadius:20,padding:24,border:'1px solid rgba(251,191,36,0.12)',position:'relative',overflow:'hidden',animation:'fadeUp 0.4s ease-out 0.2s both'}}>
            <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',gap:16}}>
              <div style={{position:'relative',width:88,height:88,flexShrink:0}}>
                <svg viewBox="0 0 100 100" style={{width:88,height:88,transform:'rotate(-90deg)'}}>
                  <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.06)" strokeWidth="7" fill="none"/>
                  <circle cx="50" cy="50" r="40" stroke={compPct>=80?'#34d399':compPct>=50?'#fbbf24':'#f87171'} strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashOff} style={{animation:'ringDraw 1.5s ease-out 0.3s both'}}/>
                </svg>
                <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:22,fontWeight:800,color:compPct>=80?'#6ee7b7':compPct>=50?'#fde68a':'#fca5a5'}}>{compPct}%</span>
                </div>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'#fde68a'}}>Compliance</div>
                <div style={{fontSize:11,color:'#d97706',marginTop:2}}>{credAlerts.length} active alerts</div>
                <div style={{fontSize:11,color:'#92400e',marginTop:2}}>{bgCleared} BG cleared</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === LIGHT CONTENT SECTION === */}
      <div style={{background:'#f0f2f5',borderTopLeftRadius:24,borderTopRightRadius:24,marginTop:-24,padding:'32px 32px 48px 32px',minHeight:'50vh',position:'relative',zIndex:2}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20,marginBottom:20}}>
          {/* Credential Alerts */}
          <div style={{background:'#fff',borderRadius:16,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb',animation:'fadeUp 0.4s ease-out 0.1s both'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:32,height:32,borderRadius:10,background:'#fef3c7',display:'flex',alignItems:'center',justifyContent:'center'}}><Bell style={{width:16,height:16,color:'#d97706'}}/></div><span style={{fontSize:14,fontWeight:700,color:'#1e293b'}}>Expiring Credentials</span></div>
              <Link href="/compliance" style={{fontSize:12,fontWeight:600,color:'#10b981',textDecoration:'none',display:'flex',alignItems:'center',gap:2}}>View<ChevronRight style={{width:14,height:14}}/></Link>
            </div>
            {credAlerts.length===0?(
              <div style={{textAlign:'center',padding:'24px 0'}}><div style={{fontSize:28,marginBottom:4}}>✅</div><p style={{fontSize:13,color:'#94a3b8'}}>All credentials current</p></div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {credAlerts.map((a,i)=>{
                  const days=daysUntil(a.expiry); const exp=days!==null&&days<0
                  return(<div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,background:exp?'#fef2f2':'#fffbeb',border:exp?'1px solid #fecaca':'1px solid #fef08a'}}>
                    <div style={{width:32,height:32,borderRadius:8,background:exp?'#fee2e2':'#fef9c3',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:exp?'#dc2626':'#ca8a04',flexShrink:0}}>{a.emp.first_name[0]}{a.emp.last_name[0]}</div>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:'#1e293b'}}>{a.emp.first_name} {a.emp.last_name}</div><div style={{fontSize:10,color:'#94a3b8'}}>{a.type}</div></div>
                    <div style={{fontSize:11,fontWeight:700,color:exp?'#dc2626':'#f59e0b'}}>{exp?Math.abs(days!)+'d over':days+'d'}</div>
                  </div>)
                })}
              </div>
            )}
          </div>

          {/* Open Positions */}
          <div style={{background:'#fff',borderRadius:16,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb',animation:'fadeUp 0.4s ease-out 0.15s both'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:32,height:32,borderRadius:10,background:'#ede9fe',display:'flex',alignItems:'center',justifyContent:'center'}}><Briefcase style={{width:16,height:16,color:'#7c3aed'}}/></div><span style={{fontSize:14,fontWeight:700,color:'#1e293b'}}>Open Positions</span></div>
              <Link href="/recruiting" style={{fontSize:12,fontWeight:600,color:'#10b981',textDecoration:'none',display:'flex',alignItems:'center',gap:2}}>All<ChevronRight style={{width:14,height:14}}/></Link>
            </div>
            {!reqs||reqs.length===0?(
              <div style={{textAlign:'center',padding:'24px 0'}}><p style={{fontSize:13,color:'#94a3b8'}}>No open requisitions</p><Link href="/recruiting/new" style={{fontSize:12,fontWeight:600,color:'#7c3aed',textDecoration:'none'}}>Create one →</Link></div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {(reqs||[]).slice(0,4).map(r=>(<div key={r.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,background:'#faf5ff',border:'1px solid #e9d5ff'}}>
                  <div style={{width:32,height:32,borderRadius:8,background:'#ede9fe',display:'flex',alignItems:'center',justifyContent:'center'}}><Briefcase style={{width:14,height:14,color:'#7c3aed'}}/></div>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:'#1e293b'}}>{r.title}</div><div style={{fontSize:10,color:'#94a3b8'}}>{(r as any).departments?.name||''}</div></div>
                  <div style={{fontSize:11,fontWeight:700,color:'#7c3aed'}}>{r.positions_filled}/{r.number_of_openings}</div>
                </div>))}
              </div>
            )}
          </div>

          {/* Recent Candidates */}
          <div style={{background:'#fff',borderRadius:16,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb',animation:'fadeUp 0.4s ease-out 0.2s both'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:32,height:32,borderRadius:10,background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center'}}><Activity style={{width:16,height:16,color:'#2563eb'}}/></div><span style={{fontSize:14,fontWeight:700,color:'#1e293b'}}>Recent Candidates</span></div>
              <Link href="/recruiting" style={{fontSize:12,fontWeight:600,color:'#10b981',textDecoration:'none',display:'flex',alignItems:'center',gap:2}}>Pipeline<ChevronRight style={{width:14,height:14}}/></Link>
            </div>
            {!cands||cands.length===0?(
              <div style={{textAlign:'center',padding:'24px 0'}}><p style={{fontSize:13,color:'#94a3b8'}}>No candidates yet</p></div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {cands.map(c=>{
                  const sc:any={new:'#64748b',screening:'#2563eb',interviewing:'#7c3aed',offer:'#d97706',hired:'#059669',dispositioned:'#dc2626'}
                  const bg:any={new:'#f1f5f9',screening:'#dbeafe',interviewing:'#ede9fe',offer:'#fef3c7',hired:'#d1fae5',dispositioned:'#fee2e2'}
                  return(<div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:10,transition:'background 0.2s'}}>
                    <div style={{width:30,height:30,borderRadius:'50%',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#2563eb',flexShrink:0}}>{c.first_name[0]}{c.last_name[0]}</div>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:'#1e293b'}}>{c.first_name} {c.last_name}</div><div style={{fontSize:10,color:'#94a3b8'}}>{(c as any).requisitions?.title||''}</div></div>
                    <span style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:20,background:bg[c.stage]||'#f1f5f9',color:sc[c.stage]||'#64748b',textTransform:'uppercase',letterSpacing:'0.05em'}}>{c.stage}</span>
                  </div>)
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Row */}
        <div style={{animation:'fadeUp 0.4s ease-out 0.25s both'}}>
          <h2 style={{fontSize:14,fontWeight:700,color:'#374151',marginBottom:12,display:'flex',alignItems:'center',gap:6}}><Zap style={{width:16,height:16,color:'#f59e0b'}}/>Quick Actions</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12}}>
            {[
              {label:'New Req',href:'/recruiting/new',Icon:Briefcase,bg:'#ede9fe',color:'#7c3aed',ring:'#c4b5fd'},
              {label:'Documents',href:'/documents',Icon:FileCheck,bg:'#d1fae5',color:'#059669',ring:'#6ee7b7'},
              {label:'Offer Letter',href:'/offers/new',Icon:FileCheck,bg:'#dbeafe',color:'#2563eb',ring:'#93c5fd'},
              {label:'Compliance',href:'/compliance',Icon:Shield,bg:'#fef3c7',color:'#d97706',ring:'#fde68a'},
              {label:'Onboarding',href:'/onboarding',Icon:ClipboardList,bg:'#fce7f3',color:'#db2777',ring:'#f9a8d4'},
              {label:'Analytics',href:'/analytics',Icon:TrendingUp,bg:'#cffafe',color:'#0891b2',ring:'#67e8f9'},
            ].map(a=>(
              <Link key={a.label} href={a.href} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'16px 8px',borderRadius:14,background:'#fff',border:'1px solid #e5e7eb',textDecoration:'none',transition:'all 0.2s',boxShadow:'0 1px 2px rgba(0,0,0,0.03)'}}>
                <div style={{width:40,height:40,borderRadius:12,background:a.bg,display:'flex',alignItems:'center',justifyContent:'center'}}><a.Icon style={{width:18,height:18,color:a.color}}/></div>
                <span style={{fontSize:11,fontWeight:600,color:'#374151'}}>{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
