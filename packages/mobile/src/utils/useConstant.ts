/**
 * A simple hook to create a constant value that lives for
 * the lifetime of the component.
 *
 * Plagiarized from https://github.com/Andarist/use-constant
 */
import * as React from 'react'

interface ResultBox<T> {
  v: T
}

export default function useConstant<T>(fn: () => T): T {
  const ref = React.useRef<ResultBox<T>>()

  if (!ref.current) {
    ref.current = { v: fn() }
  }

  return ref.current.v
}
