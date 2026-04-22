import { Box, Text } from 'ink'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { AnimationFrame } from '../../../types/animation.types.js'

/**
 * When provided, the animation renders each row as its own Text node so
 * callers can colorize rows independently (useful for cinematic scenes like
 * the travel animation).
 */
export type RowColorResolver = (
  rowIndex: number,
  rowContent: string,
  frameIndex: number
) => string | undefined

type AsciiAnimationProperties = {
  readonly frames:
    | string[]
    | AnimationFrame[]
    | ((frameIndex: number, iteration: number, externalState?: any) => string)
  readonly speed?: number
  readonly isLooping?: boolean
  readonly loopCount?: number
  readonly loopDuration?: number
  readonly onComplete?: () => void
  readonly externalState?: any
  readonly autoStart?: boolean
  readonly validateFrames?: boolean
  readonly colorByRow?: RowColorResolver
}

const AsciiAnimationComponent = React.forwardRef<
  AsciiAnimationControls,
  AsciiAnimationProperties
>(
  (
    {
      frames,
      speed = 500,
      isLooping = true,
      loopCount = Infinity,
      loopDuration = Infinity,
      onComplete,
      externalState,
      autoStart = true,
      validateFrames = true,
      colorByRow,
    },
    reference
  ) => {
    const [frameIndex, setFrameIndex] = useState<number>(0)
    const [iteration, setIteration] = useState<number>(0)
    const [isPlaying, setIsPlaying] = useState<boolean>(autoStart)
    const [isCompleted, setIsCompleted] = useState<boolean>(false)
    const startTimeReference = useRef<number>(Date.now())
    const intervalReference = useRef<NodeJS.Timeout | undefined>(null)

    // Validate frames on mount
    useEffect(() => {
      if (validateFrames && !isValidFrames(frames)) {
        console.warn('AsciiAnimation: Invalid frames provided')
      }
    }, [frames, validateFrames])

    const getCurrentFrame = useCallback((): string => {
      if (typeof frames === 'function') {
        return frames(frameIndex, iteration, externalState)
      }

      const currentFrameData = frames[frameIndex % frames.length]

      // Handle both string[] and AnimationFrame[] (string[][])
      if (Array.isArray(currentFrameData)) {
        return currentFrameData.join('\n')
      }

      return currentFrameData ?? ''
    }, [frames, frameIndex, iteration, externalState])

    const start = useCallback(() => {
      if (!isCompleted) {
        setIsPlaying(true)
        startTimeReference.current = Date.now()
      }
    }, [isCompleted])

    const pause = useCallback(() => {
      setIsPlaying(false)
    }, [])

    const stop = useCallback(() => {
      setIsPlaying(false)
      setFrameIndex(0)
      setIteration(0)
      setIsCompleted(false)
      startTimeReference.current = Date.now()
    }, [])

    const reset = useCallback(() => {
      setFrameIndex(0)
      setIteration(0)
      setIsCompleted(false)
      startTimeReference.current = Date.now()
    }, [])

    const advanceFrame = useCallback(() => {
      if (!isPlaying || isCompleted) {
        return
      }

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

          // Animation completed
          setIsCompleted(true)
          setIsPlaying(false)
          if (intervalReference.current) {
            clearInterval(intervalReference.current)
          }

          // Call completion callback after state updates
          setTimeout(() => {
            if (onComplete) {
              onComplete()
            }
          }, 0)

          return previousIndex
        }

        return nextIndex
      })
    }, [
      frames,
      isLooping,
      loopCount,
      loopDuration,
      iteration,
      onComplete,
      isPlaying,
      isCompleted,
    ])

    useEffect(() => {
      if (isPlaying && !isCompleted) {
        // @ts-ignore - TS2540: Cannot assign to 'current' because it is a read-only property.
        intervalReference.current = setInterval(advanceFrame, speed)
      } else if (intervalReference.current) {
        clearInterval(intervalReference.current)
        // @ts-ignore - TS2540: Cannot assign to 'current' because it is a read-only property.
        intervalReference.current = undefined
      }

      return () => {
        if (intervalReference.current) {
          clearInterval(intervalReference.current)
          // @ts-ignore - TS2540: Cannot assign to 'current' because it is a read-only property.
          intervalReference.current = undefined
        }
      }
    }, [advanceFrame, speed, isPlaying, isCompleted])

    // Expose control methods via ref (for advanced usage)
    React.useImperativeHandle(
      reference,
      () => ({
        start,
        pause,
        stop,
        reset,
        isPlaying,
        isCompleted,
        currentFrame: frameIndex,
        currentIteration: iteration,
      }),
      [start, pause, stop, reset, isPlaying, isCompleted, frameIndex, iteration]
    )

    if (colorByRow) {
      const rows = getCurrentFrame().split('\n')
      return (
        <Box flexDirection="column">
          {rows.map((row, index) => (
            <Text key={index} color={colorByRow(index, row, frameIndex)}>
              {row}
            </Text>
          ))}
        </Box>
      )
    }

    return <Text>{getCurrentFrame()}</Text>
  }
)

AsciiAnimationComponent.displayName = 'AsciiAnimation'

export const AsciiAnimation = AsciiAnimationComponent

// Animation control interface for imperative usage
export type AsciiAnimationControls = {
  start: () => void
  pause: () => void
  stop: () => void
  reset: () => void
  isPlaying: boolean
  isCompleted: boolean
  currentFrame: number
  currentIteration: number
}

// Frame validation utility
function isValidFrames(frames: AsciiAnimationProperties['frames']): boolean {
  if (typeof frames === 'function') {
    return true
  }

  if (!Array.isArray(frames) || frames.length === 0) {
    return false
  }

  // Check if all frames are valid
  return frames.every((frame) => {
    if (typeof frame === 'string') {
      return true
    }

    if (Array.isArray(frame)) {
      return frame.every((line) => typeof line === 'string')
    }

    return false
  })
}
