import test from 'ava'
import { render } from 'ink-testing-library'
import React from 'react'
import App from '../app.js'

test('basic snapshot test on last frame rendered', (t) => {
  const { lastFrame } = render(<App />)
  const appLastFrame = lastFrame()

  t.snapshot(appLastFrame)
  t.true(appLastFrame && appLastFrame?.length > 0)
})
