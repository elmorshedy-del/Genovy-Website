import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Mail, GitFork, FileText, ChevronDown, Check, ArrowRight, Stethoscope, Activity, Microscope } from 'lucide-react'
import { KGraph, useInView, Counter, TealBtn, GhostBtn } from './shared.jsx'
import { SITE_LINKS } from './siteConfig.js'

// ─────────────────────────────────────────────────────────────────────────────
// NAV
// ─────────────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])
  
  const links = [
    { label: 'Platform', href: '#platform' },
    { label: 'Evidence', href: '#evidence' },
    { label: 'Built For', href: '#usecases' },
    { label: 'Paper', href: SITE_LINKS.paper },
    { label: 'Contact', href: '#contact' },
  ]
  
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'nav-scrolled py-4' : 'bg-transparent py-6'}`}>
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <a href="#hero" className="flex items-center gap-2 group">
            <span className="text-xl font-bold outfit tracking-tight text-teal-400 group-hover:text-teal-300 transition-colors">Genovy</span>
            <span className="mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)', color: 'var(--teal-400)', letterSpacing: '0.08em' }}>
              Beta
            </span>
          </a>
          <div className="hidden md:flex gap-10">
            {links.map(l => (
              <a key={l.label} href={l.href}
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
              >{l.label}</a>
            ))}
          </div>
          <button className="md:hidden p-2 flex flex-col gap-1.5" onClick={() => setOpen(!open)} aria-label="Menu">
            {[1, 0.75, 0.5].map((w, i) => (
              <span key={i} className="block h-0.5 rounded transition-all duration-300" style={{ background: 'var(--teal-400)', width: `${w * 20}px` }}/>
            ))}
          </button>
        </div>
        {open && (
          <div className="md:hidden mt-5 pb-5 pt-3 flex flex-col gap-5 border-t border-white/5">
            {links.map(l => (
              <a key={l.label} href={l.href} className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                onClick={() => setOpen(false)}>{l.label}</a>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────────────

function Hero({ mobile }) {
  const [ref, vis] = useInView(0)
  
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
      style={{ background: 'var(--bg-base)' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none' }}>
        <KGraph mobile={mobile} />
      </div>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle 800px at 50% 50%, rgba(20,184,166,0.06) 0%, transparent 100%)' }} />

      <div ref={ref} className={`relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto fade-up outline-none ${vis ? 'in' : ''}`}>
        <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full mono text-xs font-bold"
          style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.2)', color: 'var(--teal-400)', letterSpacing: '0.1em' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--teal-400)' }}/>
          RARE DISEASE DIAGNOSTIC INTELLIGENCE
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-[5rem] font-medium leading-[1.1] mb-8 outfit"
          style={{ letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
          From symptom<br />to diagnosis.<br />
          <span style={{ color: 'var(--teal-400)' }}>In seconds.</span>
        </h1>

        <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Genovy is a phenotype-driven diagnostic engine that identifies the right gene —{' '}
          <strong style={{ color: 'var(--text-primary)' }}>ranked first or second — more than half the time.</strong>{' '}
          No sequencing. No specialist. No wait.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mb-14">
          {['92% recall', 'Median rank 2', 'Beats Exomiser on 7/8 metrics'].map((s, i) => (
            <div key={s} className="stat-pill" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--teal-400)' }}/>{s}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <TealBtn href="#evidence">See the evidence <ChevronDown size={16}/></TealBtn>
          <GhostBtn href="#platform">How it works <ArrowRight size={16}/></GhostBtn>
        </div>
      </div>
      
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-30">
        <div className="w-[1px] h-12" style={{ background: 'linear-gradient(to bottom, var(--teal-400), transparent)' }} />
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEM
// ─────────────────────────────────────────────────────────────────────────────

const STATS = [
  { value: 300, suffix: 'M+', label: 'people living with a rare disease globally', color: 'var(--teal-400)' },
  { value: 7,   prefix: 'Up to ', suffix: ' years', label: 'average time to a correct diagnosis', color: 'var(--amber-accent)' },
  { value: 7000, suffix: '+', label: 'known rare diseases, most genetically driven', color: 'var(--violet-accent)' },
]

function Problem() {
  const [ref, vis] = useInView(0.15)
  return (
    <section style={{ background: 'var(--bg-surface)' }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-32 section-min-h flex flex-col justify-center">
        <div ref={ref} className={`fade-up ${vis ? 'in' : ''}`}>
          
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-20">
            <p className="text-xs font-bold mono mb-6 tracking-widest" style={{ color: 'var(--teal-400)' }}>THE PROBLEM</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium mb-8 leading-tight outfit"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              The rarest diseases have the longest waits.
            </h2>
            <p className="text-lg leading-relaxed text-slate-400 mb-6">
              Rare disease patients bounce between specialists for years. Most never get a standard genetic test early enough.
              The gene responsible is often known — deeply buried in disconnected medical literature — just never considered by front-line clinics. Genovy bridges that gap.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto relative">
            <div className="absolute -inset-4 bg-teal-500/5 blur-[80px] rounded-full pointer-events-none" />
            {STATS.map((s, i) => (
               <div key={s.label} className="glass-panel text-center rounded-2xl p-8 flex flex-col items-center justify-center" style={{ transitionDelay: `${i*0.1}s` }}>
                <div className="text-4xl sm:text-5xl font-bold mono mb-4" style={{ color: s.color, letterSpacing: '-0.02em' }}>
                  <Counter value={s.value} suffix={s.suffix} prefix={s.prefix || ''} />
                </div>
                <div className="text-sm leading-relaxed text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: '01',
    title: 'Describe the patient',
    body: "A clinician enters the patient's symptoms as standardized HPO terms. No sequencing, no lab results — just clinical observations.",
    color: 'var(--teal-400)',
  },
  {
    n: '02',
    title: 'Search the graph',
    body: "Genovy searches a curated graph of 12,132 diseases and 5,705 genes, built from 7 authoritative sources including ClinGen and OMIM.",
    color: 'var(--violet-accent)',
  },
  {
    n: '03',
    title: 'Ranked diagnosis',
    body: 'The output is a ranked gene list. Every result is scored, sourced, and explainable. No black box — verifiable results.',
    color: 'var(--amber-accent)',
  },
]

function Platform() {
  const [ref, vis] = useInView(0.15)

  return (
    <section id="platform" className="relative border-y" style={{ background: 'var(--bg-base)', borderColor: 'var(--border-subtle)' }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-32 section-min-h flex flex-col justify-center">
        <div ref={ref} className={`fade-up outline-none ${vis ? 'in' : ''}`}>
          <div className="text-center max-w-3xl mx-auto mb-20">
            <p className="text-xs font-bold mono mb-5 tracking-widest text-teal-400">HOW IT WORKS</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium mb-6 leading-tight outfit"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Phenotype in.<br />
              <span className="text-slate-400">Ranked diagnosis out.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 relative">
            {/* Connecting line behind steps */}
            <div className="hidden md:block absolute top-[68px] left-[15%] right-[15%] h-px bg-gradient-to-r from-teal-500/0 via-teal-500/20 to-teal-500/0" />
            
            {STEPS.map((s, i) => (
              <div key={i} className="glass-panel relative rounded-2xl p-8 lg:p-10 flex flex-col group overflow-hidden" style={{ transition: 'all 0.3s ease' }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${s.color}08, transparent 70%)` }} />
                
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-8 mx-auto" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-xl font-bold mono" style={{ color: s.color }}>{s.n}</span>
                </div>
                
                <h3 className="text-xl font-medium mb-4 outfit text-center" style={{ color: 'var(--text-primary)' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400 flex-1 text-center">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 sm:mt-24 rounded-2xl p-8 sm:p-10 flex flex-wrap gap-8 justify-between text-center glass-panel"
            style={{ borderTop: '1px solid rgba(20,184,166,0.2)' }}>
            {[['12,132','diseases indexed'],['16,000+','HPO terms'],['5,705','genes covered'],['7','authoritative sources']].map(([v,l]) => (
              <div key={l} className="flex-1 min-w-[140px]">
                <div className="text-3xl font-bold mono mb-2 outfit" style={{ color: 'var(--text-primary)' }}>{v}</div>
                <div className="text-sm text-slate-500">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE
// ─────────────────────────────────────────────────────────────────────────────

const METRICS = [
  { metric: 'Found',  genovy: 92,   exomiser: 100, unit: '%' },
  { metric: 'Top-1',  genovy: 42,   exomiser: 39,  unit: '%' },
  { metric: 'Top-3',  genovy: 53,   exomiser: 46,  unit: '%' },
  { metric: 'Top-5',  genovy: 57,   exomiser: 48,  unit: '%' },
  { metric: 'Top-10', genovy: 65,   exomiser: 55,  unit: '%' },
  { metric: 'MRR',    genovy: 50.4, exomiser: 44.7,unit: '%' },
]

const EV_CALLOUTS = [
  { label: 'Median Rank', genovy: '2', exomiser: '7.5', note: 'Genovy puts the right gene at the top', color: 'var(--teal-400)' },
  { label: 'MRR',         genovy: '0.504', exomiser: '0.447', note: 'Higher mean reciprocal rank across all cases', color: 'var(--amber-accent)' },
  { label: 'Head-to-head wins', genovy: '41', exomiser: '18', note: 'When both find the gene, Genovy ranks it higher 2.3× more often', color: 'var(--violet-accent)' },
]

function EvidTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 16px', fontSize: 13, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      <p className="font-semibold mb-2 outfit text-white">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="mono text-xs mb-1">
          {p.name === 'genovy' ? 'Genovy' : 'Exomiser'}: {p.value}{payload[0].payload.unit}
        </p>
      ))}
    </div>
  )
}

function Evidence() {
  const [ref, vis] = useInView(0.1)
  
  return (
    <section id="evidence" style={{ background: 'var(--bg-surface)' }}>
      <div ref={ref} className="max-w-6xl mx-auto px-6 lg:px-8 py-32 section-min-h flex flex-col justify-center">
        <div className={`fade-up ${vis ? 'in' : ''}`}>
          <div className="text-center max-w-3xl mx-auto mb-20">
            <p className="text-xs font-bold mono mb-5 tracking-widest text-teal-400">BENCHMARK RESULTS</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium mb-6 leading-tight outfit text-white">
              We ran the benchmark.<br />
              <span className="text-teal-400">We won.</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-xl mx-auto">
              vs. Exomiser — the field's gold standard — on the official 100-case phenotype-only rare disease benchmark.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Chart */}
            <div className="glass-panel rounded-2xl p-6 sm:p-10 flex flex-col justify-center">
              <p className="text-sm font-semibold mb-8 text-slate-400 outfit tracking-wide uppercase text-center">Performance Metrics</p>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={METRICS} layout="vertical" margin={{ left: 8, right: 30, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false}/>
                    <XAxis type="number" domain={[0,110]} tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="metric" tick={{ fill:'var(--text-secondary)', fontSize:12, fontFamily:'Outfit', fontWeight: 500 }} axisLine={false} tickLine={false} width={60}/>
                    <Tooltip content={<EvidTooltip/>} cursor={{ fill: 'rgba(255,255,255,0.02)' }}/>
                    <Legend wrapperStyle={{ fontSize: 13, paddingTop: 20, fontFamily: 'Outfit' }}
                      formatter={v => <span style={{ color: v==='genovy'?'var(--teal-400)':'var(--text-muted)' }}>{v==='genovy'?'Genovy':'Exomiser'}</span>}/>
                    <Bar dataKey="genovy" name="genovy" fill="var(--teal-500)" radius={[0,4,4,0]} maxBarSize={16}/>
                    <Bar dataKey="exomiser" name="exomiser" fill="#334155" radius={[0,4,4,0]} maxBarSize={16}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Callout cards */}
            <div className="flex flex-col gap-4 justify-center">
              {EV_CALLOUTS.map((c, i) => (
                <div key={c.label} className="glass-panel rounded-2xl p-8 relative overflow-hidden text-center sm:text-left" style={{ transitionDelay: `${i*0.1}s` }}>
                  <div className="absolute left-0 top-0 bottom-0 w-1 hidden sm:block" style={{ background: c.color }} />
                  <div className="text-xs font-bold mono mb-4 tracking-widest text-slate-400">{c.label}</div>
                  <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2 sm:gap-4 mb-3">
                    <div className="text-4xl sm:text-5xl font-bold outfit" style={{ color: c.color, letterSpacing: '-0.02em' }}>{c.genovy}</div>
                    <div className="text-lg text-slate-500 font-medium outfit">vs {c.exomiser}</div>
                  </div>
                  <div className="text-sm text-slate-400">{c.note}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs mt-12 text-center text-slate-500 mono">
            100 published rare disease cases · Phenotype-only input · No variant or sequencing data used
          </p>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILT FOR
// ─────────────────────────────────────────────────────────────────────────────

function ClinicalVisual() {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl animate-float" style={{ border: '1px solid rgba(20,184,166,0.3)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          {['#f59e0b','#14b8a6','#8b5cf6'].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }}/>)}
        </div>
        <span className="mono text-xs text-slate-500">diagnostic-engine.tsx</span>
      </div>
      <div className="p-6 sm:p-8 text-left">
        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-5">Patient Input / 5 HPO Terms</div>
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {['Global developmental delay','Seizures','Hypotonia','Microcephaly','Agenesis of corpus callosum'].map((t, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex-shrink-0 w-2 h-2 rounded-full pulse bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
              <span className="text-xs mono text-slate-300 truncate">{t}</span>
            </div>
          ))}
        </div>
        
        {/* Animated Scanning Bar */}
        <div className="relative w-full h-1 bg-teal-500/10 overflow-hidden my-8 rounded-full">
          <div className="absolute top-0 left-0 h-full w-[150px] bg-teal-400 blur-[2px] animate-scan" />
        </div>
        
        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-5 flex items-center justify-between">
          <span>Ranked Output</span>
          <span className="text-teal-400">0.82 seconds</span>
        </div>
        
        <div className="space-y-3">
          {[['#1','PPP2R1A','0.159'],['#2','SCN1A','0.128'],['#3','STXBP1','0.119']].map(([rank, gene, score]) => (
            <div key={gene} className="flex justify-between rounded-xl px-5 py-4 bg-teal-500/[0.04] border border-teal-500/10 hover:border-teal-500/30 transition-all">
              <div className="flex items-center gap-5">
                <span className="mono text-sm font-bold text-slate-500 w-6">{rank}</span>
                <span className="outfit text-lg font-medium text-teal-400">{gene}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="mono text-xs text-slate-400 bg-black/40 px-3 py-1 rounded-md">{score}</span>
                <Check size={16} className="text-teal-500"/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PharmaVisual() {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl animate-float" style={{ border: '1px solid rgba(245,158,11,0.3)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          {['#f59e0b','#14b8a6','#8b5cf6'].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }}/>)}
        </div>
        <span className="mono text-xs text-slate-500">knowledge-graph.tsx</span>
      </div>
      <div className="p-8">
        <svg viewBox="0 0 280 160" className="w-full h-auto mb-8">
          {/* Animated Flowing Edges */}
          {[['140','80','60','40'],['140','80','220','40'],['140','80','60','130'],['140','80','220','130'],['140','80','140','150']].map(([x1,y1,x2,y2],i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--amber-accent)" strokeWidth="1.5" opacity="0.4" className={i!==4 ? 'animate-dash' : ''} strokeDasharray={i!==4 ? "4 4" : "none"}/>
          ))}
          {/* Disease nodes */}
          {[['60','40','#8b5cf6','Disease A'],['220','40','#8b5cf6','Disease B'],['60','130','#8b5cf6','Disease C'],['220','130','#8b5cf6','Disease D']].map(([cx,cy,fill,label]) => (
            <g key={label} className="animate-glow" style={{ animationDelay: `${cx*0.01}s` }}>
              <circle cx={cx} cy={cy} r="18" fill={fill} opacity="0.15" stroke={fill} strokeWidth="1.5" strokeOpacity="0.8"/>
              <text x={cx} y={Number(cy)+4} textAnchor="middle" fontSize="8" fill={fill} fontFamily="Outfit" fontWeight="600">{label}</text>
            </g>
          ))}
          {/* Center target node */}
          <circle className="animate-glow" cx="140" cy="80" r="28" fill="var(--amber-accent)" opacity="0.2" stroke="var(--amber-accent)" strokeWidth="2"/>
          <text x="140" y="78" textAnchor="middle" fontSize="11" fill="var(--amber-accent)" fontFamily="Outfit" fontWeight="700">GENE X</text>
          <text x="140" y="90" textAnchor="middle" fontSize="7" fill="var(--text-secondary)" fontFamily="Outfit">TARGET</text>
          {/* Drug node */}
          <circle cx="140" cy="155" r="10" fill="var(--teal-400)" opacity="0.2" stroke="var(--teal-400)" strokeWidth="1.5"/>
          <text x="140" y="158" textAnchor="middle" fontSize="7" fill="var(--teal-400)" fontFamily="Outfit" fontWeight="600">DRUG</text>
        </svg>
        <div className="grid grid-cols-3 gap-6 text-center pt-6 border-t border-amber-500/10">
          {[['5,705','Genes Indexed'],['12,132','Diseases Mapped'],['Instant','Graph Query']].map(([v,l]) => (
            <div key={l} className="rounded-xl p-4 bg-amber-500/[0.03] border border-amber-500/10">
              <div className="text-xl font-bold outfit" style={{ color: 'var(--amber-accent)' }}>{v}</div>
              <div className="text-[10px] uppercase tracking-widest mt-2 text-slate-500">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResearchVisual() {
  const bars = [
    { label: 'Top-1 Accuracy', genovy: 42, exomiser: 39 },
    { label: 'Top-5 Accuracy', genovy: 57, exomiser: 48 },
    { label: 'Top-10 Accuracy', genovy: 65, exomiser: 55 },
  ]
  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl animate-float" style={{ border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          {['#f59e0b','#14b8a6','#8b5cf6'].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }}/>)}
        </div>
        <span className="mono text-xs text-slate-500">research-validation.tsx</span>
      </div>
      <div className="p-8">
        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-8 border-b border-violet-500/10 pb-4">Cohort Validation Match Rates</div>
        <div className="space-y-8">
          {bars.map(b => (
            <div key={b.label} className="group">
              <div className="flex justify-between items-center mb-3">
                <span className="outfit text-sm text-slate-300 font-medium">{b.label}</span>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <span className="mono text-[10px] w-14 text-violet-400 font-bold uppercase tracking-widest">Genovy</span>
                  <div className="flex-1 h-3.5 rounded-full bg-white/[0.03] overflow-hidden">
                    <div className="h-full rounded-full bg-violet-500 transition-all duration-1000 shadow-[0_0_12px_rgba(139,92,246,0.5)]" style={{ width: `${b.genovy}%` }}/>
                  </div>
                  <span className="mono text-xs font-bold w-10 text-right text-violet-400 bg-violet-500/10 px-2 py-1 rounded">{b.genovy}%</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="mono text-[10px] w-14 text-slate-500 font-bold uppercase tracking-widest">Exomiser</span>
                  <div className="flex-1 h-3.5 rounded-full bg-white/[0.03] overflow-hidden">
                    <div className="h-full rounded-full bg-slate-600 transition-all duration-1000" style={{ width: `${b.exomiser}%` }}/>
                  </div>
                  <span className="mono text-xs font-bold w-10 text-right text-slate-500 bg-white/5 px-2 py-1 rounded">{b.exomiser}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-xl p-6 bg-violet-500/[0.04] border border-violet-500/20 flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left gap-4">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-violet-400 mb-2">Median Global Rank</div>
            <div className="text-sm text-slate-400 max-w-xs">Massively reduced search space for downstream analysis</div>
          </div>
          <div className="text-5xl font-light outfit text-violet-400">#2</div>
        </div>
      </div>
    </div>
  )
}

const USE_CASES = [
  {
    id: 'clinical',
    accent: 'var(--teal-400)',
    title: 'Clinical Diagnosis',
    subtitle: 'A diagnosis before the first test is ordered.',
    body: "The average rare disease patient waits years for a diagnosis. Genovy gives a clinician a ranked gene list from patient symptoms alone — in seconds, before any genetic test is ordered.",
    points: ['No sequencing required', 'Standard HPO coding', 'Explainable results'],
    Icon: Stethoscope,
    Visual: ClinicalVisual,
  },
  {
    id: 'pharma',
    accent: 'var(--amber-accent)',
    title: 'Drug Discovery',
    subtitle: 'Find rare disease targets faster.',
    body: "Gene-disease-phenotype connections that take months to map manually are instantly queryable. Identify novel targets, stratify patient populations, and prioritize research directions comprehensively.",
    points: ['5,705 genes indexed', 'Cross-disease overlap', 'Built from ClinGen & MONDO'],
    Icon: Activity,
    Visual: PharmaVisual,
  },
  {
    id: 'research',
    accent: 'var(--violet-accent)',
    title: 'Research Acceleration',
    subtitle: 'Validate hypotheses at scale.',
    body: "Stop manually curating phenotype-to-gene associations. Genovy's graph gives computational biology labs a validated, source-auditable baseline for phenotype-driven discovery.",
    points: ['16,000+ HPO terms', 'Reproducible scoring', 'Benchmarked on 100 cases'],
    Icon: Microscope,
    Visual: ResearchVisual,
  },
]

function UseCasePanel({ uc }) {
  const [ref, vis] = useInView(0.15)

  return (
    <div ref={ref} className={`py-20 sm:py-32 fade-up ${vis ? 'in' : ''} flex flex-col items-center justify-center text-center max-w-5xl mx-auto`}>
      
      {/* Centered Text Side */}
      <div className="max-w-3xl mb-16 px-4">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl mb-8 relative border bg-[#050608] transition-colors duration-500 overflow-hidden" style={{ borderColor: `${uc.accent}40`, boxShadow: `0 8px 32px ${uc.accent}20` }}>
            <div className="absolute inset-0 opacity-20 animate-glow" style={{ background: uc.accent }} />
            <uc.Icon size={36} style={{ color: uc.accent }} className="relative z-10" />
          </div>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 leading-tight outfit" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {uc.title}
          </h2>
          <h3 className="text-xl sm:text-2xl font-medium mb-6 outfit" style={{ color: uc.accent }}>
            {uc.subtitle}
          </h3>
          <p className="text-lg leading-relaxed text-slate-400 mb-10 max-w-2xl mx-auto">
            {uc.body}
          </p>
          
          <ul className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-x-8 gap-y-4">
            {uc.points.map(p => (
              <li key={p} className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-5 h-5 rounded-full flex items-center justify-center bg-white/5 border border-white/10 shrink-0">
                  <Check size={10} style={{ color: uc.accent }}/>
                </div>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Centered Visual Side */}
      <div className="relative w-full px-4 sm:px-8">
        <div className="absolute -inset-10 blur-[100px] opacity-20 pointer-events-none rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4" style={{ background: uc.accent }} />
        <div className="relative w-full max-w-4xl mx-auto">
          <uc.Visual />
        </div>
      </div>

    </div>
  )
}

function BuiltFor() {
  return (
    <section id="usecases" className="border-y border-white/5" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-32">
        <div className="flex flex-col gap-12 sm:gap-24">
          {USE_CASES.map((uc, i) => (
            <div key={uc.id}>
              {i > 0 && <div className="max-w-lg mx-auto h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />}
              <UseCasePanel uc={uc} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_DEFAULT = `HP:0001263 Global developmental delay
HP:0001250 Seizure
HP:0001252 Hypotonia
HP:0000252 Microcephaly
HP:0001274 Agenesis of corpus callosum`

const DEMO_RESULTS = [
  { rank:1, gene:'PPP2R1A', disease:'Houge-Janssens syndrome 2',   score:'0.159' },
  { rank:2, gene:'HNRNPC',  disease:'IDD, autosomal dominant 74',  score:'0.134' },
  { rank:3, gene:'SCN1A',   disease:'Dravet syndrome',             score:'0.128' },
  { rank:4, gene:'STXBP1',  disease:'DEE4',                        score:'0.119' },
  { rank:5, gene:'MECP2',   disease:'Rett syndrome',               score:'0.112' },
]

function Demo() {
  const [input, setInput] = useState(DEMO_DEFAULT)
  const [results, setResults] = useState([])
  const [running, setRunning] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const run = useCallback(() => {
    setResults([]); setExpanded(null); setRunning(true)
    setTimeout(() => {
      DEMO_RESULTS.forEach((r, i) => {
        setTimeout(() => {
          setResults(prev => [...prev, r])
          if (i === DEMO_RESULTS.length - 1) setRunning(false)
        }, i * 150)
      })
    }, 400)
  }, [])

  const [ref, vis] = useInView(0.1)

  return (
    <section style={{ background: 'var(--bg-surface)' }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-32 section-min-h flex flex-col justify-center">
        <div ref={ref} className={`fade-up outline-none ${vis ? 'in' : ''}`}>
          <div className="text-center max-w-3xl mx-auto mb-20">
            <p className="text-xs font-bold mono mb-5 tracking-widest text-teal-400">TRY IT</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium mb-6 leading-tight outfit text-white">
              See Genovy in action.
            </h2>
            <p className="text-lg text-slate-400 max-w-xl mx-auto">
              Enter HPO terms and get a ranked gene list. (Simulated demo).
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto lg:w-full">
            {/* Input Side */}
            <div className="glass-panel rounded-2xl p-6 sm:p-8 flex flex-col h-full">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-4 text-center sm:text-left">Patient Phenotypes</label>
              <div className="flex-1 relative mb-6">
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  className="w-full h-full min-h-[240px] rounded-xl p-5 text-sm mono resize-none outline-none transition-all bg-[#050608] border border-white/5 text-teal-300 focus:border-teal-500/50 focus:bg-teal-500/[0.02]"
                  style={{ lineHeight: 1.8 }}
                />
              </div>
              <button onClick={run} disabled={running}
                className="w-full rounded-xl py-4 font-semibold text-sm transition-all duration-300 outfit tracking-wide disabled:opacity-50 disabled:cursor-not-allowed glow-teal"
                style={{ background: running ? 'var(--text-muted)' : 'var(--teal-500)', color: 'white', border: '1px solid var(--teal-400)' }}
              >{running ? 'Processing...' : 'Diagnose Case'}</button>
            </div>

            {/* Results Side */}
            <div className="glass-panel rounded-2xl p-6 sm:p-8 flex flex-col min-h-[400px]">
              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-6 text-center sm:text-left">Ranked Candidates</div>
              
              {results.length === 0 && !running && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-60">
                  <GitFork size={32} className="mb-4 opacity-50"/>
                  <p className="text-sm">Awaiting phenotypes...</p>
                </div>
              )}
              
              {running && results.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"/>
                </div>
              )}
              
              <div className="space-y-3">
                {results.map(r => (
                  <div key={r.rank} className="result-row in">
                    <button onClick={() => setExpanded(expanded===r.rank ? null : r.rank)}
                      className="w-full rounded-xl p-4 sm:px-5 sm:py-4 text-left transition-all duration-200 border"
                      style={{
                        background: expanded===r.rank ? 'rgba(20,184,166,0.05)' : 'rgba(255,255,255,0.02)',
                        borderColor: expanded===r.rank ? 'var(--teal-500)' : 'rgba(255,255,255,0.05)',
                      }}>
                      <div className="flex items-center justify-between pointer-events-none">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <span className="mono text-xs font-bold w-4 text-slate-500">#{r.rank}</span>
                          <span className="outfit text-xl font-medium text-teal-400">{r.gene}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="mono text-xs text-slate-400 bg-white/5 px-2 py-1 rounded">{r.score}</span>
                          {expanded===r.rank ? <ChevronDown size={14} className="text-teal-400"/> : <Check size={14} className="text-teal-800"/>}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-400 truncate pl-7 sm:pl-8">{r.disease}</div>
                    </button>
                    {expanded === r.rank && (
                      <div className="mt-2 mx-2 px-4 py-3 rounded-lg text-xs tracking-wide border border-teal-500/10 bg-teal-500/5 text-slate-300 shadow-inner">
                        Supported by: MONDO:0014605 • Exact overlaps: 5 • Sources: HPO, ClinGen, Orphadata
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT / CONTACT
// ─────────────────────────────────────────────────────────────────────────────

function About() {
  const [ref, vis] = useInView(0.2)
  return (
    <section id="contact" className="border-t border-white/5" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-32 text-center">
        <div ref={ref} className={`fade-up outline-none ${vis ? 'in' : ''}`}>
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500/20 to-teal-500/0 border border-teal-500/20 rounded-2xl mx-auto mb-8 flex items-center justify-center animate-glow">
            <Mail className="text-teal-400" size={24}/>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium mb-6 leading-tight outfit text-white">
            Independent build.<br />
            <span className="text-teal-400">Institutional potential.</span>
          </h2>
          <p className="text-lg leading-relaxed text-slate-400 mb-12 max-w-2xl mx-auto">
            Genovy was designed and developed by Ahmed Elmorshedy as a phenotype-driven rare-disease diagnostic engine with benchmark-leading ranking performance. It is now being developed into a broader case-intelligence platform for clinical, research, and strategic collaboration.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <TealBtn href={SITE_LINKS.founderEmail}>Contact Ahmed <ArrowRight size={16}/></TealBtn>
            <GhostBtn href={SITE_LINKS.paper}>Read the paper <FileText size={16}/></GhostBtn>
            <a
              href={SITE_LINKS.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.03)',
                color: '#f8fafc',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              View GitHub <GitFork size={16}/>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────────────

function Footer() {
  const footerLinks = [
    { label: 'Platform', href: '#platform' },
    { label: 'Paper', href: SITE_LINKS.paper, icon: FileText },
    { label: 'GitHub', href: SITE_LINKS.github, icon: GitFork, external: true },
  ]

  return (
    <footer className="border-t border-white/5" style={{ background: '#020305' }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-8 text-center sm:text-left">
          <span className="text-lg font-bold outfit text-teal-400 tracking-tight">Genovy</span>
          
          <div className="flex gap-8">
            {footerLinks.map(({ label, icon: Icon, href, external }) => (
              <a
                key={label}
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noreferrer' : undefined}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-400 transition-colors"
              >
                {Icon ? <Icon size={16}/> : null} {label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-600 border-t border-white/5 pt-8 text-center sm:text-left">
          <p>© 2026 Genovy</p>
          <p>For research use only. Not a substitute for clinical judgment or diagnostic testing.</p>
        </div>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [mobile, setMobile] = useState(false)
  
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <>
      <Nav />
      <main className="selection:bg-teal-500/30 selection:text-white">
        <Hero mobile={mobile} />
        <Problem />
        <Platform />
        <Evidence />
        <BuiltFor />
        <Demo />
        <About />
      </main>
      <Footer />
    </>
  )
}
