import test from 'ava'
import { AnimationManager } from '../AnimationManager.js'
import type {
  NPCAnimation,
  TravelAnimation,
  EncounterAnimation,
  AnimationFrame,
} from '../../../types/animation.types.js'

test.beforeEach(() => {
  // Reset the singleton instance before each test
  AnimationManager.resetInstance()
})

test.afterEach(() => {
  // Clean up after each test
  AnimationManager.resetInstance()
})

test('AnimationManager is a singleton', (t) => {
  const instance1 = AnimationManager.getInstance()
  const instance2 = AnimationManager.getInstance()

  t.is(instance1, instance2)
})

test('loadAnimations initializes default animations', async (t) => {
  const manager = AnimationManager.getInstance()

  // Verify no animations before loading
  let stats = manager.getStats()
  t.is(stats.npcCount, 0)
  t.is(stats.travelCount, 0)
  t.is(stats.encounterCount, 0)

  await manager.loadAnimations()

  // Test that we can get specific animations
  const idleFrames = manager.getNPCAnimation('default_merchant', 'idle')
  t.true(Array.isArray(idleFrames))
  t.true(idleFrames.length > 0)

  const travelAnimation = manager.getRandomTravelAnimation()
  t.is(typeof travelAnimation.name, 'string')

  const encounterFrames = manager.getEncounterAnimation('combat')
  t.true(Array.isArray(encounterFrames))
  t.true(encounterFrames.length > 0)

  stats = manager.getStats()
  t.true(stats.npcCount > 0, `Expected npcCount > 0, got ${stats.npcCount}`)
  t.true(
    stats.travelCount > 0,
    `Expected travelCount > 0, got ${stats.travelCount}`
  )
  t.true(
    stats.encounterCount > 0,
    `Expected encounterCount > 0, got ${stats.encounterCount}`
  )
})

test('loadAnimations is idempotent', async (t) => {
  const manager = AnimationManager.getInstance()

  await manager.loadAnimations()
  const stats1 = manager.getStats()

  // Call loadAnimations again - should not change stats
  await manager.loadAnimations()
  const stats2 = manager.getStats()

  t.deepEqual(stats1, stats2)
  t.true(stats1.npcCount > 0)
  t.true(stats1.travelCount > 0)
  t.true(stats1.encounterCount > 0)
})

test('getNPCAnimation returns default animation for unknown NPC', async (t) => {
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()

  const idleFrames = manager.getNPCAnimation('unknown_npc', 'idle')

  t.true(Array.isArray(idleFrames))
  t.true(idleFrames.length > 0)
  t.true(Array.isArray(idleFrames[0]))
})

test('getNPCAnimation returns specific animation when registered', async (t) => {
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()

  const customAnimation: NPCAnimation = {
    idle: [['custom', 'idle']],
    talking: [['custom', 'talking']],
    trading: [['custom', 'trading']],
  }

  manager.registerNPCAnimation('test_npc', customAnimation)

  const idleFrames = manager.getNPCAnimation('test_npc', 'idle')
  t.deepEqual(idleFrames, [['custom', 'idle']])

  const talkingFrames = manager.getNPCAnimation('test_npc', 'talking')
  t.deepEqual(talkingFrames, [['custom', 'talking']])

  const tradingFrames = manager.getNPCAnimation('test_npc', 'trading')
  t.deepEqual(tradingFrames, [['custom', 'trading']])
})

test('getRandomTravelAnimation returns valid animation', async (t) => {
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()

  const animation = manager.getRandomTravelAnimation()

  t.is(typeof animation.name, 'string')
  t.is(typeof animation.description, 'string')
  t.is(typeof animation.duration, 'number')
  t.true(Array.isArray(animation.frames))
  t.true(animation.frames.length > 0)
})

test('getEncounterAnimation returns frames for known encounter type', async (t) => {
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()

  const customEncounter: EncounterAnimation = {
    name: 'Test Encounter',
    duration: 300,
    frames: [['test', 'frame']],
  }

  manager.registerEncounterAnimation('test_encounter', customEncounter)

  const frames = manager.getEncounterAnimation('test_encounter')
  t.deepEqual(frames, [['test', 'frame']])
})

test('getEncounterAnimation returns default for unknown encounter type', async (t) => {
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()

  const frames = manager.getEncounterAnimation('unknown_encounter')

  t.true(Array.isArray(frames))
  t.true(frames.length > 0)
})

test('validateAnimationFrames validates correctly', (t) => {
  const manager = AnimationManager.getInstance()

  // Valid frames
  const validFrames: AnimationFrame[] = [
    ['line1', 'line2'],
    ['line3', 'line4'],
  ]

  const validResult = manager.validateAnimationFrames(validFrames)
  t.true(validResult.isValid)
  t.is(validResult.errors.length, 0)

  // Invalid frames - empty array
  const invalidFrames1: AnimationFrame[] = []
  const invalidResult1 = manager.validateAnimationFrames(invalidFrames1)
  t.false(invalidResult1.isValid)
  t.true(invalidResult1.errors.length > 0)

  // Invalid frames - non-array frame
  const invalidFrames2 = ['not', 'an', 'array'] as any
  const invalidResult2 = manager.validateAnimationFrames(invalidFrames2)
  t.false(invalidResult2.isValid)
  t.true(invalidResult2.errors.length > 0)
})

test('validateNPCAnimation validates all animation types', (t) => {
  const manager = AnimationManager.getInstance()

  // Valid NPC animation
  const validAnimation: NPCAnimation = {
    idle: [['idle1', 'idle2']],
    talking: [['talk1', 'talk2']],
    trading: [['trade1', 'trade2']],
  }

  const validResult = manager.validateNPCAnimation(validAnimation)
  t.true(validResult.isValid)
  t.is(validResult.errors.length, 0)

  // Invalid NPC animation
  const invalidAnimation: NPCAnimation = {
    idle: [],
    talking: [['talk1', 'talk2']],
    trading: [['trade1', 'trade2']],
  }

  const invalidResult = manager.validateNPCAnimation(invalidAnimation)
  t.false(invalidResult.isValid)
  t.true(invalidResult.errors.length > 0)
})

test('registerNPCAnimation throws error for invalid animation', (t) => {
  const manager = AnimationManager.getInstance()

  const invalidAnimation: NPCAnimation = {
    idle: [],
    talking: [['talk']],
    trading: [['trade']],
  }

  t.throws(() => {
    manager.registerNPCAnimation('invalid_npc', invalidAnimation)
  })
})

test('registerTravelAnimation throws error for invalid animation', (t) => {
  const manager = AnimationManager.getInstance()

  const invalidAnimation: TravelAnimation = {
    name: 'Invalid',
    description: 'Invalid animation',
    duration: 500,
    frames: [],
  }

  t.throws(() => {
    manager.registerTravelAnimation(invalidAnimation)
  })
})

test('registerEncounterAnimation throws error for invalid animation', (t) => {
  const manager = AnimationManager.getInstance()

  const invalidAnimation: EncounterAnimation = {
    name: 'Invalid',
    duration: 500,
    frames: [],
  }

  t.throws(() => {
    manager.registerEncounterAnimation('invalid', invalidAnimation)
  })
})

test('optimizeAnimationData removes empty frames', (t) => {
  const manager = AnimationManager.getInstance()

  const frames: AnimationFrame[] = [
    ['line1', 'line2'],
    [],
    ['line3', 'line4'],
    ['', ''],
  ]

  const optimized = manager.optimizeAnimationData(frames, {
    removeEmptyFrames: true,
    normalizeFrameWidth: false,
    trimWhitespace: false,
  })

  t.is(optimized.length, 2)
  t.deepEqual(optimized[0], ['line1', 'line2'])
  t.deepEqual(optimized[1], ['line3', 'line4'])
})

test('optimizeAnimationData normalizes frame width', (t) => {
  const manager = AnimationManager.getInstance()

  const frames: AnimationFrame[] = [
    ['short', 'line'],
    ['much longer line', 'another long line'],
  ]

  const optimized = manager.optimizeAnimationData(frames, {
    removeEmptyFrames: false,
    normalizeFrameWidth: true,
    trimWhitespace: false,
  })

  t.is(optimized[0]?.[0]?.length, optimized[1]?.[0]?.length)
  t.is(optimized[0]?.[1]?.length, optimized[1]?.[1]?.length)
})

test('optimizeAnimationData trims whitespace', (t) => {
  const manager = AnimationManager.getInstance()

  const frames: AnimationFrame[] = [
    ['line1   ', 'line2  '],
    ['line3 ', 'line4    '],
  ]

  const optimized = manager.optimizeAnimationData(frames, {
    removeEmptyFrames: false,
    normalizeFrameWidth: false,
    trimWhitespace: true,
  })

  t.is(optimized[0]?.[0], 'line1')
  t.is(optimized[0]?.[1], 'line2')
  t.is(optimized[1]?.[0], 'line3')
  t.is(optimized[1]?.[1], 'line4')
})

test('getStats returns correct statistics', (t) => {
  const manager = AnimationManager.getInstance()

  // Register some animations
  const npcAnimation: NPCAnimation = {
    idle: [['idle']],
    talking: [['talk1'], ['talk2']],
    trading: [['trade']],
  }

  manager.registerNPCAnimation('test_npc', npcAnimation)

  const travelAnimation: TravelAnimation = {
    name: 'Test Travel',
    description: 'Test',
    duration: 500,
    frames: [['travel1'], ['travel2']],
  }

  manager.registerTravelAnimation(travelAnimation)

  const encounterAnimation: EncounterAnimation = {
    name: 'Test Encounter',
    duration: 400,
    frames: [['encounter']],
  }

  manager.registerEncounterAnimation('test_encounter', encounterAnimation)

  const stats = manager.getStats()

  t.true(stats.npcCount >= 1)
  t.true(stats.travelCount >= 1)
  t.true(stats.encounterCount >= 1)
  t.true(stats.totalFrames > 0)
})

test('clearCache resets all animations', (t) => {
  const manager = AnimationManager.getInstance()

  // Register an animation
  const npcAnimation: NPCAnimation = {
    idle: [['idle']],
    talking: [['talk']],
    trading: [['trade']],
  }

  manager.registerNPCAnimation('test_npc', npcAnimation)

  let stats = manager.getStats()
  t.true(stats.npcCount > 0)

  manager.clearCache()

  stats = manager.getStats()
  t.is(stats.npcCount, 0)
  t.is(stats.travelCount, 0)
  t.is(stats.encounterCount, 0)
  t.is(stats.totalFrames, 0)
})
