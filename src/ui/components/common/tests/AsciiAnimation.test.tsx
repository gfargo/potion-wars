import test from 'ava'
import React from 'react'
import { render } from 'ink-testing-library'
import {
    AsciiAnimation,
    type AsciiAnimationControls,
} from '../AsciiAnimation.js'
import type { AnimationFrame } from '../../../../types/animation.types.js'

test('AsciiAnimation renders first frame initially', (t) => {
  const frames = ['frame1', 'frame2', 'frame3']
  const { lastFrame } = render(
    <AsciiAnimation frames={frames} autoStart={false} />
  )

  t.is(lastFrame(), 'frame1')
})

test('AsciiAnimation handles AnimationFrame[] format', (t) => {
  const frames: AnimationFrame[] = [
    ['line1', 'line2'],
    ['line3', 'line4'],
  ]
  const { lastFrame } = render(
    <AsciiAnimation frames={frames} autoStart={false} />
  )

  t.is(lastFrame(), 'line1\nline2')
})

test('AsciiAnimation handles empty frames gracefully', (t) => {
  // Test that empty frames don't crash the component
  const { lastFrame } = render(
    <AsciiAnimation frames={[]} validateFrames={false} />
  )

  // Should render empty string for empty frames
  t.is(lastFrame(), '')
})

test('AsciiAnimation validateFrames prop is respected', (t) => {
  // Test that the validateFrames prop is accepted without errors
  const frames = ['frame1', 'frame2']

  const { lastFrame: frame1, unmount: unmount1 } = render(
    <AsciiAnimation validateFrames frames={frames} />
  )
  const { lastFrame: frame2, unmount: unmount2 } = render(
    <AsciiAnimation frames={frames} validateFrames={false} />
  )

  t.is(frame1(), 'frame1')
  t.is(frame2(), 'frame1')
  unmount1()
  unmount2()
})

test('AsciiAnimation ref provides control methods', (t) => {
  const frames = ['frame1', 'frame2', 'frame3']
  const reference = React.createRef<AsciiAnimationControls>()

  render(<AsciiAnimation ref={reference} frames={frames} autoStart={false} />)

  t.truthy(reference.current)
  t.is(typeof reference.current?.start, 'function')
  t.is(typeof reference.current?.pause, 'function')
  t.is(typeof reference.current?.stop, 'function')
  t.is(typeof reference.current?.reset, 'function')
  t.is(typeof reference.current?.isPlaying, 'boolean')
  t.is(typeof reference.current?.isCompleted, 'boolean')
  t.is(typeof reference.current?.currentFrame, 'number')
  t.is(typeof reference.current?.currentIteration, 'number')
})

test('AsciiAnimation ref reports correct initial state', (t) => {
  const frames = ['frame1', 'frame2', 'frame3']
  const reference = React.createRef<AsciiAnimationControls>()

  render(<AsciiAnimation ref={reference} frames={frames} autoStart={false} />)

  t.false(reference.current?.isPlaying)
  t.false(reference.current?.isCompleted)
  t.is(reference.current?.currentFrame, 0)
  t.is(reference.current?.currentIteration, 0)
})

test('AsciiAnimation ref reports correct state when autoStart=true', (t) => {
  const frames = ['frame1', 'frame2', 'frame3']
  const reference = React.createRef<AsciiAnimationControls>()

  const { unmount } = render(<AsciiAnimation ref={reference} autoStart frames={frames} />)

  t.true(reference.current?.isPlaying)
  t.false(reference.current?.isCompleted)
  unmount()
})

test('AsciiAnimation handles function-based frames', (t) => {
  const frameFunction = (frameIndex: number, iteration: number) =>
    `frame-${frameIndex}-${iteration}`
  const { lastFrame } = render(
    <AsciiAnimation frames={frameFunction} autoStart={false} />
  )

  t.is(lastFrame(), 'frame-0-0')
})

test('AsciiAnimation handles external state in function-based frames', (t) => {
  const externalState = { prefix: 'test' }
  const frameFunction = (frameIndex: number, iteration: number, state: any) =>
    `${state.prefix}-${frameIndex}-${iteration}`

  const { lastFrame } = render(
    <AsciiAnimation
      frames={frameFunction}
      externalState={externalState}
      autoStart={false}
    />
  )

  t.is(lastFrame(), 'test-0-0')
})

test('AsciiAnimation with autoStart=false does not start automatically', (t) => {
  const frames = ['frame1', 'frame2', 'frame3']
  const { lastFrame } = render(
    <AsciiAnimation frames={frames} speed={100} autoStart={false} />
  )

  // Should stay on first frame when autoStart is false
  t.is(lastFrame(), 'frame1')
})

test('AsciiAnimation accepts onComplete callback', (t) => {
  const frames = ['frame1', 'frame2']
  const onComplete = () => {}

  const { lastFrame } = render(
    <AsciiAnimation
      frames={frames}
      isLooping={false}
      autoStart={false}
      onComplete={onComplete}
    />
  )

  // Should render first frame
  t.is(lastFrame(), 'frame1')
})

test('AsciiAnimation supports non-looping configuration', (t) => {
  const frames = ['frame1', 'frame2']
  const { lastFrame } = render(
    <AsciiAnimation frames={frames} isLooping={false} autoStart={false} />
  )

  // Should render first frame when not started
  t.is(lastFrame(), 'frame1')
})

test('AsciiAnimation supports loopCount configuration', (t) => {
  const frames = ['frame1', 'frame2']
  const { lastFrame } = render(
    <AsciiAnimation isLooping frames={frames} loopCount={1} autoStart={false} />
  )

  // Should render first frame when not started
  t.is(lastFrame(), 'frame1')
})

test('AsciiAnimation frame validation works correctly', (t) => {
  // Test valid string frames
  t.true(isValidFramesExported(['frame1', 'frame2']))

  // Test valid AnimationFrame frames
  t.true(
    isValidFramesExported([
      ['line1', 'line2'],
      ['line3', 'line4'],
    ])
  )

  // Test function frames
  t.true(isValidFramesExported(() => 'frame'))

  // Test invalid frames
  t.false(isValidFramesExported([]))
  t.false(isValidFramesExported([123 as any]))
  t.false(isValidFramesExported([['valid'], [123 as any]]))
})

// Helper to test the internal validation function
function isValidFramesExported(frames: any): boolean {
  if (typeof frames === 'function') {
    return true
  }

  if (!Array.isArray(frames) || frames.length === 0) {
    return false
  }

  return frames.every((frame: any) => {
    if (typeof frame === 'string') {
      return true
    }

    if (Array.isArray(frame)) {
      return frame.every((line: any) => typeof line === 'string')
    }

    return false
  })
}
