import type {
    AnimationLibrary,
    NPCAnimation,
    TravelAnimation,
    EncounterAnimation,
    AnimationFrame,
    AnimationValidationResult,
    AnimationOptimization,
} from '../../types/animation.types.js'

export class AnimationManager {
  private static instance: AnimationManager
  private animations: AnimationLibrary
  private isLoaded = false

  // Performance optimization caches
  private readonly frameCache = new Map<string, AnimationFrame[]>()
  private readonly optimizedFrameCache = new Map<string, AnimationFrame[]>()
  private readonly lastAccessTime = new Map<string, number>()

  // Memory management configuration
  private static readonly MAX_CACHED_FRAMES = 100
  private static readonly CACHE_CLEANUP_INTERVAL = 60_000 // 1 minute
  private static readonly FRAME_EXPIRY_TIME = 300_000 // 5 minutes

  private cleanupTimer?: NodeJS.Timeout

  private constructor() {
    this.animations = {
      npcs: {},
      travel: [],
      encounters: {},
    }

    // Start periodic cache cleanup
    this.startCacheCleanup()
  }

  static getInstance(): AnimationManager {
    AnimationManager.instance ||= new AnimationManager()
    return AnimationManager.instance
  }

  // For testing purposes only
  static resetInstance(): void {
    AnimationManager.instance = new AnimationManager()
  }

  /**
   * Load animations from data sources
   */
  async loadAnimations(): Promise<void> {
    if (this.isLoaded) {
      return
    }

    try {
      // Load default animations
      this.loadDefaultAnimations()
      this.isLoaded = true
    } catch (error) {
      throw new Error(
        `Failed to load animations: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }

  /**
   * Get NPC animation frames for a specific type
   * Uses caching to improve performance and reduce memory allocation
   */
  getNPCAnimation(
    npcId: string,
    type: 'idle' | 'talking' | 'trading'
  ): AnimationFrame[] {
    const cacheKey = `npc_${npcId}_${type}`

    // Check cache first
    const cached = this.frameCache.get(cacheKey)
    if (cached) {
      this.lastAccessTime.set(cacheKey, Date.now())
      return cached
    }

    const npcAnimation = this.animations.npcs[npcId]
    let frames: AnimationFrame[] | undefined

    if (npcAnimation) {
      frames = npcAnimation[type]
    }

    // Fall back to default animation for the type, then to idle
    if (!frames) {
      frames = this.getDefaultNPCAnimation(type)
    }

    if (!frames) {
      frames = this.getDefaultNPCAnimation('idle')
    }

    // Ultimate fallback
    if (!frames || frames.length === 0) {
      frames = [['  ?  ', ' /|\\ ', ' / \\ ']]
    }

    // Cache the frames
    this.cacheFrames(cacheKey, frames)

    return frames
  }

  /**
   * Get a random travel animation
   */
  getRandomTravelAnimation(): TravelAnimation {
    if (this.animations.travel.length === 0) {
      return this.getDefaultTravelAnimation()
    }

    const randomIndex = Math.floor(
      Math.random() * this.animations.travel.length
    )
    const animation = this.animations.travel[randomIndex]
    return animation || this.getDefaultTravelAnimation()
  }

  /**
   * Get encounter animation by type
   * Uses caching to improve performance
   */
  getEncounterAnimation(encounterType: string): AnimationFrame[] {
    const cacheKey = `encounter_${encounterType}`

    // Check cache first
    const cached = this.frameCache.get(cacheKey)
    if (cached) {
      this.lastAccessTime.set(cacheKey, Date.now())
      return cached
    }

    const encounter = this.animations.encounters[encounterType]
    let frames: AnimationFrame[]

    frames = encounter ? encounter.frames : this.getDefaultEncounterAnimation()

    // Cache the frames
    this.cacheFrames(cacheKey, frames)

    return frames
  }

  /**
   * Register a new NPC animation
   */
  registerNPCAnimation(npcId: string, animation: NPCAnimation): void {
    // Validate animation before registering
    const validation = this.validateNPCAnimation(animation)
    if (!validation.isValid) {
      throw new Error(
        `Invalid NPC animation for ${npcId}: ${validation.errors.join(', ')}`
      )
    }

    this.animations.npcs[npcId] = animation
  }

  /**
   * Register a new travel animation
   */
  registerTravelAnimation(animation: TravelAnimation): void {
    const validation = this.validateAnimationFrames(animation.frames)
    if (!validation.isValid) {
      throw new Error(
        `Invalid travel animation: ${validation.errors.join(', ')}`
      )
    }

    this.animations.travel.push(animation)
  }

  /**
   * Register a new encounter animation
   */
  registerEncounterAnimation(
    encounterType: string,
    animation: EncounterAnimation
  ): void {
    const validation = this.validateAnimationFrames(animation.frames)
    if (!validation.isValid) {
      throw new Error(
        `Invalid encounter animation: ${validation.errors.join(', ')}`
      )
    }

    this.animations.encounters[encounterType] = animation
  }

  /**
   * Validate animation frames
   */
  validateAnimationFrames(frames: AnimationFrame[]): AnimationValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!Array.isArray(frames) || frames.length === 0) {
      errors.push('Animation must have at least one frame')
      return { isValid: false, errors, warnings }
    }

    // Check each frame
    for (const [index, frame] of frames.entries()) {
      if (!Array.isArray(frame)) {
        errors.push(`Frame ${index} must be an array of strings`)
        continue
      }

      if (frame.length === 0) {
        warnings.push(`Frame ${index} is empty`)
      }

      // Check for consistent frame width
      if (frame.length > 0 && frame[0]) {
        const firstLineLength = frame[0].length
        for (const [lineIndex, line] of frame.entries()) {
          if (typeof line !== 'string') {
            errors.push(`Frame ${index}, line ${lineIndex} must be a string`)
          } else if (line.length !== firstLineLength) {
            warnings.push(`Frame ${index} has inconsistent line widths`)
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Validate NPC animation
   */
  validateNPCAnimation(animation: NPCAnimation): AnimationValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate each animation type
    const types: Array<keyof NPCAnimation> = ['idle', 'talking', 'trading']

    for (const type of types) {
      const frames = animation[type]
      const validation = this.validateAnimationFrames(frames)

      if (!validation.isValid) {
        errors.push(`${type} animation: ${validation.errors.join(', ')}`)
      }

      warnings.push(
        ...validation.warnings.map((w) => `${type} animation: ${w}`)
      )
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Optimize animation frames
   * Uses caching to avoid re-optimizing the same frames
   */
  optimizeAnimationData(
    frames: AnimationFrame[],
    options: AnimationOptimization
  ): AnimationFrame[] {
    const optionsKey = JSON.stringify(options)
    const framesKey = JSON.stringify(frames)
    const cacheKey = `optimized_${framesKey}_${optionsKey}`

    // Check cache first
    const cached = this.optimizedFrameCache.get(cacheKey)
    if (cached) {
      this.lastAccessTime.set(cacheKey, Date.now())
      return cached
    }

    let optimizedFrames = [...frames]

    if (options.removeEmptyFrames) {
      optimizedFrames = optimizedFrames.filter((frame) =>
        frame.some((line) => line.trim().length > 0)
      )
    }

    if (options.normalizeFrameWidth) {
      // Find the maximum width across all frames
      const maxWidth = Math.max(
        ...optimizedFrames.flatMap((frame) => frame.map((line) => line.length))
      )

      optimizedFrames = optimizedFrames.map((frame) =>
        frame.map((line) => line.padEnd(maxWidth))
      )
    }

    if (options.trimWhitespace) {
      optimizedFrames = optimizedFrames.map((frame) =>
        frame.map((line) => line.trimEnd())
      )
    }

    // Cache the optimized frames
    this.optimizedFrameCache.set(cacheKey, optimizedFrames)
    this.lastAccessTime.set(cacheKey, Date.now())
    this.limitCacheSize()

    return optimizedFrames
  }

  /**
   * Get animation library statistics
   */
  getStats(): {
    npcCount: number
    travelCount: number
    encounterCount: number
    totalFrames: number
  } {
    const npcCount = Object.keys(this.animations.npcs).length
    const travelCount = this.animations.travel.length
    const encounterCount = Object.keys(this.animations.encounters).length

    let totalFrames = 0

    // Count NPC frames
    for (const npc of Object.values(this.animations.npcs)) {
      totalFrames += npc.idle.length + npc.talking.length + npc.trading.length
    }

    // Count travel frames
    for (const travel of this.animations.travel) {
      totalFrames += travel.frames.length
    }

    // Count encounter frames
    for (const encounter of Object.values(this.animations.encounters)) {
      totalFrames += encounter.frames.length
    }

    return {
      npcCount,
      travelCount,
      encounterCount,
      totalFrames,
    }
  }

  /**
   * Clear all cached animations and frame caches
   */
  clearCache(): void {
    this.animations = {
      npcs: {},
      travel: [],
      encounters: {},
    }
    this.frameCache.clear()
    this.optimizedFrameCache.clear()
    this.lastAccessTime.clear()
    this.isLoaded = false
  }

  /**
   * Load default animations
   */
  private loadDefaultAnimations(): void {
    // Load default NPC animations
    this.loadDefaultNPCAnimations()

    // Load default travel animations
    this.loadDefaultTravelAnimations()

    // Load default encounter animations
    this.loadDefaultEncounterAnimations()
  }

  private loadDefaultNPCAnimations(): void {
    // Default merchant animation
    const defaultMerchant: NPCAnimation = {
      idle: [
        [
          '    /\\_/\\  ',
          '   ( o.o ) ',
          '    > ^ <  ',
          '   /|   |\\ ',
          '  (_)   (_)',
        ],
      ],
      talking: [
        [
          '    /\\_/\\  ',
          '   ( ^.^ ) ',
          '    > v <  ',
          '   /|   |\\ ',
          '  (_)   (_)',
        ],
        [
          '    /\\_/\\  ',
          '   ( o.o ) ',
          '    > ^ <  ',
          '   /|   |\\ ',
          '  (_)   (_)',
        ],
      ],
      trading: [
        [
          '    /\\_/\\  ',
          '   ( $.$ ) ',
          '    > ^ <  ',
          '   /|$$$|\\ ',
          '  (_)   (_)',
        ],
      ],
    }

    this.animations.npcs['default_merchant'] = defaultMerchant
    this.animations.npcs['default_informant'] = defaultMerchant
    this.animations.npcs['default_guard'] = defaultMerchant
  }

  private loadDefaultTravelAnimations(): void {
    const walkingAnimation: TravelAnimation = {
      name: 'Walking',
      description: 'A simple walking animation',
      duration: 500,
      frames: [
        ['  o  ', ' /|\\ ', ' / \\ '],
        ['  o  ', ' /|\\ ', '  /\\ '],
        ['  o  ', ' /|\\ ', ' \\/ '],
      ],
    }

    const cartAnimation: TravelAnimation = {
      name: 'Cart Travel',
      description: 'Traveling by cart',
      duration: 600,
      frames: [
        ['     o    ', '    /|\\   ', '_____|____', '  O     O '],
        ['      o   ', '     /|\\  ', '_____|____', '   O     O'],
      ],
    }

    this.animations.travel.push(walkingAnimation, cartAnimation)
  }

  private loadDefaultEncounterAnimations(): void {
    const combatAnimation: EncounterAnimation = {
      name: 'Combat',
      duration: 400,
      frames: [
        ['  ⚔️  ', ' /|\\ ', ' / \\ '],
        ['  ⚡  ', ' /|\\ ', ' / \\ '],
      ],
    }

    this.animations.encounters['combat'] = combatAnimation
  }

  private getDefaultNPCAnimation(
    type: 'idle' | 'talking' | 'trading'
  ): AnimationFrame[] {
    const defaultAnimation = this.animations.npcs['default_merchant']
    if (defaultAnimation) {
      return defaultAnimation[type]
    }

    // Fallback if no default animation is loaded
    return [['  ?  ', ' /|\\ ', ' / \\ ']]
  }

  private getDefaultTravelAnimation(): TravelAnimation {
    return {
      name: 'Default Travel',
      description: 'Default travel animation',
      duration: 500,
      frames: [['  →  ', ' --- ', '  →  ']],
    }
  }

  private getDefaultEncounterAnimation(): AnimationFrame[] {
    return [['  !  ', ' /!\\ ', ' / \\ ']]
  }

  /**
   * Cache animation frames with memory management
   */
  private cacheFrames(cacheKey: string, frames: AnimationFrame[]): void {
    this.frameCache.set(cacheKey, frames)
    this.lastAccessTime.set(cacheKey, Date.now())
    this.limitCacheSize()
  }

  /**
   * Start periodic cache cleanup to manage memory
   */
  private startCacheCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredFrames()
    }, AnimationManager.CACHE_CLEANUP_INTERVAL)
  }

  /**
   * Clean up expired frames from cache
   */
  private cleanupExpiredFrames(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, lastAccess] of this.lastAccessTime.entries()) {
      if (now - lastAccess > AnimationManager.FRAME_EXPIRY_TIME) {
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      this.frameCache.delete(key)
      this.optimizedFrameCache.delete(key)
      this.lastAccessTime.delete(key)
    }
  }

  /**
   * Limit cache size to prevent memory leaks
   */
  private limitCacheSize(): void {
    const totalCachedFrames =
      this.frameCache.size + this.optimizedFrameCache.size

    if (totalCachedFrames > AnimationManager.MAX_CACHED_FRAMES) {
      // Remove least recently used frames
      const sortedByAccess = [...this.lastAccessTime.entries()].sort(
        ([, a], [, b]) => a - b
      )

      const toRemove = Math.ceil(totalCachedFrames * 0.2) // Remove 20% of cache

      for (let i = 0; i < toRemove && i < sortedByAccess.length; i++) {
        const [key] = sortedByAccess[i]!
        this.frameCache.delete(key)
        this.optimizedFrameCache.delete(key)
        this.lastAccessTime.delete(key)
      }
    }
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    cachedFrames: number
    optimizedFrames: number
    totalCacheSize: number
    lastCleanup: number
  } {
    return {
      cachedFrames: this.frameCache.size,
      optimizedFrames: this.optimizedFrameCache.size,
      totalCacheSize: this.frameCache.size + this.optimizedFrameCache.size,
      lastCleanup: Date.now(),
    }
  }

  /**
   * Cleanup resources when instance is destroyed
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }

    this.clearCache()
  }
}
