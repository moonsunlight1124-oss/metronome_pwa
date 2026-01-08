import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AudioEngine } from './AudioEngine.js'

const number = (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0))

export default function App() {
  const [startBPM, setStartBPM] = useState(80)
  const [endBPM, setEndBPM] = useState(140)
  const [stepAmount, setStepAmount] = useState(5)
  const [measuresPerStep, setMeasuresPerStep] = useState(4)
  const [mode, setMode] = useState('ASCEND')
  const [loop, setLoop] = useState(false)
  const [running, setRunning] = useState(false)

  const [currentBPM, setCurrentBPM] = useState(80)
  const [beat, setBeat] = useState(0)
  const [measure, setMeasure] = useState(0)
  const [cue, setCue] = useState(false)

  const engineRef = useRef(null)
  const adRef = useRef(null)

  useEffect(() => {
    const onTick = ({ when, isCue, beat, measure, bpm }) => {
      setCurrentBPM(Math.round(bpm))
      setBeat(beat)
      setMeasure(measure)
      setCue(isCue)
    }
    engineRef.current = new AudioEngine(onTick)
    return () => {
      if (engineRef.current) engineRef.current.stop()
    }
  }, [])

  const applyConfig = () => {
    engineRef.current?.setConfig({
      startBPM: number(startBPM, 20, 300),
      endBPM: number(endBPM, 20, 300),
      stepAmount: number(stepAmount, 1, 40),
      measuresPerStep: number(measuresPerStep, 1, 64),
      mode,
      loop
    })
  }

  const handleStart = () => {
    applyConfig()
    engineRef.current?.start()
    setRunning(true)
  }
  const handleStop = () => {
    engineRef.current?.stop()
    setRunning(false)
  }

  useEffect(() => {
    applyConfig()
  }, [startBPM, endBPM, stepAmount, measuresPerStep, mode, loop])

  const progressPct = Math.min(100, ((measure % measuresPerStep) / Math.max(1, measuresPerStep)) * 100)

  // ---- Load Google AdSense ----
  useEffect(() => {
    if (window.adsbygoogle && adRef.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (e) {
        console.warn('AdSense error', e)
      }
    }
  }, [])

  return (
    <div className="container">
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <div>
          <div className="badge">PWA • Offline Ready</div>
          <h1 className="title">Dynamic Tempo Metronome</h1>
          <div className="muted">Incremental tempo practice with a 4-count cue between tempo changes.</div>
        </div>
        <div className="row" role="group" aria-label="Transport">
          {!running ? (
            <button className="btn primary" onClick={handleStart} aria-label="Play">
              ▶ Play
            </button>
          ) : (
            <button className="btn danger" onClick={handleStop} aria-label="Stop">
              ■ Stop
            </button>
          )}
        </div>
      </header>

      <main className="grid" style={{marginTop:12}}>
        <section className="card">
          <h2 style={{marginTop:0}}>Tempo Range</h2>
          <div className="grid">
            <NumberField label="Start BPM" value={startBPM} setValue={setStartBPM} step={1} min={20} max={300} />
            <NumberField label="End BPM" value={endBPM} setValue={setEndBPM} step={1} min={20} max={300} />
            <NumberField label="Step Amount (BPM)" value={stepAmount} setValue={setStepAmount} step={1} min={1} max={40} />
            <NumberField label="Measures per Step" value={measuresPerStep} setValue={setMeasuresPerStep} step={1} min={1} max={64} />
          </div>
        </section>

        <section className="card">
          <h2 style={{marginTop:0}}>Mode & Loop</h2>
          <div className="grid">
            <div>
              <label className="muted">Mode</label>
              <select value={mode} onChange={e=>setMode(e.target.value)} aria-label="Mode">
                <option value="ASCEND">Ascend (start → end)</option>
                <option value="DESCEND">Descend (end → start)</option>
                <option value="BOTH">Both (up then down)</option>
              </select>
            </div>

            <div>
              <label className="muted">Loop</label>
              <div className={"toggle " + (loop ? "on" : "")} onClick={()=>setLoop(v=>!v)} role="switch" aria-checked={loop}>
                <div className="knob" />
              </div>
            </div>

            {/* <div className="ad">
              Banner Ad Placeholder (AdMob/AdSense)
            </div> */}
            <ins
              className="adsbygoogle ad"
              ref={adRef}
              style={{ display: 'block' }}
              data-ad-client="ca-pub-1276107864842068"
              data-ad-slot="7630390260"
              data-ad-format="auto"
              data-full-width-responsive="true"
            ></ins>
          </div>
        </section>

        <section className="card">
          <h2 style={{marginTop:0}}>Status</h2>
          <div className="grid">
            <Info label="Current BPM" value={currentBPM} />
            <Info label="Measure in Step" value={measure+1} />
            <Info label="Beat" value={beat+1} />
            <Info label="Cue" value={cue ? 'Yes (4-count)' : 'No'} />
          </div>
          <div className="progress" style={{marginTop:12}} aria-label="Step progress">
            <div style={{width: progressPct + '%'}} />
          </div>
          <div className="muted" style={{marginTop:8}}>
            A 4-beat high-pitched cue plays between tempo steps, then the BPM changes by your step amount.
          </div>
        </section>
      </main>

      <footer className="footer">
        © {new Date().getFullYear()} Dynamic Tempo Metronome • <span className="muted">Install from your browser menu to use offline</span>
      </footer>
    </div>
  )
}

function Info({label, value}) {
  return (
    <div className="row" style={{justifyContent:'space-between', padding:'10px 12px', border:'1px solid #1f2937', borderRadius:12}}>
      <div className="muted">{label}</div>
      <div className="chip">{value}</div>
    </div>
  )
}

function NumberField({label, value, setValue, step=1, min=0, max=999}) {
  return (
    <div>
      <label className="muted">{label}</label>
      <div className="row">
        <button className="btn ghost" onClick={()=>setValue(v=>Math.max(min, Number(v)-step))} aria-label={label + ' minus'}>-</button>
        <input className="input" inputMode="numeric" value={value} onChange={e=>setValue(e.target.value)} />
        <button className="btn ghost" onClick={()=>setValue(v=>Math.min(max, Number(v)+step))} aria-label={label + ' plus'}>+</button>
      </div>
    </div>
  )
}
