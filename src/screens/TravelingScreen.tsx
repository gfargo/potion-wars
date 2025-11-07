import { Box, Text, useInput } from 'ink'
import React, { useEffect, useState } from 'react'
import { useStore } from '../store/appStore.js'
import { TravelAnimation } from '../ui/components/common/TravelAnimation.js'

type TravelingScreenProperties = {
  readonly onFinish: () => void
  readonly fromLocation?: string
}

export function TravelingScreen({
  onFinish,
  fromLocation,
}: TravelingScreenProperties) {
  const [timeLeft, setTimeLeft] = useState(4)
  const [showAnimation, setShowAnimation] = useState(true)
  const [flavorText, setFlavorText] = useState('')
  const [hasCompleted, setHasCompleted] = useState(false)

  // Get state and actions from Zustand store
  const day = useStore((state) => state.game.day)
  const locationName = useStore((state) => state.game.location.name)
  const completeTravel = useStore((state) => state.completeTravel)

  // Initialize flavor text on mount
  useEffect(() => {
    setFlavorText(getTravelFlavorText(locationName))
  }, [locationName])

  // Update flavor text every 2 seconds to make it more interesting
  useEffect(() => {
    const flavorTimer = setInterval(() => {
      setFlavorText(getTravelFlavorText(locationName))
    }, 2000)

    return () => {
      clearInterval(flavorTimer)
    }
  }, [locationName])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((previous) => previous - 1)
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (timeLeft === 0 && !hasCompleted) {
      setHasCompleted(true)
      // Complete travel using store action (synchronous!)
      completeTravel()
      // Call parent callback
      onFinish()
    }
  }, [timeLeft, onFinish, completeTravel, hasCompleted])

  useInput((input) => {
    if (input === '\r' && !hasCompleted) {
      setHasCompleted(true)
      // Complete travel using store action (synchronous!)
      completeTravel()
      // Call parent callback
      onFinish()
    }
  })

  const handleAnimationComplete = () => {
    setShowAnimation(false)
  }

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
    >
      <Box flexDirection="column" alignItems="center" marginBottom={2}>
        <Text bold color="cyan">
          Day {day}
        </Text>
        <Text>Traveling to {locationName}</Text>
        {fromLocation && <Text dimColor>From {fromLocation}</Text>}
      </Box>

      {/* Travel Animation */}
      {showAnimation && (
        <Box flexDirection="column" alignItems="center" marginBottom={2}>
          <TravelAnimation
            fromLocation={fromLocation || 'Unknown'}
            toLocation={locationName}
            onComplete={handleAnimationComplete}
          />
        </Box>
      )}

      {/* Progress indicator */}
      <Box flexDirection="column" alignItems="center">
        <Text>
          {'█'.repeat(4 - timeLeft)}
          {'░'.repeat(timeLeft)} {Math.round(((4 - timeLeft) / 4) * 100)}%
        </Text>
        <Text dimColor>Press Enter to skip ({timeLeft}s)</Text>
      </Box>

      {/* Travel tips or flavor text */}
      <Box marginTop={2} width="60%" justifyContent="center">
        <Text dimColor wrap="wrap">
          {flavorText}
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Get flavor text for traveling to different locations
 */
function getTravelFlavorText(locationName: string): string {
  const flavorTexts: Record<string, string[]> = {
    "Alchemist's Quarter": [
      'The scent of brewing potions fills the air as you approach the quarter.',
      'Smoke rises from countless chimneys, each hiding alchemical secrets.',
      'You hear the bubbling of cauldrons and the clink of glass vials.',
    ],
    'Royal Castle': [
      'The imposing towers of the castle loom ahead, guards watching your approach.',
      'Banners flutter in the wind as you make your way to the royal grounds.',
      'The sound of marching guards echoes through the stone corridors.',
    ],
    "Merchant's District": [
      'The bustling sounds of commerce grow louder as you enter the district.',
      'Merchants call out their wares while coins change hands rapidly.',
      'The aroma of exotic spices and goods from distant lands fills the air.',
    ],
    'Enchanted Forest': [
      'Ancient trees whisper secrets as you venture into the mystical woods.',
      'Magical creatures dart between the shadows of towering oaks.',
      'The very air seems to shimmer with arcane energy.',
    ],
    'Peasant Village': [
      'Simple folk go about their daily tasks as you enter the humble village.',
      'Chickens scatter as you walk down the dirt path between modest homes.',
      'The smell of fresh bread and honest work welcomes you.',
    ],
  }

  const texts = flavorTexts[locationName] || [
    'You make your way through unfamiliar territory.',
    'The journey continues as new sights unfold before you.',
    'Each step brings you closer to your destination.',
  ]

  return texts[Math.floor(Math.random() * texts.length)] || texts[0]!
}

export default TravelingScreen
