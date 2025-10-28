import React, { useEffect, useState } from 'react'
import { AsciiAnimation } from './AsciiAnimation.js'
import { AnimationManager } from '../../../core/animations/AnimationManager.js'
import type { TravelAnimation as TravelAnimationType, AnimationFrame } from '../../../types/animation.types.js'

type TravelAnimationProps = {
  readonly fromLocation: string
  readonly toLocation: string
  readonly onComplete: () => void
  readonly autoStart?: boolean
}

export function TravelAnimation({
  fromLocation,
  toLocation,
  onComplete,
  autoStart = true
}: TravelAnimationProps) {
  const [animation, setAnimation] = useState<TravelAnimationType | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const loadAnimation = async () => {
      try {
        const animationManager = AnimationManager.getInstance()
        await animationManager.loadAnimations()
        
        // Get a random travel animation
        const travelAnimation = animationManager.getRandomTravelAnimation()
        setAnimation(travelAnimation)
        setIsLoaded(true)
      } catch (error) {
        console.warn('Failed to load travel animation:', error)
        // Use fallback animation
        setAnimation(getFallbackTravelAnimation(fromLocation, toLocation))
        setIsLoaded(true)
      }
    }

    loadAnimation()
  }, [fromLocation, toLocation])

  if (!isLoaded || !animation) {
    return <AsciiAnimation frames={getLoadingAnimation()} autoStart={true} />
  }

  return (
    <AsciiAnimation
      frames={animation.frames}
      speed={animation.duration}
      isLooping={false} // Travel animations should play once
      autoStart={autoStart}
      onComplete={onComplete}
      validateFrames={false}
    />
  )
}

// Helper functions
function getLoadingAnimation(): AnimationFrame[] {
  return [
    [
      'Preparing for travel...',
      '                      ',
      '        →             '
    ],
    [
      'Preparing for travel...',
      '                      ',
      '          →           '
    ],
    [
      'Preparing for travel...',
      '                      ',
      '            →         '
    ]
  ]
}

function getFallbackTravelAnimation(fromLocation: string, toLocation: string): TravelAnimationType {
  return {
    name: 'Default Travel',
    description: `Traveling from ${fromLocation} to ${toLocation}`,
    duration: 500,
    frames: [
      [
        `Leaving ${fromLocation}...`,
        '                          ',
        '   o                      ',
        '  /|\\                     ',
        '  / \\                     ',
        '                          '
      ],
      [
        'Traveling...',
        '                          ',
        '        o                 ',
        '       /|\\                ',
        '       / \\                ',
        '                          '
      ],
      [
        'Traveling...',
        '                          ',
        '             o            ',
        '            /|\\           ',
        '            / \\           ',
        '                          '
      ],
      [
        'Almost there...',
        '                          ',
        '                  o       ',
        '                 /|\\      ',
        '                 / \\      ',
        '                          '
      ],
      [
        `Arriving at ${toLocation}!`,
        '                          ',
        '                      o   ',
        '                     /|\\  ',
        '                     / \\  ',
        '                          '
      ]
    ]
  }
}

// Location-specific travel animations
export function getLocationSpecificAnimation(fromLocation: string, toLocation: string): TravelAnimationType | null {
  // This could be expanded to include specific animations for certain location pairs
  const locationPairs: Record<string, TravelAnimationType> = {
    'Market Square->Alchemist Quarter': {
      name: 'Market to Alchemist',
      description: 'Walking through the busy market to the quiet alchemist quarter',
      duration: 400,
      frames: [
        [
          'Leaving the bustling market...',
          '                             ',
          '  🏪  o  🏪                  ',
          '     /|\\                     ',
          '     / \\                     '
        ],
        [
          'Walking through the streets...',
          '                             ',
          '       o                     ',
          '      /|\\                    ',
          '      / \\                    '
        ],
        [
          'Entering the alchemist quarter...',
          '                               ',
          '  ⚗️   o   ⚗️                  ',
          '      /|\\                      ',
          '      / \\                      '
        ]
      ]
    }
  }

  const key = `${fromLocation}->${toLocation}`
  return locationPairs[key] || null
}