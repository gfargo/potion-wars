// Animation type definitions for Potion Wars
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
  duration: number // Ms per frame
}

export type EncounterAnimation = {
  name: string
  frames: AnimationFrame[]
  duration: number
}

export type AnimationLibrary = {
  npcs: Record<string, NPCAnimation>
  travel: TravelAnimation[]
  encounters: Record<string, EncounterAnimation>
}

export type AnimationState = 'idle' | 'playing' | 'paused' | 'completed'

export type AnimationConfig = {
  frames: AnimationFrame[]
  duration?: number
  loop?: boolean
  autoStart?: boolean
  onComplete?: () => void
}

// Animation validation types
export type AnimationValidationResult = {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Animation optimization types
export type AnimationOptimization = {
  removeEmptyFrames?: boolean
  normalizeFrameWidth?: boolean
  trimWhitespace?: boolean
}
