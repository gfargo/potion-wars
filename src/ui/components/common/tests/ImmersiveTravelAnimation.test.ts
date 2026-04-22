import test from 'ava'
import type { TravelAnimation as TravelAnimationType } from '../../../../types/animation.types.js'
import { createImmersiveTravelAnimation } from '../TravelAnimation.js'

const IMMERSIVE_FRAME_COUNT = 36

test('createImmersiveTravelAnimation produces cinematic frames', (t) => {
  const immersive = createImmersiveTravelAnimation({
    fromLocation: 'Start',
    toLocation: 'End',
  })

  t.is(immersive.frames.length, IMMERSIVE_FRAME_COUNT)
  t.true(immersive.description.includes('Start'))
  t.true(immersive.description.includes('End'))

  const firstFrame = immersive.frames[0]
  t.truthy(firstFrame)

  const expectedWidth = firstFrame?.[0]?.length ?? 0
  t.true(expectedWidth > 0)

  // All frames must have consistent width so terminal rendering stays stable.
  for (const frame of immersive.frames) {
    for (const line of frame) {
      t.is(line.length, expectedWidth)
    }
  }
})

test('createImmersiveTravelAnimation respects an explicit durationMs', (t) => {
  const durationMs = 3000
  const immersive = createImmersiveTravelAnimation({
    fromLocation: 'Start',
    toLocation: 'End',
    durationMs,
  })

  const expectedPerFrame = Math.max(
    40,
    Math.round(durationMs / IMMERSIVE_FRAME_COUNT)
  )
  t.is(immersive.duration, expectedPerFrame)
})

test('createImmersiveTravelAnimation clamps very short durations', (t) => {
  const immersive = createImmersiveTravelAnimation({
    fromLocation: 'Start',
    toLocation: 'End',
    durationMs: 100, // Well below the minimum
  })

  // Per-frame duration must stay above the minimum to avoid terminal thrashing.
  t.true(immersive.duration >= 40)
})

test('createImmersiveTravelAnimation renders biome silhouettes for known destinations', (t) => {
  const immersive = createImmersiveTravelAnimation({
    fromLocation: 'Peasant Village',
    toLocation: 'Royal Castle',
    durationMs: 3000,
  })

  // Biome silhouettes only kick in past progress >= 0.35. Frame 14 of 36 is
  // ~0.40, so the castle silhouette should show up on its dedicated row.
  const lateFrame = immersive.frames[14]
  t.truthy(lateFrame)
  const biomeRow = lateFrame![4] // BIOME_ROW = SKY_HEIGHT - 1 = 4
  t.true(biomeRow!.includes('_|_'))
})

test('createImmersiveTravelAnimation skips biome silhouettes for unknown destinations', (t) => {
  const immersive = createImmersiveTravelAnimation({
    fromLocation: 'Nowhere',
    toLocation: 'Somewhere Invented',
    durationMs: 3000,
  })

  const lateFrame = immersive.frames[20]
  t.truthy(lateFrame)
  const biomeRow = lateFrame![4]
  // No silhouette pattern = no `_|_` or tree/cottage glyphs
  t.false(biomeRow!.includes('_|_'))
  t.false(biomeRow!.includes('[=='))
})

test('createImmersiveTravelAnimation injects rain glyphs when weather is rainy', (t) => {
  const rainy = createImmersiveTravelAnimation({
    fromLocation: 'A',
    toLocation: 'B',
    weather: 'rainy',
    durationMs: 3000,
  })

  const sunny = createImmersiveTravelAnimation({
    fromLocation: 'A',
    toLocation: 'B',
    weather: 'sunny',
    durationMs: 3000,
  })

  // Count how many `/` appear across sky rows (0..4) in frame 5. Rainy
  // overlay should materially exceed the sunny baseline.
  const skySlashCount = (animation: typeof rainy) =>
    animation
      .frames[5]!.slice(0, 5)
      .join('')
      .split('/')
      .length - 1

  t.true(skySlashCount(rainy) > skySlashCount(sunny) + 3)
})

test('createImmersiveTravelAnimation draws a fog band when weather is foggy', (t) => {
  const foggy = createImmersiveTravelAnimation({
    fromLocation: 'A',
    toLocation: 'B',
    weather: 'foggy',
    durationMs: 3000,
  })

  // Fog band lives on rows 3 and 4.
  const fogRow = foggy.frames[3]![3]
  t.true(fogRow!.includes('~'))
})

test('createImmersiveTravelAnimation adds danger shadows on high-danger routes', (t) => {
  const danger7 = createImmersiveTravelAnimation({
    fromLocation: 'A',
    toLocation: 'B',
    dangerLevel: 7,
    durationMs: 3000,
  })

  const danger2 = createImmersiveTravelAnimation({
    fromLocation: 'A',
    toLocation: 'B',
    dangerLevel: 2,
    durationMs: 3000,
  })

  // Flatten road rows and count shadow glyphs.
  const countShadow = (animation: typeof danger7) => {
    let total = 0
    for (const frame of animation.frames) {
      for (let r = 6; r < 17; r += 1) {
        const row = frame[r] ?? ''
        total += (row.match(/[░;]/g) ?? []).length
      }
    }
    return total
  }

  t.true(countShadow(danger7) > countShadow(danger2) + 10)
})

test('createImmersiveTravelAnimation still supports legacy baseAnimation callers', (t) => {
  const baseAnimation: TravelAnimationType = {
    name: 'Base',
    description: 'Base animation for preview',
    duration: 600,
    frames: [
      ['ABC', 'DEF'],
      ['GHI', 'JKL'],
    ],
  }

  const immersive = createImmersiveTravelAnimation({
    baseAnimation,
    fromLocation: 'Start',
    toLocation: 'End',
  })

  t.is(immersive.frames.length, IMMERSIVE_FRAME_COUNT)
  t.true(immersive.name.includes('Journey'))
  t.true(immersive.duration >= 40)
})
