import type { PetVoice } from './pet-species'

/**
 * Pet voices synthesized with Web Audio.
 *
 * Why synthesized, not audio files: no asset licensing, nothing to download or ship, and each
 * call is a handful of nodes that are garbage-collected when the sound ends. The context is
 * suspended between sounds so an idle pet costs no audio thread time.
 */
let context: AudioContext | null = null
let suspendTimer: ReturnType<typeof setTimeout> | null = null

function getContext(): AudioContext | null {
  if (context) {
    return context
  }
  const Ctor = globalThis.AudioContext
  if (typeof Ctor !== 'function') {
    return null
  }
  context = new Ctor()
  return context
}

function envelope(gain: GainNode, start: number, peak: number, attack: number, end: number): void {
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), start + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

/** "Meo": a sawtooth through two moving formants, pitch rising then falling. */
function meow(ctx: AudioContext, out: AudioNode, t: number): number {
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(520, t)
  osc.frequency.linearRampToValueAtTime(780, t + 0.16)
  osc.frequency.exponentialRampToValueAtTime(430, t + 0.6)
  const low = ctx.createBiquadFilter()
  low.type = 'bandpass'
  low.Q.value = 3
  low.frequency.setValueAtTime(700, t)
  low.frequency.linearRampToValueAtTime(1250, t + 0.2)
  low.frequency.linearRampToValueAtTime(750, t + 0.6)
  const high = ctx.createBiquadFilter()
  high.type = 'bandpass'
  high.Q.value = 6
  high.frequency.value = 2300
  const gain = ctx.createGain()
  envelope(gain, t, 0.9, 0.05, t + 0.65)
  osc.connect(low).connect(gain)
  osc.connect(high).connect(gain)
  gain.connect(out)
  osc.start(t)
  osc.stop(t + 0.7)
  return 0.7
}

/** "Gâu gâu": two short barks, a falling square tone mixed with a noise burst. */
function bark(ctx: AudioContext, out: AudioNode, t: number): number {
  const noise = noiseBuffer(ctx, 0.2)
  for (const offset of [0, 0.24]) {
    const start = t + offset
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(340, start)
    osc.frequency.exponentialRampToValueAtTime(150, start + 0.13)
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 1400
    const source = ctx.createBufferSource()
    source.buffer = noise
    const rasp = ctx.createBiquadFilter()
    rasp.type = 'bandpass'
    rasp.frequency.value = 700
    rasp.Q.value = 1.2
    const gain = ctx.createGain()
    envelope(gain, start, 0.8, 0.008, start + 0.17)
    osc.connect(tone).connect(gain)
    source.connect(rasp).connect(gain)
    gain.connect(out)
    osc.start(start)
    osc.stop(start + 0.2)
    source.start(start)
    source.stop(start + 0.2)
  }
  return 0.5
}

/** Fox "yip": quick high chirps that overshoot and drop. */
function yip(ctx: AudioContext, out: AudioNode, t: number): number {
  for (const offset of [0, 0.22]) {
    const start = t + offset
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(900, start)
    osc.frequency.linearRampToValueAtTime(1650, start + 0.05)
    osc.frequency.exponentialRampToValueAtTime(700, start + 0.17)
    const edge = ctx.createOscillator()
    edge.type = 'sawtooth'
    edge.frequency.setValueAtTime(1800, start)
    edge.frequency.exponentialRampToValueAtTime(1400, start + 0.17)
    const edgeGain = ctx.createGain()
    edgeGain.gain.value = 0.12
    const gain = ctx.createGain()
    envelope(gain, start, 0.7, 0.01, start + 0.18)
    osc.connect(gain)
    edge.connect(edgeGain).connect(gain)
    gain.connect(out)
    osc.start(start)
    osc.stop(start + 0.2)
    edge.start(start)
    edge.stop(start + 0.2)
  }
  return 0.45
}

/** Rabbit/hamster squeak: two tiny high sine chirps. */
function squeak(ctx: AudioContext, out: AudioNode, t: number): number {
  for (const offset of [0, 0.15]) {
    const start = t + offset
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1900, start)
    osc.frequency.linearRampToValueAtTime(2700, start + 0.05)
    osc.frequency.linearRampToValueAtTime(2100, start + 0.1)
    const gain = ctx.createGain()
    envelope(gain, start, 0.45, 0.01, start + 0.11)
    osc.connect(gain).connect(out)
    osc.start(start)
    osc.stop(start + 0.12)
  }
  return 0.3
}

/** Panda hum: a soft low "ư" with a slight fall. */
function hum(ctx: AudioContext, out: AudioNode, t: number): number {
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(200, t)
  osc.frequency.linearRampToValueAtTime(165, t + 0.45)
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 600
  const gain = ctx.createGain()
  envelope(gain, t, 0.8, 0.08, t + 0.5)
  osc.connect(filter).connect(gain).connect(out)
  osc.start(t)
  osc.stop(t + 0.55)
  return 0.55
}

const VOICES: Record<PetVoice, (ctx: AudioContext, out: AudioNode, t: number) => number> = {
  meow,
  bark,
  yip,
  squeak,
  hum
}

/** Plays one call of the voice at `volume` (0–1). Silently does nothing without Web Audio. */
export function playPetVoice(voice: PetVoice, volume: number): void {
  const ctx = getContext()
  const level = Math.min(Math.max(volume, 0), 1)
  if (!ctx || level === 0) {
    return
  }
  if (suspendTimer) {
    clearTimeout(suspendTimer)
    suspendTimer = null
  }
  void ctx.resume().then(() => {
    const master = ctx.createGain()
    master.gain.value = level * 0.35
    master.connect(ctx.destination)
    const seconds = VOICES[voice](ctx, master, ctx.currentTime + 0.02)
    suspendTimer = setTimeout(
      () => {
        suspendTimer = null
        void ctx.suspend()
      },
      Math.ceil((seconds + 0.3) * 1000)
    )
  })
}
