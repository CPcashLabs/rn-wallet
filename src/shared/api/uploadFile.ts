import { UnsafeUploadFileError } from "@/shared/errors"

const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/
const CONTROL_CHAR_REPLACE_PATTERN = /[\u0000-\u001f\u007f]/g
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/webp",
])
const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
}
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}
const TRUSTED_FILE_URI_PATH_PATTERNS = [/\/tmp\//i, /\/cache\//i, /\/caches\//i]
const DEFAULT_IMAGE_MIME_TYPE = "image/jpeg"
const DEFAULT_IMAGE_BASENAME = "image"

export type UploadableImage = {
  uri: string
  name?: string
  mimeType?: string
}

type UploadFormDataFile = Extract<FormDataValue, { uri: string }>

export function buildImageUploadFormDataPart(image: UploadableImage, fallbackName: string): UploadFormDataFile {
  const uri = sanitizeUploadUri(image.uri)
  const mimeType = resolveImageMimeType(image.mimeType, image.name, uri)
  const name = sanitizeUploadFilename(image.name, fallbackName, mimeType)

  return {
    uri,
    name,
    type: mimeType,
  }
}

function sanitizeUploadUri(uri: string) {
  const normalized = typeof uri === "string" ? uri.trim() : ""
  if (!normalized || CONTROL_CHAR_PATTERN.test(normalized)) {
    throw new UnsafeUploadFileError("Invalid upload file URI.")
  }

  const lowerCased = normalized.toLowerCase()
  if (lowerCased.startsWith("file:///") && isTrustedLocalFileUri(normalized)) {
    return normalized
  }

  throw new UnsafeUploadFileError("Untrusted upload file URI.")
}

function isTrustedLocalFileUri(uri: string) {
  const pathname = decodeFileUriPath(uri)
  if (!pathname) {
    return false
  }

  return TRUSTED_FILE_URI_PATH_PATTERNS.some(pattern => pattern.test(pathname))
}

function decodeFileUriPath(uri: string) {
  const withoutFragment = uri.split("#", 1)[0] ?? uri
  const withoutQuery = withoutFragment.split("?", 1)[0] ?? withoutFragment
  const encodedPath = withoutQuery.slice("file://".length)
  if (!encodedPath.startsWith("/")) {
    return ""
  }

  try {
    return decodeURIComponent(encodedPath).replace(/\\/g, "/")
  } catch {
    return encodedPath.replace(/\\/g, "/")
  }
}

function resolveImageMimeType(mimeType: string | undefined, name: string | undefined, uri: string) {
  const normalizedMimeType = normalizeMimeType(mimeType)
  if (normalizedMimeType) {
    return normalizedMimeType
  }

  const inferredMimeType = inferMimeTypeFromValue(name) || inferMimeTypeFromValue(uri)
  if (inferredMimeType) {
    return inferredMimeType
  }

  return DEFAULT_IMAGE_MIME_TYPE
}

function normalizeMimeType(value: string | undefined) {
  if (typeof value !== "string") {
    return ""
  }

  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return ""
  }

  const canonical = normalized === "image/jpg" ? "image/jpeg" : normalized
  if (ALLOWED_IMAGE_MIME_TYPES.has(canonical)) {
    return canonical
  }

  throw new UnsafeUploadFileError("Unsupported upload image type.")
}

function inferMimeTypeFromValue(value: string | undefined) {
  const extension = readFileExtension(value)
  if (!extension) {
    return ""
  }

  const mimeType = MIME_TYPE_BY_EXTENSION[extension]
  if (!mimeType) {
    throw new UnsafeUploadFileError("Unsupported upload image extension.")
  }

  return mimeType
}

function sanitizeUploadFilename(name: string | undefined, fallbackName: string, mimeType: string) {
  const preferredExtension = EXTENSION_BY_MIME_TYPE[mimeType] ?? EXTENSION_BY_MIME_TYPE[DEFAULT_IMAGE_MIME_TYPE]
  const fallbackBaseName = readSanitizedBaseName(fallbackName) || DEFAULT_IMAGE_BASENAME
  const candidateBaseName = readSanitizedBaseName(name) || fallbackBaseName
  const limitedBaseName = candidateBaseName.slice(0, 80) || DEFAULT_IMAGE_BASENAME

  return `${limitedBaseName}.${preferredExtension}`
}

function readSanitizedBaseName(value: string | undefined) {
  const basename = readBasename(value)
  if (!basename) {
    return ""
  }

  const withoutExtension = basename.replace(/\.[^.]*$/, "")
  return withoutExtension
    .replace(CONTROL_CHAR_REPLACE_PATTERN, "_")
    .replace(/[\\/]/g, "_")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._-]+/, "")
    .replace(/[._-]+$/, "")
}

function readBasename(value: string | undefined) {
  if (typeof value !== "string") {
    return ""
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return ""
  }

  const normalized = trimmed.split("#", 1)[0]?.split("?", 1)[0] ?? trimmed
  const segments = normalized.split(/[\\/]/)
  return segments[segments.length - 1]?.trim() ?? ""
}

function readFileExtension(value: string | undefined) {
  const basename = readBasename(value)
  const match = /\.([A-Za-z0-9]+)$/.exec(basename)

  return match?.[1]?.toLowerCase() ?? ""
}
