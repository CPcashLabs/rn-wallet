require("react-native-gesture-handler/jestSetup")

global.__reanimatedWorkletInit = () => {}

jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock")

  Reanimated.default.call = () => {}
  Reanimated.useFrameCallback = () => {}

  return Reanimated
})

jest.mock("@shopify/react-native-skia", () => {
  const React = require("react")
  const { View } = require("react-native")

  const MockView = ({ children, ...props }) => React.createElement(View, props, children)
  const makePath = () => ({
    moveTo() {},
    cubicTo() {},
    reset() {},
    addPath() {},
  })

  return {
    Canvas: MockView,
    Group: MockView,
    Path: MockView,
    Circle: MockView,
    BlurMask: MockView,
    RadialGradient: MockView,
    LinearGradient: MockView,
    vec: (x, y) => ({ x, y }),
    Skia: {
      Path: {
        Make: makePath,
      },
    },
    useClock: () => ({ value: 0 }),
    usePathValue: callback => {
      const path = makePath()
      callback(path)
      return { value: path }
    },
  }
})
