import React, { useEffect, useState } from 'react'
import { AsciiAnimation } from './AsciiAnimation.js'
import { AnimationManager } from '../../../core/animations/AnimationManager.js'
import type { AnimationFrame } from '../../../types/animation.types.js'
import type { NPC } from '../../../types/npc.types.js'

type NPCPortraitProps = {
  readonly npc: NPC
  readonly animationType?: 'idle' | 'talking' | 'trading'
  readonly autoStart?: boolean
  readonly onAnimationComplete?: () => void
}

export function NPCPortrait({
  npc,
  animationType = 'idle',
  autoStart = true,
  onAnimationComplete
}: NPCPortraitProps) {
  const [animationFrames, setAnimationFrames] = useState<AnimationFrame[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const loadAnimation = async () => {
      try {
        const animationManager = AnimationManager.getInstance()
        await animationManager.loadAnimations()
        
        const frames = animationManager.getNPCAnimation(npc.id, animationType)
        setAnimationFrames(frames)
        setIsLoaded(true)
      } catch (error) {
        console.warn(`Failed to load animation for NPC ${npc.id}:`, error)
        // Use fallback animation
        setAnimationFrames(getFallbackAnimation(animationType))
        setIsLoaded(true)
      }
    }

    loadAnimation()
  }, [npc.id, animationType])

  if (!isLoaded) {
    return <AsciiAnimation frames={getLoadingAnimation()} autoStart={true} />
  }

  return (
    <AsciiAnimation
      frames={animationFrames}
      speed={getAnimationSpeed(animationType)}
      isLooping={shouldLoop(animationType)}
      autoStart={autoStart}
      onComplete={onAnimationComplete}
      validateFrames={false} // We trust the AnimationManager validation
    />
  )
}

// Animation configuration helpers
function getAnimationSpeed(animationType: 'idle' | 'talking' | 'trading'): number {
  switch (animationType) {
    case 'idle':
      return 1000 // Slow, relaxed animation
    case 'talking':
      return 400 // Medium speed for conversation
    case 'trading':
      return 600 // Slightly slower for emphasis
    default:
      return 500
  }
}

function shouldLoop(animationType: 'idle' | 'talking' | 'trading'): boolean {
  switch (animationType) {
    case 'idle':
      return true // Idle animations should loop continuously
    case 'talking':
      return true // Talking animations should loop during conversation
    case 'trading':
      return false // Trading animations might be one-shot
    default:
      return true
  }
}

function getLoadingAnimation(): AnimationFrame[] {
  return [
    [
      '  ...  ',
      ' .   . ',
      '  ...  '
    ],
    [
      '  .    ',
      ' .   . ',
      '  ...  '
    ],
    [
      '       ',
      ' .   . ',
      '  ...  '
    ]
  ]
}

function getFallbackAnimation(animationType: 'idle' | 'talking' | 'trading'): AnimationFrame[] {
  const baseFrame = [
    '  ???  ',
    ' (o.o) ',
    '  /|\\  ',
    '  / \\  '
  ]

  switch (animationType) {
    case 'idle':
      return [baseFrame]
    case 'talking':
      return [
        baseFrame,
        [
          '  ???  ',
          ' (^.^) ',
          '  /|\\  ',
          '  / \\  '
        ]
      ]
    case 'trading':
      return [
        [
          '  ???  ',
          ' ($.$ )',
          '  /|\\  ',
          '  / \\  '
        ]
      ]
    default:
      return [baseFrame]
  }
}