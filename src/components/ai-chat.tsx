'use client'
import{useState,useRef,useEffect}from'react'
import{Sparkles,X,Send,Loader2,Bot,User,Minimize2}from'lucide-react'

interface Msg{role:'user'|'assistant';content:string}

export function AiChat(){
  const[open,setOpen]=useState(false)
  const[msgs,setMsgs]=useState<Msg[]>([{role:'assistant',content:'Hi! I'm PrimeaHR AI, your intelligent HR assistant. I can help with employee onboarding, compliance questions, document status, and more. What can I help you with?'}])
  const[input,setInput]=useState('')
  const[loading,setLoading]=useState(false)
  const scrollRef=useRef<HTMLDivElement>(null)
  const inputRef=useRef<HTMLInputElement>(null)

  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight},[msgs])
  useEffect(()=>{if(open)setTimeout(()=>inputRef.current?.focus(),100)},[open])

  async function send(){
    if(!input.trim()||loading)return
    const userMsg:Msg={role:'user',content:input.trim()}
    const newMsgs=[...msgs,userMsg]
    setMsgs(newMsgs);setInput('');setLoading(true)
    try{
      const res=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:newMsgs.map(m=>({role:m.role,content:m.content}))})})
      const data=await res.json()
      setMsgs(prev=>[...prev,{role:'assistant',content:data.reply||'No response'}])
    }catch{setMsgs(prev=>[...prev,{role:'assistant',content:'Connection error. Please try again.'}])}
    setLoading(false)
  }

  const suggestions=['How many employees are onboarded?','What documents are required for new hires?','Explain COMAR 10.07.05 compliance','What are the open positions?']

  return(
    <>
      {/* Floating button */}
      {!open&&(
        <button onClick={()=>setOpen(true)} style={{position:'fixed',bottom:24,right:24,width:56,height:56,borderRadius:16,background:'linear-gradient(135deg,#7c3aed,#a78bfa)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 32px rgba(124,58,246,0.4)',zIndex:1000,transition:'transform 0.2s, box-shadow 0.2s',animation:'fadeUp 0.3s ease-out'}} onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.08)')} onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}>
          <Sparkles style={{width:24,height:24,color:'#fff'}}/>
        </button>
      )}

      {/* Chat panel */}
      {open&&(
        <div style={{position:'fixed',bottom:24,right:24,width:400,height:560,borderRadius:20,overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 24px 80px rgba(0,0,0,0.25)',zIndex:1000,animation:'fadeUp 0.3s ease-out',border:'1px solid rgba(255,255,255,0.1)'}}>
          {/* Header */}
          <div style={{background:'linear-gradient(135deg,#0f172a,#1e293b)',padding:'16px 20px',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
            <div style={{width:36,height:36,borderRadius:12,background:'linear-gradient(135deg,#7c3aed,#a78bfa)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Sparkles style={{width:18,height:18,color:'#fff'}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:'#f8fafc'}}>PrimeaHR AI</div>
              <div style={{fontSize:11,color:'#64748b'}}>Powered by Claude</div>
            </div>
            <button onClick={()=>setOpen(false)} style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,0.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8'}}>
              <X style={{width:16,height:16}}/>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:16,background:'#f8fafc',display:'flex',flexDirection:'column',gap:12}}>
            {msgs.map((m,i)=>(
              <div key={i} style={{display:'flex',gap:8,alignItems:m.role==='user'?'flex-end':'flex-start',flexDirection:m.role==='user'?'row-reverse':'row'}}>
                <div style={{width:28,height:28,borderRadius:8,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:m.role==='user'?'#10b981':'linear-gradient(135deg,#7c3aed,#a78bfa)'}}>
                  {m.role==='user'?<User style={{width:14,height:14,color:'#fff'}}/>:<Bot style={{width:14,height:14,color:'#fff'}}/>}
                </div>
                <div style={{maxWidth:'80%',padding:'10px 14px',borderRadius:m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',background:m.role==='user'?'#10b981':'#fff',color:m.role==='user'?'#fff':'#1e293b',fontSize:13,lineHeight:1.5,boxShadow:m.role==='user'?'none':'0 1px 3px rgba(0,0,0,0.06)',border:m.role==='user'?'none':'1px solid #e5e7eb',whiteSpace:'pre-wrap'}}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading&&(
              <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                <div style={{width:28,height:28,borderRadius:8,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#7c3aed,#a78bfa)'}}>
                  <Bot style={{width:14,height:14,color:'#fff'}}/>
                </div>
                <div style={{padding:'12px 16px',borderRadius:'14px 14px 14px 4px',background:'#fff',border:'1px solid #e5e7eb',display:'flex',gap:4,alignItems:'center'}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:'#a78bfa',animation:'pulse2 1s infinite'}}/>
                  <div style={{width:6,height:6,borderRadius:'50%',background:'#a78bfa',animation:'pulse2 1s infinite 0.2s'}}/>
                  <div style={{width:6,height:6,borderRadius:'50%',background:'#a78bfa',animation:'pulse2 1s infinite 0.4s'}}/>
                </div>
              </div>
            )}
            {msgs.length<=1&&!loading&&(
              <div style={{marginTop:8}}>
                <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Try asking</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {suggestions.map(s=>(
                    <button key={s} onClick={()=>{setInput(s);setTimeout(()=>send(),50)}} style={{textAlign:'left',padding:'8px 12px',borderRadius:10,background:'#fff',border:'1px solid #e5e7eb',fontSize:12,color:'#475569',cursor:'pointer',transition:'all 0.15s'}} onMouseEnter={e=>{e.currentTarget.style.background='#f0fdf4';e.currentTarget.style.borderColor='#10b981'}} onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.borderColor='#e5e7eb'}}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{padding:'12px 16px',background:'#fff',borderTop:'1px solid #e5e7eb',display:'flex',gap:8,flexShrink:0}}>
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Ask anything about HR..." style={{flex:1,padding:'10px 14px',borderRadius:12,border:'1px solid #e2e8f0',fontSize:13,outline:'none',background:'#f8fafc'}} disabled={loading}/>
            <button onClick={send} disabled={loading||!input.trim()} style={{width:40,height:40,borderRadius:12,background:input.trim()?'linear-gradient(135deg,#7c3aed,#a78bfa)':'#e2e8f0',border:'none',cursor:input.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s'}}>
              {loading?<Loader2 style={{width:16,height:16,color:'#fff',animation:'spin 1s linear infinite'}}/>:<Send style={{width:16,height:16,color:input.trim()?'#fff':'#94a3b8'}}/>}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
