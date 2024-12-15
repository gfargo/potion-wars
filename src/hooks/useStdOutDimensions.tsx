import { useStdout } from 'ink'
import { useEffect, useState } from 'react'

// TODO: Investigate if we can memoize this better to avoid unnecessary re-renders.
// When using this previously the screen would flicker excessively, even when the terminal size didn't change.

/**
 * Custom hook that returns the current dimensions of the stdout (terminal) as a tuple [columns, rows].
 * It listens for the 'resize' event on stdout and updates the dimensions accordingly.
 *
 * @returns {[number, number]} A tuple containing the number of columns and rows of the stdout.
 *
 * @example
 * const [columns, rows] = useStdoutDimensions();
 * console.log(`Terminal size: ${columns}x${rows}`);
 */
export function useStdoutDimensions(): [number, number] {
  const { stdout } = useStdout()
  const [dimensions, setDimensions] = useState<[number, number]>([
    stdout.columns,
    stdout.rows,
  ])

  useEffect(() => {
    const handler = () => {
      setDimensions([stdout.columns, stdout.rows])
    }

    stdout.on('resize', handler)
    return () => {
      stdout.off('resize', handler)
    }
  }, [stdout])

  return dimensions
}
