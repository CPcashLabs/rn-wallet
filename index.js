import "react-native-get-random-values"
import "react-native-gesture-handler"
import { AppRegistry } from "react-native"
import { Buffer } from "buffer"

import App from "./src/app/App"
import { name as appName } from "./app.json"

if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer
}

AppRegistry.registerComponent(appName, () => App)
