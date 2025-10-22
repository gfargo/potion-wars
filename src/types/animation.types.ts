export type AnimationFrame = string[] // Array of ASCII art lines

export type NPCAnimation = {
  idle: AnimationFrame[]
  talking: AnimationFrame[]
  trading: AnimationFrame[]
}

export type TravelAnimation = {
  name: string
  description: string
  frames: AnimationFrame[]
  duration: number // ms per frame
}

export type EncounterAnimation = {
  type: string // encounter type identifier
  frames: AnimationFrame[]
  duration: number
}

export type AnimationLibrary = {
  npcs: Record<string, NPCAnimation>
  travel: TravelAnimation[]
  encounters: Record<string, EncounterAnimation>
}

export type AnimationState = {
  currentFrame: number
  isPlaying: boolean
  loop: boolean
  onComplete?: () => void
}