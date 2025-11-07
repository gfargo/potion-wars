import React, { useEffect, useMemo, useState } from 'react'
import { AnimationManager } from '../../../core/animations/AnimationManager.js'
import type {
  TravelAnimation as TravelAnimationType,
  AnimationFrame,
} from '../../../types/animation.types.js'
import { AsciiAnimation } from './AsciiAnimation.js'

type TravelAnimationProperties = {
  readonly fromLocation: string
  readonly toLocation: string
  readonly onComplete: () => void
  readonly autoStart?: boolean
}

export function TravelAnimation({
  fromLocation,
  toLocation,
  onComplete,
  autoStart = true,
}: TravelAnimationProperties) {
  const [animation, setAnimation] = useState<TravelAnimationType | undefined>(
    undefined
  )
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let isActive = true

    const loadAnimation = async () => {
      try {
        const animationManager = AnimationManager.getInstance()
        await animationManager.loadAnimations()

        const locationSpecific = getLocationSpecificAnimation(
          fromLocation,
          toLocation
        )
        const travelAnimation =
          locationSpecific ?? animationManager.getRandomTravelAnimation()

        if (!isActive) {
          return
        }

        setAnimation(travelAnimation)
        setIsLoaded(true)
      } catch (error) {
        console.warn('Failed to load travel animation:', error)
        // Use fallback animation
        if (!isActive) {
          return
        }

        setAnimation(getFallbackTravelAnimation(fromLocation, toLocation))
        setIsLoaded(true)
      }
    }

    loadAnimation()

    return () => {
      isActive = false
    }
  }, [fromLocation, toLocation])

  const immersiveAnimation = useMemo(() => {
    if (!animation) {
      return null
    }

    return createImmersiveTravelAnimation({
      baseAnimation: animation,
      fromLocation,
      toLocation,
    })
  }, [animation, fromLocation, toLocation])

  if (!isLoaded || !immersiveAnimation) {
    return <AsciiAnimation autoStart isLooping frames={getLoadingAnimation()} />
  }

  return (
    <AsciiAnimation
      isLooping // Loop animations for the entire travel duration
      frames={immersiveAnimation.frames}
      speed={immersiveAnimation.duration}
      autoStart={autoStart}
      validateFrames={false}
      onComplete={onComplete}
    />
  )
}

// Helper functions
function getLoadingAnimation(): AnimationFrame[] {
  return [
    [
      'Preparing expedition supplies...',
      '  Packing satchels and polishing glassware',
      '  Infusing travel potions for steady footing',
      '                       ',
      '           ✦           ',
    ],
    [
      'Preparing expedition supplies...',
      '  Checking compass alignment and map runes',
      '  Infusing travel potions for steady footing',
      '                       ',
      '             ✦         ',
    ],
    [
      'Preparing expedition supplies...',
      '  Checking compass alignment and map runes',
      '  Whispering wards against roadside ambushes',
      '                       ',
      '               ✦       ',
    ],
  ]
}

function getFallbackTravelAnimation(
  fromLocation: string,
  toLocation: string
): TravelAnimationType {
  return {
    name: 'Default Travel',
    description: `Traveling from ${fromLocation} to ${toLocation}`,
    duration: 800, // Increased from 500ms to 800ms per frame for smoother animation
    frames: [
      [
        `Leaving ${fromLocation}...`,
        '                          ',
        '   o                      ',
        '  /|\\                     ',
        '  / \\                     ',
        '                          ',
      ],
      [
        'Traveling...',
        '                          ',
        '        o                 ',
        '       /|\\                ',
        '       / \\                ',
        '                          ',
      ],
      [
        'Traveling...',
        '                          ',
        '             o            ',
        '            /|\\           ',
        '            / \\           ',
        '                          ',
      ],
      [
        'Almost there...',
        '                          ',
        '                  o       ',
        '                 /|\\      ',
        '                 / \\      ',
        '                          ',
      ],
      [
        `Arriving at ${toLocation}!`,
        '                          ',
        '                      o   ',
        '                     /|\\  ',
        '                     / \\  ',
        '                          ',
      ],
    ],
  }
}

// Location-specific travel animations
export function getLocationSpecificAnimation(
  fromLocation: string,
  toLocation: string
): TravelAnimationType | undefined {
  // This could be expanded to include specific animations for certain location pairs
  const locationPairs: Record<string, TravelAnimationType> = {
    'Market Square->Alchemist Quarter': {
      name: 'Market to Alchemist',
      description:
        'Walking through the busy market to the quiet alchemist quarter',
      duration: 1333, // 3 frames × 1333ms = ~4 seconds total
      frames: [
        [
          'Leaving the bustling market...',
          '                             ',
          '  🏪  o  🏪                  ',
          '     /|\\                     ',
          '     / \\                     ',
        ],
        [
          'Walking through the streets...',
          '                             ',
          '       o                     ',
          '      /|\\                    ',
          '      / \\                    ',
        ],
        [
          'Entering the alchemist quarter...',
          '                               ',
          '  ⚗️   o   ⚗️                  ',
          '      /|\\                      ',
          '      / \\                      ',
        ],
      ],
    },
  }

  const key = `${fromLocation}->${toLocation}`
  return locationPairs[key] || undefined
}

const IMMERSIVE_FRAME_COUNT = 36
const SCENE_WIDTH = 64
const SCENE_HEIGHT = 20
const SKY_HEIGHT = 5
const SKY_START = 0
const HORIZON_ROW = SKY_START + SKY_HEIGHT
const PATH_TOP = HORIZON_ROW + 1
const FOOTER_START = SCENE_HEIGHT - 3

type TravelerStage = {
  readonly maxProgress: number
  readonly frames: AnimationFrame[]
}

const TRAVELER_STAGES: TravelerStage[] = [
  {
    maxProgress: 0.5,
    frames: [
      [
        '     O      ',
        '    /|\\     ',
        '    / \\     ',
        '   /   \\    ',
        '  /     \\   ',
      ],
      [
        '     O      ',
        '    \\|/     ',
        '    / \\     ',
        '   /   \\    ',
        '  /     \\   ',
      ],
    ],
  },
  {
    maxProgress: 0.82,
    frames: [
      ['     o     ', '    /|\\    ', '     |     ', '    / \\    '],
      ['     o     ', '    \\|    ', '     |     ', '    / \\    '],
    ],
  },
  {
    maxProgress: 1,
    frames: [
      ['   o   ', '  /|   ', '   |   '],
      ['   o   ', '   \\|  ', '   |   '],
    ],
  },
]

const STAR_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 6, y: SKY_START },
  { x: 16, y: SKY_START + 1 },
  { x: 28, y: SKY_START + 1 },
  { x: 38, y: SKY_START },
  { x: 48, y: SKY_START + 2 },
  { x: 56, y: SKY_START },
]

const CLOUD_BANDS: Array<{
  rowOffset: number
  speed: number
  pattern: string
}> = [
  { rowOffset: 1, speed: 0.25, pattern: '   ~~~    ~~   ' },
  { rowOffset: 2, speed: 0.18, pattern: ' ~~    ~~~    ' },
]

const DESTINATION_MARKERS = ['✶', '✷', '✸', '✹']

type ImmersiveAnimationOptions = {
  fromLocation: string
  toLocation: string
  baseAnimation: TravelAnimationType
}

type FrameOptions = ImmersiveAnimationOptions & {
  frameIndex: number
  totalFrames: number
}

export function createImmersiveTravelAnimation(
  options: ImmersiveAnimationOptions
): TravelAnimationType {
  const frames: AnimationFrame[] = []

  for (
    let frameIndex = 0;
    frameIndex < IMMERSIVE_FRAME_COUNT;
    frameIndex += 1
  ) {
    frames.push(
      buildImmersiveFrame({
        ...options,
        frameIndex,
        totalFrames: IMMERSIVE_FRAME_COUNT,
      })
    )
  }

  const baseFrameCount =
    options.baseAnimation.frames.length > 0
      ? options.baseAnimation.frames.length
      : 1
  const baseTotalDuration = options.baseAnimation.duration * baseFrameCount
  const totalDuration = Math.max(5200, Math.round(baseTotalDuration * 1.25))
  const perFrameDuration = Math.max(
    90,
    Math.round(totalDuration / IMMERSIVE_FRAME_COUNT)
  )

  return {
    name: `${options.baseAnimation.name} Journey`,
    description: `Journey from ${options.fromLocation} to ${options.toLocation}`,
    duration: perFrameDuration,
    frames,
  }
}

function buildImmersiveFrame(options: FrameOptions): AnimationFrame {
  const { frameIndex, totalFrames, fromLocation, toLocation } = options
  const grid = createEmptyGrid(SCENE_WIDTH, SCENE_HEIGHT)
  const progress = totalFrames <= 1 ? 0 : frameIndex / (totalFrames - 1)

  renderSky(grid, frameIndex, progress)
  renderLandscape(grid, frameIndex)
  renderRoad(grid, frameIndex, progress)
  renderDestinationMarker(grid, toLocation, frameIndex)
  renderTraveler(grid, frameIndex, progress)
  renderFooter(grid, fromLocation, toLocation, progress)

  return grid.map((row) => row.join(''))
}

function renderSky(
  grid: string[][],
  frameIndex: number,
  progress: number
): void {
  for (let offset = 0; offset < SKY_HEIGHT; offset += 1) {
    const fillChar = offset >= SKY_HEIGHT - 2 ? '.' : ' '
    setRow(grid, SKY_START + offset, fillChar.repeat(SCENE_WIDTH))
  }

  for (const band of CLOUD_BANDS) {
    const row = SKY_START + band.rowOffset
    if (row < SKY_START || row >= SKY_START + SKY_HEIGHT) {
      continue
    }

    const travel =
      (frameIndex * band.speed) % (SCENE_WIDTH + band.pattern.length)
    const start = Math.floor(travel) - band.pattern.length
    writeText(grid, band.pattern, start, row)
  }

  if (progress < 0.25 || progress > 0.65) {
    const starGlyph = frameIndex % 2 === 0 ? '✶' : '✷'
    for (const { x, y } of STAR_POSITIONS) {
      setChar(grid, x, y, starGlyph)
    }
  }

  const sunPosition = computeCelestialPosition(progress)
  setChar(grid, sunPosition.x, sunPosition.y, '☼')

  const moonPosition = computeCelestialPosition((progress + 0.5) % 1)
  const moonGlyph = progress > 0.5 ? '☾' : '☽'
  setChar(grid, moonPosition.x, moonPosition.y, moonGlyph)
}

function renderLandscape(grid: string[][], frameIndex: number): void {
  const hillPattern = '`^   ^` '
  const offset = frameIndex % hillPattern.length
  const doubled = hillPattern + hillPattern + hillPattern
  const slice = doubled.slice(offset, offset + SCENE_WIDTH)
  setRow(grid, HORIZON_ROW, slice)

  setRow(grid, HORIZON_ROW + 1, '.'.repeat(SCENE_WIDTH))
}

function renderRoad(
  grid: string[][],
  frameIndex: number,
  progress: number
): void {
  const roadRows = FOOTER_START - PATH_TOP
  const sway = Math.sin(progress * Math.PI * 2) * 4

  for (let rowOffset = 0; rowOffset < roadRows; rowOffset += 1) {
    const currentRow = PATH_TOP + rowOffset
    const depth = roadRows === 0 ? 0 : rowOffset / roadRows
    const center = Math.round(SCENE_WIDTH / 2 + sway * (1 - depth))
    const halfWidth = Math.max(4, Math.round(6 + depth * 14))
    const left = clamp(center - halfWidth, 1, SCENE_WIDTH - 2)
    const right = clamp(center + halfWidth, 1, SCENE_WIDTH - 2)

    setChar(grid, left, currentRow, '/')
    setChar(grid, right, currentRow, '\\')

    for (let column = left + 1; column < right; column += 1) {
      const isGuide = column === center && depth > 0.1
      const glyph = isGuide && (rowOffset + frameIndex) % 3 === 0 ? '|' : '.'
      setChar(grid, column, currentRow, glyph)
    }
  }
}

function renderDestinationMarker(
  grid: string[][],
  toLocation: string,
  frameIndex: number
): void {
  const markerX = SCENE_WIDTH - 6
  const markerY = PATH_TOP + 1
  const pulse =
    DESTINATION_MARKERS.length > 0
      ? (DESTINATION_MARKERS[frameIndex % DESTINATION_MARKERS.length] ?? '*')
      : '*'

  setChar(grid, markerX, markerY - 1, pulse)
  setChar(grid, markerX, markerY, '|')
  setChar(grid, markerX, markerY + 1, '|')
  setChar(grid, markerX, markerY + 2, '|')

  const destinationLabel = shortenLabel(toLocation, 14)
  const labelStart = clamp(
    markerX - Math.floor(destinationLabel.length / 2),
    0,
    SCENE_WIDTH - destinationLabel.length
  )
  writeText(grid, destinationLabel, labelStart, markerY + 3)
}

function renderTraveler(
  grid: string[][],
  frameIndex: number,
  progress: number
): void {
  const stage =
    TRAVELER_STAGES.find((candidate) => progress <= candidate.maxProgress) ??
    TRAVELER_STAGES.at(-1)

  const frames = stage?.frames ?? []
  if (frames.length === 0) {
    return
  }

  const sprite = frames[frameIndex % frames.length]
  if (!sprite) {
    return
  }

  const spriteWidth = Math.max(...sprite.map((line) => line.length))
  const spriteHeight = sprite.length
  const travelerX = Math.round((SCENE_WIDTH - spriteWidth) / 2)
  const maxYOffset = Math.max(0, FOOTER_START - PATH_TOP - spriteHeight)
  const travelerY = PATH_TOP + Math.round((1 - progress) * maxYOffset)

  writeSprite(grid, sprite, travelerX, travelerY)
}

function renderFooter(
  grid: string[][],
  fromLocation: string,
  toLocation: string,
  progress: number
): void {
  const routeText = `Route ${shortenLabel(fromLocation, 16)} -> ${shortenLabel(
    toLocation,
    16
  )}`
  setRow(grid, FOOTER_START, centerWithin(routeText, SCENE_WIDTH))

  const beats = [
    'Setting out with steady steps',
    'Midway markers slip past quietly',
    'Night whispers along the roadside',
    'Lantern glow beckons at the gate',
  ]

  const beatIndex =
    progress < 0.25 ? 0 : progress < 0.5 ? 1 : progress < 0.8 ? 2 : 3
  setRow(
    grid,
    FOOTER_START + 1,
    centerWithin(beats[beatIndex] ?? '', SCENE_WIDTH)
  )

  const travelProgress = `${Math.round(progress * 100)
    .toString()
    .padStart(3, ' ')}% complete`
  setRow(grid, FOOTER_START + 2, centerWithin(travelProgress, SCENE_WIDTH))
}

function computeCelestialPosition(progress: number): { x: number; y: number } {
  const clamped = clamp(progress, 0, 1)
  const x = clamp(
    Math.round(clamped * (SCENE_WIDTH - 5)) + 2,
    1,
    SCENE_WIDTH - 2
  )
  const arc = Math.sin(clamped * Math.PI)
  const y = clamp(
    SKY_START +
      Math.max(0, SKY_HEIGHT - 1 - Math.round(arc * (SKY_HEIGHT - 1))),
    SKY_START,
    SKY_START + SKY_HEIGHT - 1
  )
  return { x, y }
}

function createEmptyGrid(width: number, height: number): string[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ' ')
  )
}

function setRow(grid: string[][], rowIndex: number, content: string): void {
  if (rowIndex < 0 || rowIndex >= grid.length) {
    return
  }

  const row = grid[rowIndex]
  if (!row) {
    return
  }

  const padded =
    content.length < row.length
      ? content.padEnd(row.length, ' ')
      : content.slice(0, row.length)

  for (let column = 0; column < row.length; column += 1) {
    row[column] = padded[column] ?? ' '
  }
}

function setChar(grid: string[][], x: number, y: number, char: string): void {
  if (!char || char === ' ') {
    return
  }

  if (y < 0 || y >= grid.length) {
    return
  }

  const row = grid[y]
  if (!row) {
    return
  }

  if (x < 0 || x >= row.length) {
    return
  }

  row[x] = char
}

function writeText(grid: string[][], text: string, x: number, y: number): void {
  if (y < 0 || y >= grid.length) {
    return
  }

  for (const [index, char] of [...text].entries()) {
    if (char === undefined || char === ' ') {
      continue
    }

    setChar(grid, x + index, y, char)
  }
}

function writeSprite(
  grid: string[][],
  sprite: string[],
  x: number,
  y: number
): void {
  for (const [rowIndex, row] of sprite.entries()) {
    if (!row) {
      continue
    }

    for (const [column, char] of [...row].entries()) {
      if (char === undefined || char === ' ') {
        continue
      }

      setChar(grid, x + column, y + rowIndex, char)
    }
  }
}

function centerWithin(text: string, width: number): string {
  const safeText = shortenLabel(text, width)
  const padding = width - safeText.length
  const left = Math.floor(padding / 2)
  const right = padding - left
  return `${' '.repeat(Math.max(0, left))}${safeText}${' '.repeat(
    Math.max(0, right)
  )}`
}

function shortenLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) {
    return label
  }

  if (maxLength <= 3) {
    return label.slice(0, maxLength)
  }

  return `${label.slice(0, maxLength - 3)}...`
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
