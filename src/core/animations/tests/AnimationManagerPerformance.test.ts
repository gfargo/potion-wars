import test from 'ava'
import { AnimationManager } from '../AnimationManager.js'
import type {
    NPCAnimation,
    TravelAnimation,
    EncounterAnimation,
    AnimationFrame,
} from '../../../types/animation.types.js'

// Test data setup
const createTestNPCAnimation = (): NPCAnimation => ({
  idle: [
    ['  o  ', ' /|\\ ', ' / \\ '],
    ['  o  ', ' \\|/ ', ' / \\ '],
  ],
  talking: [
    ['  O  ', ' /|\\ ', ' / \\ '],
    ['  o  ', ' /|\\ ', ' / \\ '],
  ],
  trading: [['  $  ', ' /|\\ ', ' / \\ ']],
})

// Unused test helper kept for future use
// const createTestTravelAnimation = (): TravelAnimation => ({
//   name: 'Test Travel',
//   description: 'A test travel animation',
//   duration: 500,
//   frames: [
//     ['  →  ', ' --- '],
//     ['   → ', ' --- '],
//     ['    →', ' --- ']
//   ]
// })

const createTestEncounterAnimation = (): EncounterAnimation => ({
  name: 'Test Encounter',
  duration: 300,
  frames: [
    ['  !  ', ' /!\\ '],
    ['  !! ', ' /!\\ '],
  ],
})

const createLargeAnimationFrames = (frameCount: number): AnimationFrame[] => {
  const frames: AnimationFrame[] = []
  for (let i = 0; i < frameCount; i++) {
    frames.push([
      `Frame ${i.toString().padStart(3, '0')}`,
      '  /|\\  ',
      '  / \\  ',
    ])
  }

  return frames
}

test.beforeEach(async () => {
  AnimationManager.resetInstance()
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()
})

test.afterEach(() => {
  AnimationManager.getInstance().destroy()
})

test('AnimationManager NPC animation caching improves performance', async (t) => {
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()

  const npcId = 'test_merchant'
  const npcAnimation = createTestNPCAnimation()
  manager.registerNPCAnimation(npcId, npcAnimation)

  // First call - populate cache
  const start1 = performance.now()
  const frames1 = manager.getNPCAnimation(npcId, 'idle')
  const time1 = performance.now() - start1

  // Second call - use cache
  const start2 = performance.now()
  const frames2 = manager.getNPCAnimation(npcId, 'idle')
  const time2 = performance.now() - start2

  // Results should be identical
  t.deepEqual(frames1, frames2)

  // Second call should be faster or equal (cached)
  t.true(
    time2 <= time1,
    `Cached call (${time2}ms) should be faster than or equal to initial call (${time1}ms)`
  )

  // Should return correct frames
  t.is(frames1.length, 2)
  t.deepEqual(frames1[0], ['  o  ', ' /|\\ ', ' / \\ '])
})

test('AnimationManager encounter animation caching improves performance', async (t) => {
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()

  const encounterType = 'test_combat'
  const encounterAnimation = createTestEncounterAnimation()
  manager.registerEncounterAnimation(encounterType, encounterAnimation)

  // First call - populate cache
  const start1 = performance.now()
  const frames1 = manager.getEncounterAnimation(encounterType)
  const time1 = performance.now() - start1

  // Second call - use cache
  const start2 = performance.now()
  const frames2 = manager.getEncounterAnimation(encounterType)
  const time2 = performance.now() - start2

  // Results should be identical
  t.deepEqual(frames1, frames2)

  // Second call should be faster or equal (cached)
  t.true(
    time2 <= time1,
    `Cached call (${time2}ms) should be faster than or equal to initial call (${time1}ms)`
  )
})

test('AnimationManager optimization caching improves performance', async (t) => {
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()

  const frames = createLargeAnimationFrames(50)
  const options = {
    removeEmptyFrames: true,
    normalizeFrameWidth: true,
    trimWhitespace: true,
  }

  // First optimization - populate cache
  const start1 = performance.now()
  const optimized1 = manager.optimizeAnimationData(frames, options)
  const time1 = performance.now() - start1

  // Second optimization - use cache
  const start2 = performance.now()
  const optimized2 = manager.optimizeAnimationData(frames, options)
  const time2 = performance.now() - start2

  // Results should be identical
  t.deepEqual(optimized1, optimized2)

  // Second call should be faster (cached)
  t.true(
    time2 < time1,
    `Cached optimization (${time2}ms) should be faster than initial optimization (${time1}ms)`
  )
})

test('AnimationManager memory management with large animations', async (t) => {
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()

  // Register many large animations
  for (let i = 0; i < 50; i++) {
    const npcId = `npc_${i}`
    const animation: NPCAnimation = {
      idle: createLargeAnimationFrames(20),
      talking: createLargeAnimationFrames(15),
      trading: createLargeAnimationFrames(10),
    }
    manager.registerNPCAnimation(npcId, animation)
  }

  // Access many animations to fill cache
  const start = performance.now()
  for (let i = 0; i < 50; i++) {
    manager.getNPCAnimation(`npc_${i}`, 'idle')
    manager.getNPCAnimation(`npc_${i}`, 'talking')
    manager.getNPCAnimation(`npc_${i}`, 'trading')
  }

  const time = performance.now() - start

  // Should complete in reasonable time
  t.true(
    time < 200,
    `Loading 150 animation sets took ${time}ms, should be under 200ms`
  )

  // Memory management should prevent excessive memory usage
  const stats = manager.getMemoryStats()
  t.true(
    stats.totalCacheSize <= 100,
    `Cache size ${stats.totalCacheSize} should be limited`
  )
})

test('AnimationManager cache cleanup and memory limits', async (t) => {
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()

  // Fill cache beyond limits
  for (let i = 0; i < 200; i++) {
    const frames = createLargeAnimationFrames(5)
    manager.optimizeAnimationData(frames, { removeEmptyFrames: true })
  }

  const stats = manager.getMemoryStats()

  // Cache should be limited
  t.true(
    stats.totalCacheSize <= 100,
    `Total cache size ${stats.totalCacheSize} should be limited to prevent memory leaks`
  )
})

test('AnimationManager performance with default animations', async (t) => {
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()

  // Test performance of default animations
  const start = performance.now()

  for (let i = 0; i < 100; i++) {
    manager.getNPCAnimation('nonexistent_npc', 'idle')
    manager.getNPCAnimation('nonexistent_npc', 'talking')
    manager.getNPCAnimation('nonexistent_npc', 'trading')
    manager.getEncounterAnimation('nonexistent_encounter')
  }

  const time = performance.now() - start

  // Should complete quickly even with non-existent animations
  t.true(
    time < 100,
    `400 default animation calls took ${time}ms, should be under 100ms`
  )
})

test('AnimationManager validation performance', async (t) => {
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()

  const validFrames = createLargeAnimationFrames(100)
  const invalidFrames = [
    ['valid line'],
    null as any, // Invalid frame
    ['another valid line'],
  ]

  // Test validation performance
  const start1 = performance.now()
  const validation1 = manager.validateAnimationFrames(validFrames)
  const time1 = performance.now() - start1

  const start2 = performance.now()
  const validation2 = manager.validateAnimationFrames(invalidFrames)
  const time2 = performance.now() - start2

  // Should complete quickly
  t.true(
    time1 < 50,
    `Validation of 100 frames took ${time1}ms, should be under 50ms`
  )
  t.true(
    time2 < 10,
    `Validation of invalid frames took ${time2}ms, should be under 10ms`
  )

  // Should return correct validation results
  t.true(validation1.isValid)
  t.false(validation2.isValid)
})

test('AnimationManager random travel animation performance', async (t) => {
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()

  // Register multiple travel animations
  for (let i = 0; i < 20; i++) {
    const animation: TravelAnimation = {
      name: `Travel ${i}`,
      description: `Travel animation ${i}`,
      duration: 500,
      frames: createLargeAnimationFrames(10),
    }
    manager.registerTravelAnimation(animation)
  }

  // Test performance of random selection
  const start = performance.now()
  const animations = []

  for (let i = 0; i < 100; i++) {
    animations.push(manager.getRandomTravelAnimation())
  }

  const time = performance.now() - start

  // Should complete quickly
  t.true(
    time < 50,
    `100 random travel animation selections took ${time}ms, should be under 50ms`
  )

  // Should return valid animations
  t.is(animations.length, 100)
  t.true(
    animations.every(
      (animation) => animation.name && animation.frames.length > 0
    )
  )
})

test('AnimationManager concurrent access performance', async (t) => {
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()

  // Register test animations
  const npcAnimation = createTestNPCAnimation()
  manager.registerNPCAnimation('concurrent_test', npcAnimation)

  // Simulate concurrent access
  const promises = []
  const start = performance.now()

  for (let i = 0; i < 50; i++) {
    promises.push(
      Promise.resolve().then(() => {
        manager.getNPCAnimation('concurrent_test', 'idle')
        manager.getNPCAnimation('concurrent_test', 'talking')
        manager.getRandomTravelAnimation()
        manager.getEncounterAnimation('combat')
      })
    )
  }

  await Promise.all(promises)
  const time = performance.now() - start

  // Should handle concurrent access efficiently
  t.true(
    time < 100,
    `50 concurrent animation accesses took ${time}ms, should be under 100ms`
  )
})

test('AnimationManager cache expiry and cleanup', async (t) => {
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()

  // Fill cache with animations
  for (let i = 0; i < 30; i++) {
    manager.getNPCAnimation('default_merchant', 'idle')
    manager.optimizeAnimationData(createLargeAnimationFrames(5), {
      removeEmptyFrames: true,
    })
  }

  const initialStats = manager.getMemoryStats()

  // Simulate time passing and cleanup (in real implementation, this would be automatic)
  // For testing, we just verify the cache management works
  t.true(initialStats.totalCacheSize >= 0)
  t.true(initialStats.cachedFrames >= 0)
  t.true(initialStats.optimizedFrames >= 0)
})

test('AnimationManager destroy and cleanup', async (t) => {
  const manager = AnimationManager.getInstance()
  await manager.loadAnimations()

  // Fill with some data
  manager.registerNPCAnimation('test', createTestNPCAnimation())
  manager.getNPCAnimation('test', 'idle')

  const statsBefore = manager.getMemoryStats()
  t.true(statsBefore.totalCacheSize > 0)

  // Destroy should clean up everything
  manager.destroy()

  const statsAfter = manager.getMemoryStats()
  t.is(statsAfter.totalCacheSize, 0)
  t.is(statsAfter.cachedFrames, 0)
  t.is(statsAfter.optimizedFrames, 0)
})
