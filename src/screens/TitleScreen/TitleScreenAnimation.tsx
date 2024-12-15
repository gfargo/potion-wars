import React from 'react'
import { AsciiAnimation } from '../../ui/components/index.js'

const CASTLE_WIDTH = 80
const SCENE_HEIGHT = 15

// Const secondCastleBackdrop = [
//   `                                  |>>>                                         `,
//   `                                  |                                            `,
//   `                    |>>>      _  _|_  _         |>>>                           `,
//   `                    |        |;| |;| |;|        |                              `,
//   `                _  _|_  _    \\.    .  /    _  _|_  _                          `,
//   `               |;|_|;|_|;|    \\:. ,  /    |;|_|;|_|;|                         `,
//   `               \\..      /    ||;   . |    \\.    .  /                         `,
//   `                \\.  ,  /     ||:  .  |     \\:  .  /                          `,
//   `                 ||:   |_   _ ||_ . _ | _   _||:   |                           `,
//   `                 ||:  .|||_|;|_|;|_|;|_|;|_|;||:.  |                           `,
//   `                 ||:   ||.    .     .      . ||:  .|                           `,
//   `                 ||: . || .     . .   .  ,   ||:   |                           `,
//   `                 ||:   ||:  ,  _______   .   ||: , |                           `,
//   `                 ||:   || .   /+++++++\    . ||:   |                           `,
//   `                 ||:   ||.    |+++++++| .    ||: . |                           `,
//   `              __ ||: . ||: ,  |+++++++|.  . _||_   |                           `,
//   `     ____--\`~    '--~~__|.    |+++++__|----~    ~\`---,              ___        `,
//   `-~--~                   ~---__|,--~'                  ~~----_____-~'   \`~----~~`,
// ]

const castleBackdrop = [
  '                                                                                ',
  '                                                |>>>                            ',
  '                                                |                               ',
  '                                            _  _|_  _                           ',
  '                                           |;|_|;|_|;|                          ',
  '                                            \\.    .  /                         ',
  '                                             \\:  .  /                          ',
  '                                             ||:   |                            ',
  '                                             ||:.  |                            ',
  '                                             ||:  .|                            ',
  '                                             ||:   |                            ',
  '                                             ||: , |                            ',
  '                                             ||:   |                            ',
  '                                             ||: . |                            ',
  '              __                            _||_   |                            ',
  "     ____--`~    '--~~__            __ ----~    ~`---,              ___         ",
  "-~--~                   ~---__ ,--~'                  ~~----_____-~'   `~----~~",
]

// Define static star positions across the sky
const starPositions = [
  { x: 5, y: 2 },
  { x: 16, y: 3 },
  { x: 12, y: 7 },
  { x: 34, y: 5 },
  { x: 56, y: 3 },
  { x: 60, y: 8 },
  { x: 66, y: 2 },
  { x: 78, y: 4 },
]
// Generate each frame by overlaying moving stars, bird, sun, and moon animations
function generateCastleFrame(frameIndex: number): string {
  // Random castle backdrop
  const scene = [...castleBackdrop]

  // Sun and Moon Parabolic Movement
  const t = frameIndex % Number(CASTLE_WIDTH) // Total animation length for a full cycle
  const parabolicHeight = (x: number) =>
    Math.round(
      -((4 * x * (x - CASTLE_WIDTH)) / CASTLE_WIDTH ** 2) * SCENE_HEIGHT
    )

  const sunPosition = t < CASTLE_WIDTH ? t : 2 * CASTLE_WIDTH - t // Oscillates between 0 and CASTLE_WIDTH
  const moonPosition = (sunPosition + CASTLE_WIDTH / 2) % CASTLE_WIDTH // Offset moon by half the width
  const sunY = parabolicHeight(sunPosition)
  const moonY = parabolicHeight(moonPosition)

  if (
    (scene[1 + sunY] !== undefined && sunY > 14) ||
    (scene[1 + sunY] !== undefined &&
      sunY > 13 &&
      sunPosition > 47 &&
      sunPosition < 56)
  ) {
    scene[1 + sunY] =
      String(scene[1 + sunY]!.slice(0, Math.max(0, sunPosition))) +
      scene[1 + sunY]!.slice(Math.max(0, sunPosition))
  } else if (scene[1 + sunY] !== undefined) {
    scene[1 + sunY] =
      scene[1 + sunY]!.slice(0, Math.max(0, sunPosition)) +
      '☼' +
      scene[1 + sunY]!.slice(Math.max(0, sunPosition + 1))
  }

  if (
    (scene[1 + moonY] !== undefined && moonY > 14) ||
    (scene[1 + moonY] !== undefined &&
      moonY > 13 &&
      moonPosition > 47 &&
      moonPosition < 56)
  ) {
    scene[1 + moonY] =
      String(scene[1 + moonY]!.slice(0, Math.max(0, moonPosition))) +
      scene[1 + moonY]!.slice(Math.max(0, moonPosition))
  } else if (scene[1 + moonY] && scene[1 + moonY] !== undefined) {
    scene[1 + moonY] =
      scene[1 + moonY]!.slice(0, Math.max(0, moonPosition)) +
      '☽' +
      scene[1 + moonY]!.slice(Math.max(0, moonPosition + 1))
  }

  const starChar = sunY < 12 ? ' ' : frameIndex % 2 === 0 ? '✦' : '✶'
  for (const { x, y } of starPositions) {
    scene[y] &&=
      scene[y].slice(0, Math.max(0, x)) +
      starChar +
      scene[y].slice(Math.max(0, x + 1))
  }

  // Bird Flapping Animation across the entire CASTLE_WIDTH
  const birdPosition = ((frameIndex * -1) % CASTLE_WIDTH) - 5
  const birdFrame = frameIndex % 2 === 0 ? '\\,/' : '/`\\'
  if (scene[9] && birdPosition < -3 && birdPosition > -CASTLE_WIDTH) {
    scene[9] =
      scene[9].slice(0, birdPosition) +
      birdFrame +
      scene[9].slice(birdPosition + 3)
  }

  return scene.join(`\n`)
}

// High Fidelity Castle Animation Component
export function TitleScreenAnimation() {
  return (
    <AsciiAnimation
      isLooping
      frames={generateCastleFrame}
      speed={280} // Adjust speed as needed
      loopDuration={Infinity}
    />
  )
}
