import { Text } from 'ink'
import React, { useCallback, useEffect, useRef, useState } from 'react'

type AsciiAnimationProperties = {
  readonly frames:
    | string[]
    | ((frameIndex: number, iteration: number, externalState?: any) => string)
  readonly speed?: number
  readonly isLooping?: boolean
  readonly loopCount?: number
  readonly loopDuration?: number
  readonly onComplete?: () => void
  readonly externalState?: any
}

export function AsciiAnimation({
  frames,
  speed = 500,
  isLooping = true,
  loopCount = Infinity,
  loopDuration = Infinity,
  onComplete,
  externalState,
}: AsciiAnimationProperties) {
  const [frameIndex, setFrameIndex] = useState<number>(0)
  const [iteration, setIteration] = useState<number>(0)
  const startTimeReference = useRef<number>(Date.now())
  const intervalReference = useRef<NodeJS.Timeout | undefined>(null)

  const getCurrentFrame = useCallback((): string => {
    if (typeof frames === 'function') {
      return frames(frameIndex, iteration, externalState)
    }

    return frames[frameIndex % frames.length] ?? ''
  }, [frames, frameIndex, iteration, externalState])

  const advanceFrame = useCallback(() => {
    setFrameIndex((previousIndex) => {
      const nextIndex = previousIndex + 1
      const isLastFrame =
        nextIndex >= (typeof frames === 'function' ? Infinity : frames.length)

      const hasReachedLoopLimit = iteration >= loopCount
      const hasReachedDurationLimit =
        Date.now() - startTimeReference.current >= loopDuration

      if (isLastFrame) {
        if (isLooping && !hasReachedLoopLimit && !hasReachedDurationLimit) {
          setIteration((previous) => previous + 1)
          return 0 // Reset to start of frames
        }

        if (intervalReference.current) clearInterval(intervalReference.current)
        if (onComplete) onComplete()
        return previousIndex
      }

      return nextIndex
    })
  }, [frames, isLooping, loopCount, loopDuration, iteration, onComplete])

  useEffect(() => {
    // @ts-ignore - TS2540: Cannot assign to 'current' because it is a read-only property.
    intervalReference.current = setInterval(advanceFrame, speed)
    return () => {
      if (intervalReference.current) clearInterval(intervalReference.current)
    }
  }, [advanceFrame, speed])

  return <Text>{getCurrentFrame()}</Text>
}
