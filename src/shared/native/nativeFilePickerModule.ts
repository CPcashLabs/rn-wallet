import { NativeModules, Platform } from "react-native"

import { NativeCapabilityUnavailableError } from "@/shared/errors"

export type NativePickedImage = {
  uri: string
  name?: string
  mimeType?: string
}

export type NativeCachedRemoteImage = {
  localUri: string
}

type NativeFilePickerConstants = {
  isSupported?: boolean
  reason?: string
}

type NativeFilePickerModuleShape = NativeFilePickerConstants & {
  pickImage(): Promise<NativePickedImage>
  saveImage(filename: string, base64: string): Promise<void>
  exportFile(filename: string, base64: string, mimeType: string): Promise<void>
  cacheRemoteImage?(accountKey: string, remoteUrl: string): Promise<NativeCachedRemoteImage>
  removeCachedImage?(localUri: string): Promise<void>
}

const nativeFilePickerModule = NativeModules.CPCashFilePicker as NativeFilePickerModuleShape | undefined

export function readNativeFilePickerCapability() {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return {
      supported: false,
      reason: "File picking is only available on iOS and Android.",
    }
  }

  if (!nativeFilePickerModule) {
    return {
      supported: false,
      reason: "File picker native module is not installed.",
    }
  }

  if (nativeFilePickerModule.isSupported === false) {
    return {
      supported: false,
      reason: nativeFilePickerModule.reason ?? "File picker is not supported on this device.",
    }
  }

  if (typeof nativeFilePickerModule.reason === "string" && nativeFilePickerModule.reason.trim()) {
    return {
      supported: false,
      reason: nativeFilePickerModule.reason,
    }
  }

  return {
    supported: true,
  }
}

function requireNativeFilePickerModule() {
  if (!nativeFilePickerModule) {
    throw new NativeCapabilityUnavailableError("file", "File picker native module is not installed.")
  }

  return nativeFilePickerModule
}

export async function pickNativeImage() {
  return requireNativeFilePickerModule().pickImage()
}

export async function saveNativeImage(filename: string, base64: string) {
  return requireNativeFilePickerModule().saveImage(filename, base64)
}

export async function exportNativeFile(filename: string, base64: string, mimeType = "application/octet-stream") {
  return requireNativeFilePickerModule().exportFile(filename, base64, mimeType)
}

export function supportsNativeRemoteImageCache() {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return false
  }

  return typeof nativeFilePickerModule?.cacheRemoteImage === "function" && typeof nativeFilePickerModule?.removeCachedImage === "function"
}

export async function cacheNativeRemoteImage(accountKey: string, remoteUrl: string) {
  const module = requireNativeFilePickerModule()
  if (typeof module.cacheRemoteImage !== "function") {
    throw new NativeCapabilityUnavailableError("avatar-cache", "Native avatar file cache is not installed.")
  }

  return module.cacheRemoteImage(accountKey, remoteUrl)
}

export async function removeNativeCachedImage(localUri: string) {
  const module = requireNativeFilePickerModule()
  if (typeof module.removeCachedImage !== "function") {
    throw new NativeCapabilityUnavailableError("avatar-cache", "Native avatar file cache is not installed.")
  }

  return module.removeCachedImage(localUri)
}
