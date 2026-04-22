#!/usr/bin/env node
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Text, render, useInput } from 'ink'
import {
  AsciiAnimation,
  type AsciiAnimationControls,
} from '../ui/components/common/AsciiAnimation.js'
import { createImmersiveTravelAnimation } from '../ui/components/common/TravelAnimation.js'
import type { TravelAnimation as TravelAnimationType } from '../types/animation.types.js'

type PreviewOptions = {
  readonly fromLocation: string
  readonly toLocation: string
  readonly speedModifier: number
}

const MIN_SPEED = 0.25
const MAX_SPEED = 4
const SPEED_STEP = 0.25

const fallbackBaseAnimation: TravelAnimationType = {
  name: 'Preview Fallback',
  description: 'Simple traveler stroll for preview mode',
  duration: 600,
  frames: [
    ['  o    ', ' /|\\   ', ' / \\   '],
    ['   o   ', '  /|\\  ', '  / \\  '],
  ],
}

function parseCliArguments(): PreviewOptions {
  const getFlagValue = (flag: string, defaultValue: string): string => {
    const index = process.argv.indexOf(flag)
    if (index === -1) {
      return defaultValue
    }

    return process.argv[index + 1] ?? defaultValue
  }

  const getNumberFlag = (flag: string, defaultValue: number): number => {
    const raw = getFlagValue(flag, defaultValue.toString())
    const parsed = Number.parseFloat(raw)
    if (Number.isFinite(parsed)) {
      return parsed
    }

    return defaultValue
  }

  const parsedSpeed = getNumberFlag('--speed', 1)
  const normalizedSpeed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, parsedSpeed))

  return {
    fromLocation: getFlagValue('--from', 'Market Square'),
    toLocation: getFlagValue('--to', 'Alchemist Quarter'),
    speedModifier: normalizedSpeed,
  }
}

const previewOptions = parseCliArguments()

function TravelAnimationPreviewApp({
  fromLocation,
  toLocation,
  initialSpeed,
}: {
  readonly fromLocation: string
  readonly toLocation: string
  readonly initialSpeed: number
}) {
  const [immersiveAnimation, setImmersiveAnimation] = useState<
    TravelAnimationType | undefined
  >(undefined)
  const [status, setStatus] = useState<string>('loading animations…')
  const [speedModifier, setSpeedModifier] = useState<number>(initialSpeed)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [reloadIndex, setReloadIndex] = useState<number>(0)
  const [iterationCount, setIterationCount] = useState<number>(0)
  const animationControls = useRef<AsciiAnimationControls | null>(null)
  const isPausedReference = useRef<boolean>(isPaused)

  useEffect(() => {
    const immersive = createImmersiveTravelAnimation({
      baseAnimation: fallbackBaseAnimation,
      fromLocation,
      toLocation,
    })

    setImmersiveAnimation(immersive)
    setStatus('previewing')
    setIterationCount(0)
  }, [fromLocation, toLocation, reloadIndex])

  useEffect(() => {
    isPausedReference.current = isPaused
  }, [isPaused])

  useEffect(() => {
    const controls = animationControls.current
    if (!controls || !immersiveAnimation) {
      return
    }

    controls.stop()
    controls.reset()

    if (!isPausedReference.current) {
      controls.start()
    }
  }, [immersiveAnimation])

  useEffect(() => {
    if (!animationControls.current) {
      return
    }

    if (isPaused) {
      animationControls.current.pause()
    } else {
      animationControls.current.start()
    }
  }, [isPaused])

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      process.exit(0)
    }

    if (input === ' ') {
      setIsPaused((previous) => !previous)
    }

    if (input === '+' || input === '=') {
      setSpeedModifier((previous) =>
        Math.min(MAX_SPEED, Number((previous + SPEED_STEP).toFixed(2)))
      )
    }

    if (input === '-' || key.backspace) {
      setSpeedModifier((previous) =>
        Math.max(MIN_SPEED, Number((previous - SPEED_STEP).toFixed(2)))
      )
    }

    if (input === 'r') {
      setReloadIndex((previous) => previous + 1)
    }
  })

  const effectiveDuration = useMemo(() => {
    if (!immersiveAnimation) {
      return 120
    }

    const adjusted = immersiveAnimation.duration / speedModifier
    return Math.max(40, Math.round(adjusted))
  }, [immersiveAnimation, speedModifier])

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text color="cyan">
          Potion Wars Travel Animation Preview · {fromLocation} → {toLocation}
        </Text>
        <Text>
          Controls: space pause/resume · +/- adjust speed · r reload animation ·
          q exit
        </Text>
        <Text>
          Status: {status} · Speed ×{speedModifier.toFixed(2)} · Iterations{' '}
          {iterationCount}
        </Text>
      </Box>
      {immersiveAnimation ? (
        <AsciiAnimation
          ref={animationControls}
          frames={immersiveAnimation.frames}
          speed={effectiveDuration}
          isLooping={false}
          loopCount={1}
          autoStart={!isPaused}
          validateFrames={false}
          onComplete={() => {
            setIterationCount((previous) => previous + 1)
            const controls = animationControls.current
            if (!controls) {
              return
            }

            controls.reset()
            if (!isPausedReference.current) {
              controls.start()
            }
          }}
        />
      ) : (
        <Text color="gray">Loading travel animation data…</Text>
      )}
    </Box>
  )
}

render(
  <TravelAnimationPreviewApp
    fromLocation={previewOptions.fromLocation}
    toLocation={previewOptions.toLocation}
    initialSpeed={previewOptions.speedModifier}
  />
)
