// Web Audio scheduling engine for precise metronome timing
export class AudioEngine {
  constructor(onTick) {
    this.audioCtx = null
    this.isRunning = false
    this.lookahead = 25.0 / 1000 // 25ms
    this.scheduleAheadTime = 0.1 // 100ms
    this.nextNoteTime = 0.0
    this.timerID = 0
    this.onTick = onTick // callback({ when, isCue, beat, measure, bpm })
    this.beatInMeasure = 0
    this.measureInStep = 0

    // configuration
    this.bpm = 120
    this.beatsPerMeasure = 4
    this.measuresPerStep = 4
    this.isCuePending = false
    this.cueBeatsRemaining = 0

    // sequence config
    this.mode = 'ASCEND' // ASCEND | DESCEND | BOTH
    this.startBPM = 80
    this.endBPM = 140
    this.stepAmount = 5
    this.direction = 1 // 1 up, -1 down
    this.loop = false
  }

  _createContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
  }

  setConfig(cfg) {
    Object.assign(this, cfg)
  }

  _click(when, freq=1000) {
    const ctx = this.audioCtx
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'square'
    o.frequency.setValueAtTime(freq, when)
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(0.3, when + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05)
    o.connect(g).connect(ctx.destination)
    o.start(when)
    o.stop(when + 0.06)
  }

  _scheduleTick(time, isCue) {
    // sound
    if (isCue) {
      this._click(time, 1700)
    } else if (this.beatInMeasure === 0) {
      this._click(time, 1300) // accent downbeat slightly
    } else {
      this._click(time, 1000)
    }

    if (this.onTick) {
      this.onTick({
        when: time,
        isCue,
        beat: this.beatInMeasure,
        measure: this.measureInStep,
        bpm: this.bpm
      })
    }
  }

  _advanceNote() {
    const secondsPerBeat = 60.0 / this.bpm
    this.nextNoteTime += secondsPerBeat
  
    if (this.cueBeatsRemaining > 0) {
      this.cueBeatsRemaining--
      return
    }
  
    this.beatInMeasure++
    if (this.beatInMeasure >= this.beatsPerMeasure) {
      this.beatInMeasure = 0
      this.measureInStep++
      if (this.measureInStep >= this.measuresPerStep) {
        this.measureInStep = 0
        // ✅ apply tempo step first
        this._applyStepChange()
        // ✅ then schedule 4-beat cue at new BPM
        this.cueBeatsRemaining = 4
      }
    }
  }

  _applyStepChange() {
    // update tempo based on direction && bounds
    const next = this.bpm + this.direction * this.stepAmount
    const min = Math.min(this.startBPM, this.endBPM)
    const max = Math.max(this.startBPM, this.endBPM)

    if (this.direction > 0 && next > max || this.direction < 0 && next < min) {
      if (this.mode === 'BOTH') {
        // reverse
        this.direction *= -1
      } else {
        if (this.loop) {
          // restart from start of mode
          if (this.mode === 'ASCEND') {
            this.bpm = this.startBPM
            this.direction = 1
          } else if (this.mode === 'DESCEND') {
            this.bpm = this.endBPM
            this.direction = -1
          }
          return
        } else {
          // stop at boundary
          this.stop()
          return
        }
      }
    }
    this.bpm = Math.max(min, Math.min(max, next))
  }

  _scheduler = () => {
    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      const isCue = this.cueBeatsRemaining > 0
      this._scheduleTick(this.nextNoteTime, isCue)
      this._advanceNote()
    }
    this.timerID = setTimeout(this._scheduler, this.lookahead * 1000)
  }

  start() {
    if (this.isRunning) return
    this._createContext()
    // init based on mode
    if (this.mode === 'ASCEND' || this.mode === 'BOTH') {
      this.bpm = this.startBPM
      this.direction = 1
    } else if (this.mode === 'DESCEND') {
      this.bpm = this.endBPM
      this.direction = -1
    }
    this.isRunning = true
    this.beatInMeasure = 0
    this.measureInStep = 0
    this.cueBeatsRemaining = 4
    this.nextNoteTime = this.audioCtx.currentTime + 0.05
    this._scheduler()
  }

  stop() {
    if (!this.isRunning) return
    clearTimeout(this.timerID)
    this.timerID = 0
    this.isRunning = false
  }
}
