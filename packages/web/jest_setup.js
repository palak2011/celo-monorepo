jest.useFakeTimers()

if (typeof window !== 'object') {
  global.window = global
  global.window.navigator = {}
}
