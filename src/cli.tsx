#!/usr/bin/env node
import { render } from 'ink'
import React from 'react'
import App from './app.js'

const instance = render(<App />)

// Wait for the app to exit and then terminate the process
instance.waitUntilExit().then(() => {
  process.exit(0)
})
