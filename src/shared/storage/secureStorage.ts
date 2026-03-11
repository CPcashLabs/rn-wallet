import * as Keychain from "react-native-keychain"

export async function setSecureItem(key: string, value: string) {
  await Keychain.setGenericPassword(key, value, { service: key })
}

export async function getSecureItem(key: string) {
  const credentials = await Keychain.getGenericPassword({ service: key })

  if (!credentials) {
    return null
  }

  return credentials.password
}

export async function removeSecureItem(key: string) {
  await Keychain.resetGenericPassword({ service: key })
}

