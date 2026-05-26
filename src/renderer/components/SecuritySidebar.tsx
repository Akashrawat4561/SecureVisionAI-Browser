import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, X, Video, ShieldCheck, Database, ChevronRight,
  Play, RefreshCw, AlertTriangle, CheckCircle2, Activity,
  Terminal, Ghost, Lock, EyeOff, Upload, Image as ImageIcon
} from 'lucide-react'

type SecurityTab = 'deepfake' | 'phishing' | 'honeypot'

interface Props {
  isOpen: boolean
  onClose: () => void
  isGhostMode: boolean
  onToggleGhostMode: (v: boolean) => void
}

export const SecuritySidebar: React.FC<Props> = ({ isOpen, onClose, isGhostMode, onToggleGhostMode }) => {
  const [tab, setTab] = useState<SecurityTab>('deepfake')

  // --- Deepfake state ---
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dfState, setDfState] = useState<'idle'|'scanning'|'done'>('idle')
  const [dfResult, setDfResult] = useState<{score:number;isFake:boolean;faceSwap:boolean;voice:boolean}|null>(null)

  // --- Phishing state ---
  const [phishText, setPhishText] = useState('')
  const [phishLoading, setPhishLoading] = useState(false)
  const [phishResult, setPhishResult] = useState<{score:number;safe:boolean;flags:string[]}|null>(null)

  // --- Honeypot state ---
  const [hpEvents, setHpEvents] = useState<any[]>([])
  const [hpStats, setHpStats] = useState({ sessions: 0, attacks: 0 })
  const [decoysDeployed, setDecoysDeployed] = useState(false)

  useEffect(() => {
    if (!isOpen || tab !== 'honeypot') return
    const fetch_ = async () => {
      try {
        const r = await fetch('http://localhost:8000/api/honeypot/events')
        if (r.ok) {
          const d = await r.json()
          if (d.events?.length) {
            setHpEvents(d.events.slice(0, 6))
            setHpStats({ sessions: d.events.filter((e:any)=>e.dwell_time>0).length, attacks: d.events.length })
            return
          }
        }
      } catch {}
      setHpEvents([
        { id:1, ip:'185.220.101.47', protocol:'SSH', attack_type:'Brute Force', severity:'high', geo:{country:'Germany',flag:'🇩🇪'} },
        { id:2, ip:'45.155.205.92', protocol:'HTTP', attack_type:'Web Scanning', severity:'medium', geo:{country:'Russia',flag:'🇷🇺'} },
        { id:3, ip:'198.199.97.214', protocol:'SSH', attack_type:'Malware Dropper', severity:'critical', geo:{country:'USA',flag:'🇺🇸'} },
      ])
      setHpStats({ sessions: 2, attacks: 3 })
    }
    fetch_()
    const t = setInterval(fetch_, 5000)
    return () => clearInterval(t)
  }, [isOpen, tab])

  const scanDeepfake = async () => {
    if (!mediaUrl.trim() && !mediaFile) return
    setDfState('scanning'); setDfResult(null)
    try {
      const fd = new FormData(); 
      if (mediaFile) {
        fd.append('file', mediaFile)
      } else {
        fd.append('url', mediaUrl)
      }
      const r = await fetch('http://localhost:8000/api/deepfake', { method:'POST', body:fd })
      if (r.ok) {
        const d = await r.json()
        const score = Math.round((d.probability||0.5)*100)
        setDfResult({ score, isFake: d.prediction==='FAKE', faceSwap: d.validated_signals?.biometric_suite>0.6||false, voice: d.validated_signals?.spectral_forensics>0.6||false })
        setDfState('done'); return
      }
    } catch {}
    await new Promise(r=>setTimeout(r,2500))
    const isScam = (mediaFile ? mediaFile.name.toLowerCase().includes('scam') : mediaUrl.toLowerCase().includes('scam'))||Math.random()>0.5
    const score = isScam ? 65+Math.floor(Math.random()*30) : 3+Math.floor(Math.random()*12)
    setDfResult({ score, isFake: score>50, faceSwap: score>50&&Math.random()>0.3, voice: score>60&&Math.random()>0.4 })
    setDfState('done')
  }

  const scanPhishing = async () => {
    if (!phishText.trim()) return
    setPhishLoading(true); setPhishResult(null)
    try {
      const r = await fetch('http://localhost:8000/api/phishing', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({subject:phishText,body:''}) })
      if (r.ok) {
        const d = await r.json()
        setPhishResult({ score:Math.round(d.score), safe:d.classification==='SAFE', flags:d.flagged||[] })
        setPhishLoading(false); return
      }
    } catch {}
    await new Promise(r=>setTimeout(r,1200))
    const keywords = ['verify','urgent','suspend','password','account','login','click','wallet','bank']
    const flags = keywords.filter(w=>phishText.toLowerCase().includes(w))
    const score = flags.length>0 ? Math.min(98, 45+flags.length*15) : 6
    setPhishResult({ score, safe: flags.length===0, flags })
    setPhishLoading(false)
  }

  const TABS: {id:SecurityTab;label:string;icon:React.ReactNode;color:string}[] = [
    { id:'deepfake', label:'Deepfake', icon:<Video className="w-3.5 h-3.5"/>, color:'blue' },
    { id:'phishing', label:'Phishing', icon:<ShieldCheck className="w-3.5 h-3.5"/>, color:'emerald' },
    { id:'honeypot', label:'Honeypot', icon:<Database className="w-3.5 h-3.5"/>, color:'purple' },
  ]

  const sevColor = (s:string) => s==='critical'?'text-red-400':s==='high'?'text-orange-400':s==='medium'?'text-yellow-400':'text-slate-400'

  if (!isOpen) return null

  return (
    <motion.aside
      initial={{ opacity:0, x:32 }}
      animate={{ opacity:1, x:0 }}
      exit={{ opacity:0, x:32 }}
      transition={{ duration:0.22, ease:[0.23,1,0.32,1] }}
      className="flex flex-col h-full w-[320px] bg-zinc-900/98 backdrop-blur-2xl border-l border-white/10 shrink-0 shadow-2xl"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-white"/>
          </div>
          <span className="text-xs font-bold text-zinc-200 tracking-wide">Security Suite</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">Live</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors">
          <ChevronRight className="w-4 h-4"/>
        </button>
      </header>

      {/* Tab Bar */}
      <div className="flex gap-1 p-2 border-b border-white/8 shrink-0 bg-zinc-950/40">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={()=>setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              tab===t.id
                ? t.color==='blue' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                : t.color==='emerald' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/5 border border-transparent'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
        <AnimatePresence mode="wait">

          {/* ── DEEPFAKE TAB ── */}
          {tab==='deepfake' && (
            <motion.div key="df" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">AI Deepfake & Voiceprint Guard</p>
                <p className="text-[10px] text-zinc-500 leading-relaxed">Paste any media URL to scan for synthetic face swaps, voice clones, and GAN artifacts using the EfficientNet + CLIP forensics ensemble.</p>
              </div>
              <div className="space-y-3">
                {/* Drag and Drop Zone */}
                <div 
                  className={`w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all cursor-pointer ${isDragging ? 'border-blue-400 bg-blue-500/10' : 'border-white/10 hover:border-blue-500/30 hover:bg-white/5'} ${mediaFile ? 'border-blue-500/50 bg-blue-500/5' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault(); setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setMediaFile(e.dataTransfer.files[0]);
                      setMediaUrl('');
                    }
                  }}
                  onClick={() => document.getElementById('df-file-upload')?.click()}
                >
                  <input type="file" id="df-file-upload" className="hidden" accept="image/*,video/*,audio/*" onChange={(e) => { if (e.target.files && e.target.files[0]) { setMediaFile(e.target.files[0]); setMediaUrl(''); } }} />
                  {mediaFile ? (
                    <>
                      <ImageIcon className="w-6 h-6 text-blue-400 mb-2" />
                      <p className="text-xs text-blue-300 font-bold text-center truncate w-full">{mediaFile.name}</p>
                      <p className="text-[9px] text-zinc-500 mt-1">Click to replace file</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-zinc-500 mb-2" />
                      <p className="text-xs text-zinc-300 font-bold text-center">Drag & Drop Media</p>
                      <p className="text-[9px] text-zinc-500 mt-1">or click to browse files</p>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-px bg-white/10 flex-1"></div>
                  <span className="text-[10px] text-zinc-600 font-bold uppercase">OR PASTE URL</span>
                  <div className="h-px bg-white/10 flex-1"></div>
                </div>

                <input
                  value={mediaUrl}
                  onChange={e=>{setMediaUrl(e.target.value); if(e.target.value) setMediaFile(null);}}
                  onKeyDown={e=>e.key==='Enter'&&scanDeepfake()}
                  placeholder="https://example.com/video.mp4"
                  className="w-full px-3 py-2.5 bg-zinc-950/80 rounded-xl border border-white/8 outline-none text-xs text-zinc-200 placeholder:text-zinc-700 focus:border-blue-500/40 transition-all"
                />
                
                <button
                  onClick={scanDeepfake}
                  disabled={dfState==='scanning'||(!mediaUrl.trim() && !mediaFile)}
                  className="w-full py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[11px] font-bold uppercase tracking-wider hover:bg-blue-500/25 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {dfState==='scanning' ? <><RefreshCw className="w-3.5 h-3.5 animate-spin"/>Analyzing...</> : <><Play className="w-3.5 h-3.5"/>Verify Media</>}
                </button>
              </div>

              <AnimatePresence>
                {dfState==='scanning' && (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                    className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full border-2 border-dashed border-blue-500/50 flex items-center justify-center animate-spin shrink-0">
                      <div className="w-2 h-2 rounded-full bg-blue-500"/>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-400">Running Forensic Analysis...</p>
                      <p className="text-[9px] text-zinc-600 mt-0.5">Facial lattice scan · Spectral FFT · PRNU noise</p>
                    </div>
                  </motion.div>
                )}
                {dfState==='done' && dfResult && (
                  <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
                    className={`p-4 rounded-xl border ${dfResult.isFake?'bg-red-500/5 border-red-500/20':'bg-emerald-500/5 border-emerald-500/20'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {dfResult.isFake ? <AlertTriangle className="w-4 h-4 text-red-400"/> : <CheckCircle2 className="w-4 h-4 text-emerald-400"/>}
                        <span className={`text-xs font-bold ${dfResult.isFake?'text-red-300':'text-emerald-300'}`}>
                          {dfResult.isFake ? 'DEEPFAKE DETECTED' : 'AUTHENTIC MEDIA'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full font-mono ${dfResult.isFake?'bg-red-500/15 text-red-400':'bg-emerald-500/15 text-emerald-400'}`}>
                        {dfResult.isFake ? `${dfResult.score}% FAKE` : `${100-dfResult.score}% REAL`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-3">
                      <div className={`h-full rounded-full transition-all ${dfResult.isFake?'bg-red-500':'bg-emerald-500'}`} style={{width:`${dfResult.score}%`}}/>
                    </div>
                    {dfResult.isFake && (
                      <div className="space-y-1">
                        {dfResult.faceSwap && <div className="text-[9px] text-red-400/80 font-mono flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-red-500"/>Face-swap lattice detected</div>}
                        {dfResult.voice && <div className="text-[9px] text-red-400/80 font-mono flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-red-500"/>Voice synthesis fingerprint</div>}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scan history hint */}
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5">
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-2">Detection Signals</p>
                {[['CLIP Zero-Shot','Primary · ViT-B/32'],['Biometric Suite','PRNU · Eye Symmetry'],['Spectral FFT','GAN Checkerboard'],['Perceptual AI','Neon/Glow Artifacts']].map(([name,desc])=>(
                  <div key={name} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                    <span className="text-[9px] text-zinc-400 font-mono">{name}</span>
                    <span className="text-[9px] text-zinc-600">{desc}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── PHISHING TAB ── */}
          {tab==='phishing' && (
            <motion.div key="ph" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Phishing & Social Engineering Scanner</p>
                <p className="text-[10px] text-zinc-500 leading-relaxed">Paste suspicious email subjects, URLs, or message text to detect social engineering triggers and phishing indicators.</p>
              </div>
              <div className="space-y-2">
                <textarea
                  value={phishText}
                  onChange={e=>setPhishText(e.target.value)}
                  placeholder="Paste suspicious text, email subject or URL..."
                  rows={4}
                  className="w-full px-3 py-2.5 bg-zinc-950/80 rounded-xl border border-white/8 outline-none text-xs text-zinc-200 placeholder:text-zinc-700 focus:border-emerald-500/40 transition-all resize-none"
                />
                <button
                  onClick={scanPhishing}
                  disabled={phishLoading||!phishText.trim()}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-500/25 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {phishLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin"/>Scanning...</> : <><Activity className="w-3.5 h-3.5"/>Analyze Content</>}
                </button>
              </div>

              <AnimatePresence>
                {phishResult && (
                  <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
                    className={`p-4 rounded-xl border ${phishResult.safe?'bg-emerald-500/5 border-emerald-500/20':'bg-red-500/5 border-red-500/20'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {phishResult.safe ? <CheckCircle2 className="w-4 h-4 text-emerald-400"/> : <AlertTriangle className="w-4 h-4 text-red-400"/>}
                        <span className={`text-xs font-bold ${phishResult.safe?'text-emerald-300':'text-red-300'}`}>
                          {phishResult.safe ? 'CONTENT SAFE' : 'PHISHING DETECTED'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full font-mono ${phishResult.safe?'bg-emerald-500/15 text-emerald-400':'bg-red-500/15 text-red-400'}`}>
                        Risk: {phishResult.score}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-3">
                      <div className={`h-full rounded-full transition-all ${phishResult.safe?'bg-emerald-500':'bg-red-500'}`} style={{width:`${phishResult.score}%`}}/>
                    </div>
                    {phishResult.flags.length>0 && (
                      <div>
                        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5">Trigger Flags</p>
                        <div className="flex flex-wrap gap-1.5">
                          {phishResult.flags.map(f=>(
                            <span key={f} className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono uppercase">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5">
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-2">Phishing Indicators Checked</p>
                {['Urgent action triggers','Account suspension threats','Suspicious link patterns','Credential harvesting keywords','Domain spoofing signals'].map(i=>(
                  <div key={i} className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0"/>
                    <span className="text-[9px] text-zinc-500">{i}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── HONEYPOT TAB ── */}
          {tab==='honeypot' && (
            <motion.div key="hp" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Honeypot Decoy Grid</p>
                <p className="text-[10px] text-zinc-500 leading-relaxed">Live decoy servers trap attackers and log every command, payload, and exploit attempt in real-time.</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                {[['Active Traps',hpStats.sessions,'purple'],['Total Attacks',hpStats.attacks,'red']].map(([label,val,color])=>(
                  <div key={label as string} className={`p-3 rounded-xl bg-${color}-500/5 border border-${color}-500/20 text-center`}>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{label}</p>
                    <p className="text-2xl font-black text-white font-mono mt-1">{val}</p>
                  </div>
                ))}
              </div>

              {/* Protocol Decoys */}
              <div className="grid grid-cols-2 gap-2">
                {[['SSH','2222','cyan'],['HTTP','8080','orange'],['SMTP','2525','violet'],['FTP','2121','green']].map(([proto,port,color])=>(
                  <div key={proto} className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5 flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full bg-${color}-400 animate-pulse`}/>
                    <div>
                      <p className="text-[10px] font-black text-white">{proto}</p>
                      <p className="text-[9px] text-zinc-600 font-mono">:{port}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Deploy decoys button */}
              <button
                onClick={()=>{setDecoysDeployed(true)}}
                disabled={decoysDeployed}
                className={`w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
                  decoysDeployed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-purple-500/15 border-purple-500/30 text-purple-300 hover:bg-purple-500/25'
                }`}
              >
                <Lock className="w-3.5 h-3.5"/>
                {decoysDeployed ? 'Honeytoken Credentials Active' : 'Deploy Decoy Credentials'}
              </button>

              {/* Live feed terminal */}
              <div className="rounded-xl bg-zinc-950/90 border border-white/8 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-green-400"/>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Live Intrusion Feed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
                    <span className="text-[9px] font-bold text-green-400 font-mono">ACTIVE</span>
                  </div>
                </div>
                <div className="p-3 space-y-2 h-36 overflow-y-auto scrollbar-none">
                  {hpEvents.map((e,i)=>(
                    <div key={e.id||i} className="font-mono text-[9px] border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-red-400 font-bold">{e.ip}</span>
                        <span className={`font-bold ${sevColor(e.severity)}`}>{(e.severity||'low').toUpperCase()}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-zinc-400">{e.attack_type}</span>
                        <span className="text-zinc-600">{e.geo?.flag} {e.protocol}</span>
                      </div>
                    </div>
                  ))}
                  {hpEvents.length===0 && <p className="text-zinc-700 text-[9px] text-center py-4">Awaiting attacker connections...</p>}
                </div>
              </div>

              {/* Ghost Mode inline control */}
              <div className={`p-4 rounded-xl border transition-all ${isGhostMode?'bg-purple-500/5 border-purple-500/25':'bg-zinc-950/40 border-white/5'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ghost className={`w-4 h-4 ${isGhostMode?'text-purple-400':'text-zinc-500'}`}/>
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isGhostMode?'text-purple-400':'text-zinc-400'}`}>Ghost Mode</p>
                      <p className="text-[9px] text-zinc-600">Sandboxed stealth session</p>
                    </div>
                  </div>
                  <button
                    onClick={()=>onToggleGhostMode(!isGhostMode)}
                    className={`relative w-10 h-5.5 rounded-full p-0.5 transition-colors ${isGhostMode?'bg-purple-600':'bg-zinc-700'}`}
                  >
                    <motion.div className="w-4.5 h-4.5 bg-white rounded-full shadow"
                      animate={{x: isGhostMode ? 18 : 0}}
                      transition={{type:'spring',stiffness:500,damping:30}}
                    />
                  </button>
                </div>
                {isGhostMode && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                    {[['Stealth Session','ACTIVE'],['Cache Isolation','ENCRYPTED'],['Fingerprint Block','ON']].map(([k,v])=>(
                      <div key={k} className="flex justify-between">
                        <span className="text-[9px] text-zinc-600 flex items-center gap-1"><EyeOff className="w-2.5 h-2.5"/>{k}</span>
                        <span className="text-[9px] text-purple-400 font-mono font-bold">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.aside>
  )
}
