import React from 'react'
import { AsciiAnimation, type RowColorResolver } from './AsciiAnimation.js'

const SCENE_WIDTH = 68
const SCENE_HEIGHT = 16
const FRAME_COUNT = 6

// Ruined castle — derived from the title-screen backdrop but with the flag
// shorn off, the upper battlements blown open, walls cracked, and debris
// strewn at the base. Flames + embers + smoke are overlaid per-frame so the
// scene appears to burn.
const RUIN: string[] = [
  '                                                                    ',
  '                                                                    ',
  '                                                                    ',
  '                                            _    _                  ',
  '                                           |;|  |;|                 ',
  '                                            \\.    /                 ',
  '                                             \\   /                  ',
  '                                             ||: |                  ',
  '                                             ||  \\                  ',
  '                                             |/   |                 ',
  '                                             ||  /                  ',
  '                                             |/_ _|                 ',
  '                                            _||_  \\                 ',
  '    ___--~`~--__         __  --~`          \\   ~`---,         ___   ',
  '-~~`            ~---__,-~   __--~~`   \\    ,   .   ~~----_--~`  `~-',
  '                                                                    ',
]

// Flame sprite columns. Each frame flickers between slightly-different glyph
// sets so the rendered fire reads as turbulent.
const FLAME_FRAMES: Array<Array<{ row: number; col: number; char: string }>> = [
  // Frame 0 — low plume, a few embers
  [
    { row: 0, col: 47, char: ' ' },
    { row: 1, col: 45, char: '^' },
    { row: 1, col: 48, char: '^' },
    { row: 1, col: 51, char: '^' },
    { row: 2, col: 44, char: '/' },
    { row: 2, col: 46, char: '|' },
    { row: 2, col: 48, char: '\\' },
    { row: 2, col: 50, char: '|' },
    { row: 2, col: 52, char: '/' },
    { row: 8, col: 58, char: '.' },
  ],
  // Frame 1 — rising plume, embers drift right
  [
    { row: 0, col: 48, char: '^' },
    { row: 0, col: 52, char: '.' },
    { row: 1, col: 46, char: '/' },
    { row: 1, col: 48, char: '^' },
    { row: 1, col: 50, char: '\\' },
    { row: 1, col: 52, char: '^' },
    { row: 2, col: 45, char: '(' },
    { row: 2, col: 47, char: '|' },
    { row: 2, col: 49, char: '|' },
    { row: 2, col: 51, char: ')' },
    { row: 9, col: 60, char: ',' },
  ],
  // Frame 2 — tall plume, ember drifts further right
  [
    { row: 0, col: 46, char: ',' },
    { row: 0, col: 49, char: '^' },
    { row: 0, col: 52, char: '`' },
    { row: 1, col: 45, char: '^' },
    { row: 1, col: 47, char: '|' },
    { row: 1, col: 49, char: '^' },
    { row: 1, col: 51, char: '|' },
    { row: 1, col: 53, char: '^' },
    { row: 2, col: 46, char: '(' },
    { row: 2, col: 48, char: ')' },
    { row: 2, col: 50, char: '(' },
    { row: 2, col: 52, char: ')' },
    { row: 10, col: 61, char: '.' },
  ],
  // Frame 3 — wide plume + smoke curling off to the right
  [
    { row: 0, col: 47, char: '^' },
    { row: 0, col: 50, char: '.' },
    { row: 0, col: 54, char: '~' },
    { row: 0, col: 57, char: '~' },
    { row: 1, col: 45, char: '(' },
    { row: 1, col: 47, char: '^' },
    { row: 1, col: 49, char: '|' },
    { row: 1, col: 51, char: '^' },
    { row: 1, col: 53, char: ')' },
    { row: 2, col: 44, char: '/' },
    { row: 2, col: 47, char: '|' },
    { row: 2, col: 49, char: '|' },
    { row: 2, col: 51, char: '|' },
    { row: 2, col: 53, char: '\\' },
    { row: 11, col: 62, char: ',' },
  ],
  // Frame 4 — curling smoke, softened flames
  [
    { row: 0, col: 46, char: '.' },
    { row: 0, col: 49, char: '^' },
    { row: 0, col: 52, char: ',' },
    { row: 0, col: 55, char: '~' },
    { row: 0, col: 58, char: '~' },
    { row: 0, col: 61, char: '.' },
    { row: 1, col: 46, char: '^' },
    { row: 1, col: 48, char: '|' },
    { row: 1, col: 50, char: '^' },
    { row: 1, col: 52, char: '|' },
    { row: 2, col: 45, char: '\\' },
    { row: 2, col: 47, char: '|' },
    { row: 2, col: 49, char: ')' },
    { row: 2, col: 51, char: '|' },
    { row: 2, col: 53, char: '/' },
  ],
  // Frame 5 — plume collapses; new embers near the ruin
  [
    { row: 0, col: 47, char: ' ' },
    { row: 0, col: 50, char: '^' },
    { row: 0, col: 56, char: '~' },
    { row: 0, col: 59, char: '~' },
    { row: 1, col: 47, char: '^' },
    { row: 1, col: 49, char: '^' },
    { row: 1, col: 51, char: '^' },
    { row: 2, col: 46, char: '(' },
    { row: 2, col: 48, char: '|' },
    { row: 2, col: 50, char: '|' },
    { row: 2, col: 52, char: ')' },
    { row: 12, col: 52, char: '.' },
    { row: 13, col: 58, char: ',' },
  ],
]

function buildFrame(frameIndex: number): string {
  // Deep-copy each row so we can overlay per-frame without mutating RUIN.
  const scene = RUIN.map((line) => line.split(''))
  const overlay = FLAME_FRAMES[frameIndex % FLAME_FRAMES.length] ?? []

  for (const { row, col, char } of overlay) {
    if (row < 0 || row >= scene.length) continue
    const line = scene[row]
    if (!line || col < 0 || col >= line.length) continue
    line[col] = char
  }

  return scene.map((line) => line.join('')).join('\n')
}

const FRAMES = Array.from({ length: FRAME_COUNT }, (_, i) => buildFrame(i))

const colorByRow: RowColorResolver = (rowIndex) => {
  // Top three rows are the fire + smoke plume — tint them red. Rows
  // immediately below are glowing embers / top of the ruin.
  if (rowIndex <= 1) return 'red'
  if (rowIndex === 2) return 'yellow'
  // Middle of the castle — scorched stone.
  if (rowIndex >= 3 && rowIndex <= 12) return 'gray'
  // Base: cracked ground and debris.
  return 'redBright'
}

export function BurningCastle({
  speed = 260,
}: {
  readonly speed?: number
}) {
  return (
    <AsciiAnimation
      isLooping
      frames={FRAMES}
      speed={speed}
      loopCount={Infinity}
      loopDuration={Infinity}
      validateFrames={false}
      colorByRow={colorByRow}
    />
  )
}

export const BURNING_CASTLE_SCENE_WIDTH = SCENE_WIDTH
export const BURNING_CASTLE_SCENE_HEIGHT = SCENE_HEIGHT
