'use client'
import { useRef, useState, useEffect } from 'react'
import { Pen, Type, Upload, Eraser, Check } from 'lucide-react'
interface SignaturePadProps { onSave: (data: { image: string; type: 'drawn'|'typed'|'uploaded'; hash: string }) => void; width?: number; height?: number }
export function SignaturePad({ onSave, width = 500, height = 200 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<'draw'|'type'|'upload'>('draw')
  const [drawing, setDrawing] = useState(false)
  const [typedName, setTypedName] = useState('')
  const [typedFont, setTypedFont] = useState(0)
  const fonts = ['Dancing Script', 'Great Vibes', 'Allura', 'Sacramento']
  useEffect(() => { clearCanvas() }, [mode])
  function clearCanvas() {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.strokeStyle = '#cbd5e1'; ctx.setLineDash([4, 4])
    ctx.beginPath(); ctx.moveTo(20, c.height - 40); ctx.lineTo(c.width - 20, c.height - 40); ctx.stroke()
    ctx.setLineDash([])
  }
  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    if (mode !== 'draw') return; setDrawing(true)
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const rect = c.getBoundingClientRect()
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(x * (c.width/rect.width), y * (c.height/rect.height))
  }
  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing || mode !== 'draw') return
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const rect = c.getBoundingClientRect()
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.lineTo(x * (c.width/rect.width), y * (c.height/rect.height)); ctx.stroke()
  }
  function stopDraw() { setDrawing(false) }
  function renderTyped() {
    const c = canvasRef.current; if (!c || !typedName) return
    const ctx = c.getContext('2d'); if (!ctx) return
    clearCanvas()
    ctx.fillStyle = '#1e293b'; ctx.font = `italic 48px ${fonts[typedFont]}, cursive`
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
    ctx.fillText(typedName, c.width / 2, c.height - 45)
  }
  useEffect(() => { if (mode === 'type') renderTyped() }, [typedName, typedFont, mode])
  async function hashCanvas(): Promise<string> {
    const c = canvasRef.current; if (!c) return ''
    const data = c.toDataURL('image/png')
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  async function save() {
    const c = canvasRef.current; if (!c) return
    const image = c.toDataURL('image/png')
    const hash = await hashCanvas()
    onSave({ image, type: mode === 'draw' ? 'drawn' : mode === 'type' ? 'typed' : 'uploaded', hash })
  }
  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const c = canvasRef.current; if (!c) return
        const ctx = c.getContext('2d'); if (!ctx) return
        clearCanvas()
        const scale = Math.min((c.width - 40) / img.width, (c.height - 60) / img.height)
        const w = img.width * scale; const h = img.height * scale
        ctx.drawImage(img, (c.width - w) / 2, (c.height - 50 - h) / 2, w, h)
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50/50">
        {([['draw',Pen,'Draw'],['type',Type,'Type'],['upload',Upload,'Upload']] as const).map(([m,Icon,label])=>(
          <button key={m} onClick={()=>setMode(m)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode===m?'bg-white shadow-sm text-emerald-700 border border-emerald-200':'text-slate-500 hover:text-slate-700'}`}><Icon className="w-3.5 h-3.5"/>{label}</button>
        ))}
        <div className="flex-1"/>
        <button onClick={()=>{clearCanvas()}} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-red-500"><Eraser className="w-3.5 h-3.5"/>Clear</button>
      </div>
      {mode === 'type' && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100">
          <input type="text" value={typedName} onChange={e=>setTypedName(e.target.value)} placeholder="Type your full name" className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"/>
          <div className="flex gap-1">{fonts.map((f,i)=><button key={f} onClick={()=>setTypedFont(i)} className={`px-2 py-1 rounded text-xs ${typedFont===i?'bg-emerald-50 text-emerald-700 border border-emerald-200':'text-slate-400 hover:text-slate-600'}`} style={{fontFamily:f+',cursive',fontStyle:'italic'}}>Aa</button>)}</div>
        </div>
      )}
      {mode === 'upload' && (
        <div className="px-4 py-2 border-b border-slate-100">
          <input type="file" accept="image/*" onChange={handleUpload} className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"/>
        </div>
      )}
      <div className="p-4">
        <canvas ref={canvasRef} width={width} height={height} className="w-full border border-slate-200 rounded-xl cursor-crosshair touch-none" style={{aspectRatio:`${width}/${height}`}}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}/>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
        <p className="text-[10px] text-slate-400">By signing, you agree this is your legal signature. IP and timestamp will be recorded.</p>
        <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-medium hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/20"><Check className="w-3.5 h-3.5"/>Apply signature</button>
      </div>
    </div>
  )
}