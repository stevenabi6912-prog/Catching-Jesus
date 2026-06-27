// ============================================================================
//  Web Audio sound engine. Pure synthesis = no file loading, no tap latency.
//  All sounds are short oscillator/gain envelopes scheduled on the audio clock.
// ============================================================================

let ctx = null
let masterGain = null
let muted = false

// Lazily create the AudioContext. Must be called from a user gesture (the
// START button / first tap) so iOS/Safari unlocks audio.
export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume()
    return
  }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  masterGain = ctx.createGain()
  masterGain.gain.value = muted ? 0 : 0.9
  masterGain.connect(ctx.destination)
  // Nudge it awake (Safari).
  if (ctx.state === 'suspended') ctx.resume()
}

export function setMuted(m) {
  muted = m
  if (masterGain) {
    masterGain.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.01)
  }
}

export function isMuted() {
  return muted
}

// One enveloped oscillator note.
function tone({ freq, type = 'sine', start = 0, dur = 0.12, gain = 0.5, glideTo = null }) {
  if (!ctx || muted) return
  const t0 = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur)
  // Fast attack, smooth decay = a clean "pop/chime" without clicks.
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(masterGain)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

// Successful tap. Pitch climbs as the score grows (capped), so it feels like
// the round is building. `combo` adds a sparkle for rapid-fire taps. `big` is
// for the special 2x Jesus catch — a richer, brighter chime.
export function playPop(score = 0, combo = 0, big = false) {
  if (!ctx || muted) return
  const base = 520 + Math.min(score, 60) * 9 // climbs ~520Hz -> ~1060Hz
  tone({ freq: base, type: 'triangle', dur: 0.12, gain: 0.55, glideTo: base * 1.5 })
  // Soft octave shimmer.
  tone({ freq: base * 2, type: 'sine', dur: 0.09, gain: 0.18, start: 0.005 })
  if (combo >= 3) {
    // Combo sparkle — a quick high blip on top.
    tone({ freq: base * 2.5, type: 'sine', dur: 0.08, gain: 0.22, start: 0.02 })
  }
  if (big) {
    // 2x Jesus catch — add a bright perfect-fifth + octave for a "chime".
    tone({ freq: base * 1.5, type: 'sine', dur: 0.18, gain: 0.3, start: 0.02 })
    tone({ freq: base * 3, type: 'sine', dur: 0.16, gain: 0.16, start: 0.05 })
  }
}

// Penalty — tapped a hazard (Satan). A low, dissonant descending buzz.
export function playPenalty() {
  if (!ctx || muted) return
  tone({ freq: 220, type: 'sawtooth', dur: 0.32, gain: 0.4, glideTo: 80 })
  tone({ freq: 233, type: 'square', dur: 0.3, gain: 0.22, glideTo: 90, start: 0.01 })
}

// Streak milestone bonus — a quick rising 3-note sparkle.
export function playStreakBonus() {
  if (!ctx || muted) return
  const seq = [784, 988, 1319] // G5 B5 E6
  seq.forEach((f, i) =>
    tone({ freq: f, type: 'triangle', dur: 0.12, gain: 0.32, start: i * 0.05 })
  )
}

// Final-5-seconds tick. `urgent` (last 3) is higher + louder.
export function playTick(urgent = false) {
  tone({
    freq: urgent ? 880 : 660,
    type: 'square',
    dur: 0.1,
    gain: urgent ? 0.4 : 0.28,
  })
}

// Triumphant end-of-round fanfare (major arpeggio).
export function playFanfare() {
  if (!ctx || muted) return
  const root = 523.25 // C5
  const notes = [root, root * 1.26, root * 1.5, root * 2] // C E G C
  notes.forEach((f, i) => {
    tone({ freq: f, type: 'triangle', dur: 0.5, gain: 0.5, start: i * 0.11 })
    tone({ freq: f * 2, type: 'sine', dur: 0.4, gain: 0.16, start: i * 0.11 })
  })
}

// New high score celebration — a brighter, longer flourish.
export function playHighScore() {
  if (!ctx || muted) return
  const seq = [659.25, 783.99, 987.77, 1318.5] // E G B E
  seq.forEach((f, i) => {
    tone({ freq: f, type: 'triangle', dur: 0.45, gain: 0.5, start: i * 0.09 })
  })
}
