import { Box, Text, useInput } from 'ink'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { locations } from '../constants.js'
import { useStore } from '../store/appStore.js'
import type { TimeOfDay } from '../types/animation.types.js'
import { type AsciiAnimationControls } from '../ui/components/common/AsciiAnimation.js'
import { TravelAnimation } from '../ui/components/common/TravelAnimation.js'

type TravelingScreenProperties = {
  readonly onFinish?: () => void
}

// Scale travel duration by the destination's danger level. Safe villages feel
// like a quick stroll; dangerous quarters feel like a longer, tenser trek.
const TRAVEL_BASE_DURATION_MS = 2000
const TRAVEL_MS_PER_DANGER = 400
const TRAVEL_MIN_DURATION_MS = 1800
const TRAVEL_MAX_DURATION_MS = 6000
// Hard ceiling so travel can never get stuck if the animation fails to emit
// onComplete for any reason (e.g. unmount race).
const TRAVEL_SAFETY_CUSHION_MS = 2000

const SPEED_STEP = 0.25
const SPEED_MIN = 0.5
const SPEED_MAX = 3

const TIME_OF_DAY_CYCLE: TimeOfDay[] = ['dawn', 'day', 'dusk', 'night']

function resolveDestinationDanger(destinationName: string | undefined): number {
  if (!destinationName) {
    return 3
  }

  const destination = locations.find(
    (location) => location.name === destinationName
  )
  return destination?.dangerLevel ?? 3
}

function computeTravelDurationMs(dangerLevel: number): number {
  const raw = TRAVEL_BASE_DURATION_MS + dangerLevel * TRAVEL_MS_PER_DANGER
  return Math.max(
    TRAVEL_MIN_DURATION_MS,
    Math.min(TRAVEL_MAX_DURATION_MS, raw)
  )
}

function computeTimeOfDay(day: number): TimeOfDay {
  const index = ((day % TIME_OF_DAY_CYCLE.length) + TIME_OF_DAY_CYCLE.length) %
    TIME_OF_DAY_CYCLE.length
  return TIME_OF_DAY_CYCLE[index] ?? 'day'
}

export function TravelingScreen({ onFinish }: TravelingScreenProperties) {
  const day = useStore((state) => state.game.day)
  const origin = useStore((state) => state.travel.origin)
  const destination = useStore((state) => state.travel.destination)
  const weather = useStore((state) => state.game.weather)
  const completeTravel = useStore((state) => state.completeTravel)

  const [hasCompleted, setHasCompleted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const completionTriggered = useRef(false)
  const animationControls = useRef<AsciiAnimationControls | null>(null)

  const dangerLevel = useMemo(
    () => resolveDestinationDanger(destination),
    [destination]
  )
  const durationMs = useMemo(
    () => computeTravelDurationMs(dangerLevel),
    [dangerLevel]
  )
  const timeOfDay = useMemo(() => computeTimeOfDay(day), [day])

  const finishTravel = () => {
    if (completionTriggered.current) {
      return
    }

    completionTriggered.current = true
    setHasCompleted(true)
    completeTravel()
    onFinish?.()
  }

  // Safety net: if the animation never emits onComplete (unmount race,
  // terminal quirk, etc.) force completion after duration + cushion.
  useEffect(() => {
    // When paused or running slow, stretch the safety timeout so it doesn't
    // fire while the user is deliberately lingering on the scene.
    const stretchFactor = isPaused ? 0 : 1 / Math.max(0.25, speedMultiplier)
    if (stretchFactor === 0) {
      return
    }

    const timeoutId = setTimeout(
      finishTravel,
      durationMs * stretchFactor + TRAVEL_SAFETY_CUSHION_MS
    )

    return () => {
      clearTimeout(timeoutId)
    }
  }, [durationMs, isPaused, speedMultiplier])

  // Apply pause state via imperative controls so we can resume without
  // restarting the animation from frame 0.
  useEffect(() => {
    const controls = animationControls.current
    if (!controls) {
      return
    }

    if (isPaused) {
      controls.pause()
    } else {
      controls.start()
    }
  }, [isPaused])

  useInput((input, key) => {
    if (hasCompleted) {
      return
    }

    if (input === '\r' || key.return) {
      finishTravel()
      return
    }

    if (input === ' ') {
      setIsPaused((previous) => !previous)
      return
    }

    if (input === '+' || input === '=') {
      setSpeedMultiplier((previous) =>
        Math.min(SPEED_MAX, Number((previous + SPEED_STEP).toFixed(2)))
      )
      return
    }

    if (input === '-' || input === '_') {
      setSpeedMultiplier((previous) =>
        Math.max(SPEED_MIN, Number((previous - SPEED_STEP).toFixed(2)))
      )
    }
  })

  const controlsLine = useMemo(() => {
    const speedLabel = `×${speedMultiplier.toFixed(2).replace(/\.?0+$/, '')}`
    const pauseLabel = isPaused ? 'paused' : 'running'
    return `Enter skip · Space ${pauseLabel} · +/- speed ${speedLabel}`
  }, [isPaused, speedMultiplier])

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
    >
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        <Text bold color="cyan">
          Day {day}
        </Text>
        {origin && destination && (
          <Text dimColor>
            {origin} → {destination}
          </Text>
        )}
      </Box>

      <TravelAnimation
        ref={animationControls}
        fromLocation={origin ?? 'Unknown'}
        toLocation={destination ?? 'Unknown'}
        durationMs={durationMs}
        dangerLevel={dangerLevel}
        weather={weather}
        timeOfDay={timeOfDay}
        speedMultiplier={speedMultiplier}
        onComplete={finishTravel}
      />

      <Box marginTop={1}>
        <Text dimColor>{controlsLine}</Text>
      </Box>
    </Box>
  )
}

export default TravelingScreen
