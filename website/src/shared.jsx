/* eslint-disable react-refresh/only-export-components */

import { useState, useEffect, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── 3D Graph ─────────────────────────────────────────────────────────────────

function buildGraph(count) {
  const types = ['gene', 'disease', 'phenotype']
  const nodes = Array.from({ length: count }, (_, i) => {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 2.4 + Math.random() * 1.4
    return {
      id: i,
      pos: [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)],
      type: types[Math.floor(Math.random() * types.length)],
    }
  })
  const edges = []
  for (let i = 0; i < count; i++) {
    const n = Math.floor(Math.random() * 3) + 1
    for (let e = 0; e < n; e++) {
      const j = Math.floor(Math.random() * count)
      if (j !== i) edges.push([i, j])
    }
  }
  return { nodes, edges }
}

const NODE_COLORS = { gene: '#14b8a6', disease: '#f59e0b', phenotype: '#8b5cf6' }

function GraphScene({ count }) {
  const group = useRef()
  const [graph] = useState(() => buildGraph(count))
  const edgeGeo = useMemo(() => {
    const pts = []
    for (const [a, b] of graph.edges) {
      pts.push(new THREE.Vector3(...graph.nodes[a].pos))
      pts.push(new THREE.Vector3(...graph.nodes[b].pos))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [graph])

  useFrame((_, dt) => {
    if (group.current) {
      group.current.rotation.y += dt * 0.05
      group.current.rotation.x += dt * 0.014
    }
  })

  return (
    <group ref={group}>
      <lineSegments geometry={edgeGeo}>
        <lineBasicMaterial color="#14b8a6" transparent opacity={0.13} />
      </lineSegments>
      {graph.nodes.map((n, i) => (
        <mesh key={i} position={n.pos}>
          <sphereGeometry args={[0.065, 7, 7]} />
          <meshStandardMaterial color={NODE_COLORS[n.type]} emissive={NODE_COLORS[n.type]} emissiveIntensity={0.7} />
        </mesh>
      ))}
    </group>
  )
}

export function KGraph({ mobile }) {
  if (mobile) {
    const dots = [
      [200,80,'#14b8a6'],[120,150,'#f59e0b'],[290,150,'#8b5cf6'],
      [70,240,'#14b8a6'],[200,240,'#f59e0b'],[330,240,'#14b8a6'],
      [140,320,'#8b5cf6'],[260,320,'#f59e0b'],[50,170,'#8b5cf6'],
      [350,170,'#14b8a6'],[100,350,'#14b8a6'],[300,350,'#8b5cf6'],
    ]
    return (
      <svg viewBox="0 0 400 420" className="w-full h-full" aria-hidden>
        <line x1="200" y1="80" x2="120" y2="150" stroke="#14b8a6" strokeWidth="1" opacity="0.2"/>
        <line x1="200" y1="80" x2="290" y2="150" stroke="#14b8a6" strokeWidth="1" opacity="0.2"/>
        <line x1="120" y1="150" x2="70" y2="240" stroke="#14b8a6" strokeWidth="1" opacity="0.2"/>
        <line x1="290" y1="150" x2="330" y2="240" stroke="#14b8a6" strokeWidth="1" opacity="0.2"/>
        <line x1="200" y1="240" x2="140" y2="320" stroke="#14b8a6" strokeWidth="1" opacity="0.2"/>
        <line x1="200" y1="240" x2="260" y2="320" stroke="#14b8a6" strokeWidth="1" opacity="0.2"/>
        {dots.map(([cx,cy,fill],i) => (
          <circle key={i} cx={cx} cy={cy} r={6} fill={fill} opacity={0.75}/>
        ))}
      </svg>
    )
  }
  return (
    <Canvas camera={{ position: [0,0,7], fov: 55 }} style={{ position:'absolute', inset:0 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}>
      <ambientLight intensity={0.4} />
      <GraphScene count={40} />
    </Canvas>
  )
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useInView(threshold = 0.2) {
  const ref = useRef()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

export function useCountUp(target, duration = 1600, go = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!go) return
    let start = null
    const tick = ts => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [go, target, duration])
  return val
}

export function Counter({ value, suffix = '', prefix = '' }) {
  const ref = useRef()
  const [go, setGo] = useState(false)
  const count = useCountUp(value, 1600, go)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setGo(true) }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>
}

// ─── Shared button styles ─────────────────────────────────────────────────────

export function TealBtn({ href, children, onClick }) {
  const [hov, setHov] = useState(false)
  const Tag = href ? 'a' : 'button'
  return (
    <Tag href={href} onClick={onClick}
      className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-250 glow-teal"
      style={{ background: hov ? '#14b8a6' : '#0d9488', color: 'white', border: '1px solid #14b8a6', transform: hov ? 'translateY(-2px)' : 'translateY(0)', cursor: 'pointer' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >{children}</Tag>
  )
}

export function GhostBtn({ href, children }) {
  const [hov, setHov] = useState(false)
  return (
    <a href={href}
      className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300"
      style={{
        background: hov ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
        color: '#f8fafc',
        border: '1px solid rgba(255,255,255,0.08)',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >{children}</a>
  )
}
