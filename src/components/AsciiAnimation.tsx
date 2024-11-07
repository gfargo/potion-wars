import { Text } from 'ink'
import React, { useCallback, useEffect, useRef, useState } from 'react'

interface AsciiAnimationProps {
  frames:
    | string[]
    | ((frameIndex: number, iteration: number, externalState?: any) => string)
  speed?: number
  loop?: boolean
  loopCount?: number
  loopDuration?: number
  onComplete?: () => void
  externalState?: any
}

export const AsciiAnimation: React.FC<AsciiAnimationProps> = ({
  frames,
  speed = 500,
  loop = true,
  loopCount = Infinity,
  loopDuration = Infinity,
  onComplete,
  externalState,
}) => {
  const [frameIndex, setFrameIndex] = useState<number>(0)
  const [iteration, setIteration] = useState<number>(0)
  const startTimeRef = useRef<number>(Date.now())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const getCurrentFrame = useCallback((): string => {
    if (typeof frames === 'function') {
      return frames(frameIndex, iteration, externalState)
    }

    return frames[frameIndex % frames.length] || ''
  }, [frames, frameIndex, iteration, externalState])

  const advanceFrame = useCallback(() => {
    setFrameIndex((prevIndex) => {
      const nextIndex = prevIndex + 1
      const isLastFrame =
        nextIndex >= (typeof frames === 'function' ? Infinity : frames.length)

      const hasReachedLoopLimit = iteration >= loopCount
      const hasReachedDurationLimit =
        Date.now() - startTimeRef.current >= loopDuration

      if (isLastFrame) {
        if (loop && !hasReachedLoopLimit && !hasReachedDurationLimit) {
          setIteration((prev) => prev + 1)
          return 0 // Reset to start of frames
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current)
          if (onComplete) onComplete()
          return prevIndex
        }
      }

      return nextIndex
    })
  }, [frames, loop, loopCount, loopDuration, iteration, onComplete])

  useEffect(() => {
    intervalRef.current = setInterval(advanceFrame, speed)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [advanceFrame, speed])

  return <Text>{getCurrentFrame()}</Text>
}
