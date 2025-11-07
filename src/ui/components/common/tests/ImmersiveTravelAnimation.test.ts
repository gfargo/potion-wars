import test from 'ava'
import type { TravelAnimation as TravelAnimationType } from '../../../../types/animation.types.js'
import { createImmersiveTravelAnimation } from '../TravelAnimation.js'

test('createImmersiveTravelAnimation produces cinematic frames', (t) => {
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

  t.is(immersive.frames.length, 36)
  const baseTotalDuration = baseAnimation.duration * baseAnimation.frames.length
  const totalDuration = Math.max(5200, Math.round(baseTotalDuration * 1.25))
  const expectedDuration = Math.max(
    90,
    Math.round(totalDuration / immersive.frames.length)
  )
  t.is(immersive.duration, expectedDuration)
  t.true(immersive.description.includes('Start'))
  t.true(immersive.description.includes('End'))

  const firstFrame = immersive.frames[0]
  t.truthy(firstFrame)

  const expectedWidth = firstFrame?.[0]?.length ?? 0
  t.true(expectedWidth > 0)

  for (const frame of immersive.frames) {
    for (const line of frame) {
      t.is(line.length, expectedWidth)
    }
  }
})
