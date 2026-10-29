import {
  AnimationMixer,
  Box3,
  DataTexture,
  DirectionalLight,
  HemisphereLight,
  LoopOnce,
  LoopRepeat,
  MeshToonMaterial,
  NearestFilter,
  PerspectiveCamera,
  RedFormat,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderer,
  type AnimationAction,
  type Material,
  type Mesh,
  type Object3D,
  type Texture
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { PetMood } from '../corner-logic'

/** Kenney Cube Pets clip names (identical for every animal in the pack). */
const CLIP_FOR_MOOD: Record<PetMood, string> = {
  sleep: 'static',
  idle: 'idle',
  work: 'walk',
  alert: 'gesture-positive',
  happy: 'dance',
  worried: 'gesture-negative',
  tired: 'idle'
}
const CROSSFADE_S = 0.2

function decodeBase64(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/** Three-step ramp for a soft cartoon shade instead of physically based lighting. */
function toonRamp(): DataTexture {
  const ramp = new DataTexture(new Uint8Array([110, 190, 255]), 3, 1, RedFormat)
  ramp.minFilter = NearestFilter
  ramp.magFilter = NearestFilter
  ramp.needsUpdate = true
  return ramp
}

/**
 * One animated pet in a small transparent WebGL canvas.
 *
 * Why the frame cap and pausing: a 30 fps cap (12 fps while asleep) and no rendering at all while
 * Orca is hidden keep the pet in the "free" range measured for the flat pet.
 */
export class PetStage {
  readonly canvas: HTMLCanvasElement
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(30, 1, 0.01, 100)
  private readonly ramp = toonRamp()
  private model: Object3D | null = null
  private mixer: AnimationMixer | null = null
  private actions = new Map<string, AnimationAction>()
  private current: AnimationAction | null = null
  private mood: PetMood = 'idle'
  private speed: 1 | 2 | 3 = 1
  private oneShot = false
  private baseY = 0
  private extent = 1
  private last = 0
  private carry = 0
  private elapsed = 0

  constructor(size: number, onContextLost: () => void) {
    this.renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(size, size)
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = SRGBColorSpace
    this.canvas = this.renderer.domElement
    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      onContextLost()
    })
    this.scene.add(new HemisphereLight(0xffffff, 0x8a93a8, 2.4))
    const key = new DirectionalLight(0xffffff, 1.4)
    key.position.set(2, 4, 5)
    this.scene.add(key)
  }

  async load(modelBase64: string): Promise<void> {
    const gltf = await new GLTFLoader().parseAsync(decodeBase64(modelBase64), '')
    this.disposeModel()
    const model = gltf.scene
    model.traverse((node) => {
      const mesh = node as Mesh
      if (!mesh.isMesh) {
        return
      }
      const old = mesh.material as Material & {
        color?: MeshToonMaterial['color']
        map?: Texture | null
      }
      mesh.material = new MeshToonMaterial({
        color: old.color,
        map: old.map ?? null,
        gradientMap: this.ramp
      })
      old.dispose()
    })
    const box = new Box3().setFromObject(model)
    const center = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3())
    this.extent = Math.max(size.x, size.y, size.z)
    model.position.sub(center)
    this.baseY = model.position.y
    // Three-quarter view reads as a character rather than a profile or a mugshot.
    model.rotation.y = -0.5
    this.scene.add(model)
    const distance = (this.extent / (2 * Math.tan((this.camera.fov * Math.PI) / 360))) * 1.5
    this.camera.position.set(0, this.extent * 0.32, distance)
    this.camera.lookAt(0, -this.extent * 0.04, 0)
    this.model = model
    this.mixer = new AnimationMixer(model)
    this.mixer.addEventListener('finished', () => {
      this.oneShot = false
      this.applyMood(true)
    })
    this.actions = new Map(gltf.animations.map((clip) => [clip.name, this.mixer!.clipAction(clip)]))
    this.current = null
    this.applyMood(true)
    this.renderOnce()
  }

  setMood(mood: PetMood, speed: 1 | 2 | 3): void {
    const changed = mood !== this.mood || speed !== this.speed
    this.mood = mood
    this.speed = speed
    if (changed && !this.oneShot) {
      this.applyMood(false)
    }
  }

  /** A short reaction (being petted) that returns to the mood clip when done. */
  react(): void {
    const action = this.actions.get('gesture-positive')
    if (!action) {
      return
    }
    this.oneShot = true
    action.setLoop(LoopOnce, 1)
    action.clampWhenFinished = true
    this.fadeTo(action)
  }

  setPaused(paused: boolean): void {
    this.last = 0
    this.renderer.setAnimationLoop(paused ? null : (time) => this.tick(time))
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null)
    this.disposeModel()
    this.ramp.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.canvas.remove()
  }

  private applyMood(immediate: boolean): void {
    const name =
      this.mood === 'work' && this.speed === 3 ? 'run' : (CLIP_FOR_MOOD[this.mood] ?? 'idle')
    const action = this.actions.get(name) ?? this.actions.get('idle')
    if (!action) {
      return
    }
    action.setLoop(LoopRepeat, Infinity)
    action.clampWhenFinished = false
    action.timeScale =
      this.mood === 'tired' ? 0.5 : this.mood === 'work' && this.speed === 2 ? 1.3 : 1
    if (action === this.current && !immediate) {
      return
    }
    this.fadeTo(action)
  }

  private fadeTo(action: AnimationAction): void {
    action.reset().setEffectiveWeight(1).play()
    if (this.current && this.current !== action) {
      this.current.crossFadeTo(action, CROSSFADE_S, false)
    }
    this.current = action
  }

  private tick(time: number): void {
    const dt = this.last ? (time - this.last) / 1000 : 0
    this.last = time
    this.carry += dt
    const fps = this.mood === 'sleep' || this.mood === 'tired' ? 12 : 30
    if (this.carry < 1 / fps) {
      return
    }
    this.step(this.carry)
    this.carry = 0
  }

  private step(seconds: number): void {
    if (!this.model || !this.mixer) {
      return
    }
    this.elapsed += seconds
    this.mixer.update(seconds)
    const t = this.elapsed
    // Procedural touches the clips lack: breathing while asleep, a hop when calling, a bowed head.
    const breathe =
      this.mood === 'sleep' || this.mood === 'tired' ? 1 + 0.03 * Math.sin(t * 2.2) : 1
    this.model.scale.set(1, breathe, 1)
    const hop = this.mood === 'alert' ? Math.abs(Math.sin(t * 5)) * this.extent * 0.12 : 0
    this.model.position.y = this.baseY + hop
    this.model.rotation.x = this.mood === 'tired' || this.mood === 'sleep' ? 0.12 : 0
    this.renderer.render(this.scene, this.camera)
  }

  private renderOnce(): void {
    this.step(0)
  }

  private disposeModel(): void {
    this.mixer?.stopAllAction()
    this.mixer = null
    this.actions.clear()
    this.current = null
    if (!this.model) {
      return
    }
    this.model.traverse((node) => {
      const mesh = node as Mesh
      if (mesh.isMesh) {
        mesh.geometry.dispose()
        const material = mesh.material as MeshToonMaterial
        material.map?.dispose()
        material.dispose()
      }
    })
    this.scene.remove(this.model)
    this.model = null
  }
}
