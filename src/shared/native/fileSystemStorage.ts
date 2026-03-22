import * as FileSystem from "expo-file-system/legacy"
import { Platform } from "react-native"

type TempFileEncoding = "utf8" | "base64"

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
  "text/csv": "csv",
  "text/plain": "txt",
  "application/json": "json",
}

function normalizeFilenameComponent(value: string | undefined, fallback: string) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")

  return (normalized || fallback).slice(0, 80)
}

function normalizeExtension(value: string | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/^\.+/, "")
    .toLowerCase()
}

function inferExtension(filename?: string, mimeType?: string, fallback = "bin") {
  const filenameExtension = normalizeExtension(filename?.split("?")[0]?.split("#")[0]?.split(".").pop())
  if (filenameExtension) {
    return filenameExtension
  }

  const normalizedMimeType = String(mimeType ?? "").trim().toLowerCase()
  return MIME_EXTENSION_MAP[normalizedMimeType] ?? fallback
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10)
}

export function readFileSystemCapability() {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return {
      supported: false,
      reason: "File access is only available on iOS and Android.",
    }
  }

  if (!FileSystem.cacheDirectory) {
    return {
      supported: false,
      reason: "App cache directory is unavailable.",
    }
  }

  return {
    supported: true,
  }
}

export function buildTemporaryFilename(input: {
  filename?: string
  mimeType?: string
  fallbackBaseName: string
  fallbackExtension?: string
}) {
  const extension = inferExtension(input.filename, input.mimeType, input.fallbackExtension ?? "bin")
  const baseName = normalizeFilenameComponent(input.filename, input.fallbackBaseName)
  return `${baseName}-${Date.now()}-${randomSuffix()}.${extension}`
}

async function ensureDirectory(directoryName: string) {
  const baseDirectory = FileSystem.cacheDirectory
  if (!baseDirectory) {
    throw new Error("App cache directory is unavailable.")
  }

  const directoryUri = `${baseDirectory}${directoryName}/`
  await FileSystem.makeDirectoryAsync(directoryUri, { intermediates: true })
  return directoryUri
}

export async function writeTemporaryFile(input: {
  directoryName: string
  filename?: string
  mimeType?: string
  fallbackBaseName: string
  fallbackExtension?: string
  content: string
  encoding: TempFileEncoding
}) {
  const directoryUri = await ensureDirectory(input.directoryName)
  const fileUri = `${directoryUri}${buildTemporaryFilename({
    filename: input.filename,
    mimeType: input.mimeType,
    fallbackBaseName: input.fallbackBaseName,
    fallbackExtension: input.fallbackExtension,
  })}`

  await FileSystem.writeAsStringAsync(fileUri, input.content, {
    encoding: input.encoding,
  })

  return fileUri
}

export async function copyToTemporaryFile(input: {
  sourceUri: string
  directoryName: string
  filename?: string
  mimeType?: string
  fallbackBaseName: string
  fallbackExtension?: string
}) {
  const directoryUri = await ensureDirectory(input.directoryName)
  const fileUri = `${directoryUri}${buildTemporaryFilename({
    filename: input.filename,
    mimeType: input.mimeType,
    fallbackBaseName: input.fallbackBaseName,
    fallbackExtension: input.fallbackExtension,
  })}`

  await FileSystem.copyAsync({
    from: input.sourceUri,
    to: fileUri,
  })

  return fileUri
}

export async function removeTemporaryFile(uri: string) {
  if (!uri.startsWith("file://")) {
    return
  }

  await FileSystem.deleteAsync(uri, { idempotent: true })
}

export function ensureFileUri(uri: string) {
  if (!uri) {
    return uri
  }

  if (uri.startsWith("file://")) {
    return uri
  }

  if (uri.startsWith("/")) {
    return `file://${uri}`
  }

  return uri
}

export function resolveMimeTypeFromFilename(filename?: string, fallback = "application/octet-stream") {
  const extension = normalizeExtension(filename?.split("?")[0]?.split("#")[0]?.split(".").pop())
  const entry = Object.entries(MIME_EXTENSION_MAP).find(([, value]) => value === extension)
  return entry?.[0] ?? fallback
}
