// eslint-disable-next-line  ava/use-test
import { type ExecutionContext } from 'ava'
import { type render } from 'ink-testing-library'

/**
 * Helper for testing screen transitions
 */
export const waitForContent = async (
  rendered: ReturnType<typeof render>,
  expectedContent: string,
  timeout = 1000
): Promise<boolean> => {
  const start = Date.now()
  const checkContent = async (): Promise<boolean> => {
    if (rendered.lastFrame()?.includes(expectedContent)) {
      return true
    }

    if (Date.now() - start >= timeout) {
      return false
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 50)
    })

    return checkContent()
  }

  return checkContent()
}

/**
 * Helper for common UI test scenarios
 */
export const screenInteractions = {
  /**
   * Assert menu items are present
   */
  assertMenuItems(
    t: ExecutionContext,
    rendered: ReturnType<typeof render>,
    items: string[]
  ) {
    const frame = rendered.lastFrame()
    return items.every((item) => {
      if (!frame?.includes(item)) {
        console.log('frame /  item', { frame, item })
        console.log('includes', frame?.includes(item))
      }

      return t.true(frame?.includes(item))
    })
  },

  /**
   * Assert screen content
   */
  assertScreenContent(
    t: ExecutionContext,
    rendered: ReturnType<typeof render>,
    content: string
  ) {
    t.true(rendered.lastFrame()?.includes(content))
  },
}
