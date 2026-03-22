import { saveDocuments } from "@react-native-documents/picker"

import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { readFileSystemCapability, removeTemporaryFile, writeTemporaryFile } from "@/shared/native/fileSystemStorage"
import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"

export interface DocumentExportAdapter {
  getCapability(): CapabilityDescriptor
  exportFile(input: { filename: string; content: string; mimeType?: string; encoding?: "utf8" | "base64" }): Promise<AdapterResult<void>>
}

export const documentExportAdapter: DocumentExportAdapter = {
  getCapability() {
    return readFileSystemCapability()
  },
  async exportFile(input) {
    const capability = readFileSystemCapability()
    if (!capability.supported) {
      return {
        ok: false,
        error: new NativeCapabilityUnavailableError("document-export", capability.reason),
      }
    }

    let temporaryFileUri = ""

    try {
      temporaryFileUri = await writeTemporaryFile({
        directoryName: "document-exports",
        filename: input.filename,
        mimeType: input.mimeType,
        fallbackBaseName: "export",
        fallbackExtension: "txt",
        content: input.encoding === "base64" ? input.content : input.content,
        encoding: input.encoding === "base64" ? "base64" : "utf8",
      })

      const [result] = await saveDocuments({
        sourceUris: [temporaryFileUri],
        fileName: input.filename,
        mimeType: input.mimeType ?? "application/octet-stream",
      })

      if (result?.error) {
        return {
          ok: false,
          error: createDocumentExportError(result.error),
        }
      }

      return {
        ok: true,
        data: undefined,
      }
    } catch (error) {
      return {
        ok: false,
        error: normalizeDocumentExportError(error),
      }
    } finally {
      if (temporaryFileUri) {
        await removeTemporaryFile(temporaryFileUri).catch(() => undefined)
      }
    }
  },
}

function createDocumentExportError(message: string) {
  return new Error(message || "Export failed.")
}

function normalizeDocumentExportError(error: unknown) {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === "object" && error !== null) {
    const message = Reflect.get(error, "message")
    if (typeof message === "string" && message.trim()) {
      return new Error(message)
    }
  }

  return new Error("Export failed.")
}
