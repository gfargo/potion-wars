import React, { useMemo } from 'react'
import type {
  TravelAnimation as TravelAnimationType,
  AnimationFrame,
  TimeOfDay,
} from '../../../types/animation.types.js'
import type { Weather } from '../../../types/weather.types.js'
import {
  AsciiAnimation,
  type AsciiAnimationControls,
  type RowColorResolver,
} from './AsciiAnimation.js'

type TravelAnimationProperties = {
  readonly fromLocation: string
  readonly toLocation: string
  readonly onComplete: () => void
  readonly autoStart?: boolean
  readonly durationMs?: number
  readonly dangerLevel?: number
  readonly weather?: Weather
  readonly timeOfDay?: TimeOfDay
  readonly speedMultiplier?: number
}

export const TravelAnimation = React.forwardRef<
  AsciiAnimationControls,
  TravelAnimationProperties
>(function TravelAnimation(
  {
    fromLocation,
    toLocation,
    onComplete,
    autoStart = true,
    durationMs,
    dangerLevel,
    weather = 'sunny',
    timeOfDay = 'day',
    speedMultiplier = 1,
  },
  ref
) {
  const scene = useMemo(
    () =>
      createImmersiveTravelAnimation({
        fromLocation,
        toLocation,
        durationMs,
        dangerLevel,
        weather,
        timeOfDay,
      }),
    [fromLocation, toLocation, durationMs, dangerLevel, weather, timeOfDay]
  )

  const effectiveSpeed = useMemo(() => {
    const multiplier = Math.max(0.25, Math.min(4, speedMultiplier))
    return Math.max(MIN_PER_FRAME_MS, Math.round(scene.duration / multiplier))
  }, [scene.duration, speedMultiplier])

  const colorByRow = useMemo(
    () => createRowColorResolver({ weather, timeOfDay }),
    [weather, timeOfDay]
  )

  return (
    <AsciiAnimation
      ref={ref}
      frames={scene.frames}
      speed={effectiveSpeed}
      isLooping={false}
      loopCount={1}
      autoStart={autoStart}
      validateFrames={false}
      onComplete={onComplete}
      colorByRow={colorByRow}
    />
  )
})

// ===========================================================================
// Scene constants
// ===========================================================================

const IMMERSIVE_FRAME_COUNT = 36
const SCENE_WIDTH = 64
const SCENE_HEIGHT = 20
const SKY_HEIGHT = 5
const SKY_START = 0
const HORIZON_ROW = SKY_START + SKY_HEIGHT
const PATH_TOP = HORIZON_ROW + 1
const FOOTER_START = SCENE_HEIGHT - 3
const BIOME_ROW = HORIZON_ROW - 1

const DEFAULT_TOTAL_DURATION_MS = 3500
const MIN_TOTAL_DURATION_MS = 1500
const MAX_TOTAL_DURATION_MS = 9000
const MIN_PER_FRAME_MS = 40

// ===========================================================================
// Sprites and decor
// ===========================================================================

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

/**
 * Per-destination approach silhouettes. Rendered just above the horizon once
 * the traveler is past ~35% of the journey so the destination visibly
 * "comes into view". Patterns are padded/trimmed to SCENE_WIDTH at render.
 */
const BIOME_SILHOUETTES: Record<string, string> = {
  'Royal Castle':
    '      _|_       _|_|_|_       _|_       _|_|_       _|_       ',
  'Enchanted Forest':
    '   Y  ♣  Y   ♠  Y  ♣   Y   ♠  Y   Y  ♣   ♠  Y   ♣  Y   ♠  Y   ',
  "Alchemist's Quarter":
    '     || ~    || ~      || ~   || ~      || ~   || ~   || ~    ',
  "Merchant's District":
    '    [==]    [==]    [===]    [==]    [===]    [==]    [==]    ',
  'Peasant Village':
    '        /\\          /\\           /\\         /\\            /\\   ',
}

// Narrative beats shown at the bottom of the scene. Four slots keyed by
// progress quarter; weather variants override the generic copy.
const DEFAULT_BEATS = [
  'Setting out with steady steps',
  'Midway markers slip past quietly',
  'Night whispers along the roadside',
  'Lantern glow beckons at the gate',
]

const WEATHER_BEATS: Record<Weather, string[] | undefined> = {
  sunny: undefined,
  rainy: [
    'Rain patters on your cloak',
    'Puddles swallow your footfalls',
    'The downpour steadies to a hush',
    'Wet lantern light flickers ahead',
  ],
  stormy: [
    'Thunder grumbles over the hills',
    'Lightning gilds the road briefly',
    'The storm crashes all around you',
    'Shelter looms through the rain',
  ],
  windy: [
    'Wind tugs at your travel cloak',
    'Gusts scatter leaves across the path',
    'The wind howls through the hollows',
    'Calmer air wraps the gate ahead',
  ],
  foggy: [
    'Mist shrouds the road ahead',
    'Grey drifts muffle every sound',
    'Shapes loom half-seen in the fog',
    'Lanterns bloom through the haze',
  ],
}

// ===========================================================================
// Public scene builder
// ===========================================================================

type ImmersiveAnimationOptions = {
  fromLocation: string
  toLocation: string
  durationMs?: number
  dangerLevel?: number
  weather?: Weather
  timeOfDay?: TimeOfDay
  /**
   * Legacy knob kept for the dev preview tool. Only used to derive a default
   * duration when `durationMs` is not supplied.
   */
  baseAnimation?: TravelAnimationType
}

type FrameOptions = {
  fromLocation: string
  toLocation: string
  frameIndex: number
  totalFrames: number
  dangerLevel: number
  weather: Weather
  timeOfDay: TimeOfDay
}

export function createImmersiveTravelAnimation(
  options: ImmersiveAnimationOptions
): TravelAnimationType {
  const weather: Weather = options.weather ?? 'sunny'
  const timeOfDay: TimeOfDay = options.timeOfDay ?? 'day'
  const dangerLevel = clamp(options.dangerLevel ?? 3, 1, 9)

  const frames: AnimationFrame[] = []

  for (
    let frameIndex = 0;
    frameIndex < IMMERSIVE_FRAME_COUNT;
    frameIndex += 1
  ) {
    frames.push(
      buildImmersiveFrame({
        fromLocation: options.fromLocation,
        toLocation: options.toLocation,
        frameIndex,
        totalFrames: IMMERSIVE_FRAME_COUNT,
        dangerLevel,
        weather,
        timeOfDay,
      })
    )
  }

  const totalDuration = resolveTotalDuration(options)
  const perFrameDuration = Math.max(
    MIN_PER_FRAME_MS,
    Math.round(totalDuration / IMMERSIVE_FRAME_COUNT)
  )

  const name = options.baseAnimation
    ? `${options.baseAnimation.name} Journey`
    : 'Travel Journey'

  return {
    name,
    description: `Journey from ${options.fromLocation} to ${options.toLocation}`,
    duration: perFrameDuration,
    frames,
  }
}

function resolveTotalDuration(options: ImmersiveAnimationOptions): number {
  if (typeof options.durationMs === 'number' && options.durationMs > 0) {
    return clamp(
      options.durationMs,
      MIN_TOTAL_DURATION_MS,
      MAX_TOTAL_DURATION_MS
    )
  }

  if (options.baseAnimation) {
    const baseFrameCount =
      options.baseAnimation.frames.length > 0
        ? options.baseAnimation.frames.length
        : 1
    const baseTotal = options.baseAnimation.duration * baseFrameCount
    return clamp(
      Math.round(baseTotal * 1.25),
      MIN_TOTAL_DURATION_MS,
      MAX_TOTAL_DURATION_MS
    )
  }

  return DEFAULT_TOTAL_DURATION_MS
}

// ===========================================================================
// Frame builder
// ===========================================================================

function buildImmersiveFrame(options: FrameOptions): AnimationFrame {
  const {
    frameIndex,
    totalFrames,
    fromLocation,
    toLocation,
    dangerLevel,
    weather,
    timeOfDay,
  } = options
  const grid = createEmptyGrid(SCENE_WIDTH, SCENE_HEIGHT)
  const progress = totalFrames <= 1 ? 0 : frameIndex / (totalFrames - 1)

  renderSky(grid, frameIndex, progress, timeOfDay, weather)
  renderBiomeSilhouette(grid, toLocation, progress)
  renderLandscape(grid, frameIndex)
  renderRoad(grid, frameIndex, progress)
  renderDangerAccents(grid, frameIndex, dangerLevel)
  renderDestinationMarker(grid, toLocation, frameIndex)
  renderTraveler(grid, frameIndex, progress)
  // Weather runs late so rain/fog drifts across anything still empty.
  renderWeatherOverlay(grid, frameIndex, weather)
  renderFooter(grid, fromLocation, toLocation, progress, weather)

  return grid.map((row) => row.join(''))
}

function renderSky(
  grid: string[][],
  frameIndex: number,
  progress: number,
  timeOfDay: TimeOfDay,
  weather: Weather
): void {
  for (let offset = 0; offset < SKY_HEIGHT; offset += 1) {
    const fillChar = offset >= SKY_HEIGHT - 2 ? '.' : ' '
    setRow(grid, SKY_START + offset, fillChar.repeat(SCENE_WIDTH))
  }

  // Clouds: skip for storms — the weather overlay handles that texture.
  if (weather !== 'stormy' && weather !== 'foggy') {
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
  }

  renderCelestials(grid, frameIndex, progress, timeOfDay)
}

function renderCelestials(
  grid: string[][],
  frameIndex: number,
  progress: number,
  timeOfDay: TimeOfDay
): void {
  if (timeOfDay === 'night') {
    const starGlyph = frameIndex % 2 === 0 ? '✶' : '✷'
    for (const { x, y } of STAR_POSITIONS) {
      setChar(grid, x, y, starGlyph)
    }

    const moonPosition = computeCelestialArc(progress)
    setChar(grid, moonPosition.x, moonPosition.y, '☾')
    return
  }

  if (timeOfDay === 'dawn') {
    // Sun low on the left, a couple of stars fading
    for (const [index, { x, y }] of STAR_POSITIONS.entries()) {
      if (index % 3 === 0) {
        setChar(grid, x, y, '·')
      }
    }
    setChar(grid, 6, SKY_HEIGHT - 2, '☼')
    return
  }

  if (timeOfDay === 'dusk') {
    // Sun low on the right, moon rising on the left
    setChar(grid, SCENE_WIDTH - 8, SKY_HEIGHT - 2, '☼')
    setChar(grid, 8, SKY_HEIGHT - 3, '☽')
    return
  }

  // Daytime: sun arcs across as the journey progresses.
  const sunPosition = computeCelestialArc(progress)
  setChar(grid, sunPosition.x, sunPosition.y, '☼')
}

function renderBiomeSilhouette(
  grid: string[][],
  toLocation: string,
  progress: number
): void {
  if (progress < 0.35) {
    return
  }

  const pattern = BIOME_SILHOUETTES[toLocation]
  if (!pattern) {
    return
  }

  for (let x = 0; x < Math.min(pattern.length, SCENE_WIDTH); x += 1) {
    const char = pattern[x]
    if (!char || char === ' ') {
      continue
    }

    setChar(grid, x, BIOME_ROW, char)
  }
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

function renderDangerAccents(
  grid: string[][],
  frameIndex: number,
  dangerLevel: number
): void {
  if (dangerLevel < 5) {
    return
  }

  const glyph = dangerLevel >= 7 ? '░' : ';'
  const everyN = Math.max(2, 6 - dangerLevel) // denser at higher danger

  for (let row = PATH_TOP; row < FOOTER_START; row += 1) {
    if ((row + frameIndex) % everyN !== 0) {
      continue
    }

    const jitter = (frameIndex + row) % 3
    setCharIfEmpty(grid, jitter, row, glyph)
    setCharIfEmpty(grid, SCENE_WIDTH - 1 - jitter, row, glyph)
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

function renderWeatherOverlay(
  grid: string[][],
  frameIndex: number,
  weather: Weather
): void {
  if (weather === 'sunny') {
    return
  }

  if (weather === 'rainy') {
    for (let y = 0; y < FOOTER_START; y += 1) {
      for (let x = (frameIndex + y * 2) % 7; x < SCENE_WIDTH; x += 7) {
        setCharIfEmpty(grid, x, y, '/')
      }
    }

    return
  }

  if (weather === 'stormy') {
    // Denser rain than `rainy`.
    for (let y = 0; y < FOOTER_START; y += 1) {
      for (let x = (frameIndex + y * 2) % 4; x < SCENE_WIDTH; x += 4) {
        setCharIfEmpty(grid, x, y, '/')
      }
    }

    // Lightning strike every 6 frames. The colorByRow resolver lights the
    // sky rows around the same phase so it reads as a flash.
    if (frameIndex % 6 === 0) {
      const baseX = ((frameIndex * 5) % (SCENE_WIDTH - 8)) + 4
      setChar(grid, baseX, 0, '\\')
      setChar(grid, baseX - 1, 1, '/')
      setChar(grid, baseX, 2, '\\')
      setChar(grid, baseX - 1, 3, '/')
    }

    return
  }

  if (weather === 'foggy') {
    for (let x = 0; x < SCENE_WIDTH; x += 1) {
      if ((x + frameIndex) % 3 !== 0) {
        setChar(grid, x, 3, '~')
      }

      if ((x + frameIndex + 1) % 2 === 0) {
        setChar(grid, x, 4, '~')
      }
    }

    return
  }

  if (weather === 'windy') {
    // Wind streaks across the landscape / lower sky.
    for (let x = (frameIndex * 3) % 10; x < SCENE_WIDTH; x += 10) {
      setCharIfEmpty(grid, x, SKY_HEIGHT - 2, '~')
      setCharIfEmpty(grid, x + 2, SKY_HEIGHT - 1, '~')
    }
  }
}

function renderFooter(
  grid: string[][],
  fromLocation: string,
  toLocation: string,
  progress: number,
  weather: Weather
): void {
  const routeText = `Route ${shortenLabel(fromLocation, 16)} -> ${shortenLabel(
    toLocation,
    16
  )}`
  setRow(grid, FOOTER_START, centerWithin(routeText, SCENE_WIDTH))

  const beats = WEATHER_BEATS[weather] ?? DEFAULT_BEATS
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

// ===========================================================================
// Row color resolver
// ===========================================================================

type ColorResolverOptions = {
  weather: Weather
  timeOfDay: TimeOfDay
}

function createRowColorResolver(
  options: ColorResolverOptions
): RowColorResolver {
  return (rowIndex: number, _row: string, frameIndex: number) => {
    // Footer is always readable — don't let weather drown it out.
    if (rowIndex === FOOTER_START) return 'yellow'
    if (rowIndex === FOOTER_START + 1) return 'gray'
    if (rowIndex === FOOTER_START + 2) return 'cyan'

    // Road
    if (rowIndex >= PATH_TOP && rowIndex < FOOTER_START) return 'gray'

    // Horizon and stipple
    if (rowIndex === HORIZON_ROW) return 'green'
    if (rowIndex === HORIZON_ROW + 1) return 'greenBright'

    // Biome silhouette row
    if (rowIndex === BIOME_ROW) {
      if (options.timeOfDay === 'night') return 'blueBright'
      if (options.timeOfDay === 'dusk') return 'magenta'
      return 'white'
    }

    // Sky — modulated by weather, then time-of-day, with a lightning flash
    // during stormy weather for extra drama.
    if (rowIndex < BIOME_ROW) {
      if (options.weather === 'stormy') {
        if (frameIndex % 6 === 0) return 'whiteBright'
        return 'gray'
      }

      if (options.weather === 'foggy') return 'gray'
      if (options.weather === 'rainy') return 'blue'

      switch (options.timeOfDay) {
        case 'dawn':
          return 'yellow'
        case 'dusk':
          return 'magenta'
        case 'night':
          return 'blueBright'
        default:
          return 'cyan'
      }
    }

    return undefined
  }
}

// ===========================================================================
// Low-level helpers
// ===========================================================================

function computeCelestialArc(progress: number): { x: number; y: number } {
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

function setCharIfEmpty(
  grid: string[][],
  x: number,
  y: number,
  char: string
): void {
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

  const existing = row[x]
  if (existing === ' ' || existing === '.') {
    row[x] = char
  }
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
