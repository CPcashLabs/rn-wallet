const mockSaveDocuments = jest.fn()
const mockReadFileSystemCapability = jest.fn()
const mockWriteTemporaryFile = jest.fn()
const mockRemoveTemporaryFile = jest.fn()

jest.mock("@react-native-documents/picker", () => ({
  saveDocuments: (...args: unknown[]) => mockSaveDocuments(...args),
}))

jest.mock("@/shared/native/fileSystemStorage", () => ({
  readFileSystemCapability: (...args: unknown[]) => mockReadFileSystemCapability(...args),
  writeTemporaryFile: (...args: unknown[]) => mockWriteTemporaryFile(...args),
  removeTemporaryFile: (...args: unknown[]) => mockRemoveTemporaryFile(...args),
}))

import { documentExportAdapter } from "@/shared/native/documentExportAdapter"

describe("documentExportAdapter", () => {
  beforeEach(() => {
    mockSaveDocuments.mockReset()
    mockReadFileSystemCapability.mockReset()
    mockWriteTemporaryFile.mockReset()
    mockRemoveTemporaryFile.mockReset()
    mockReadFileSystemCapability.mockReturnValue({ supported: true })
    mockWriteTemporaryFile.mockResolvedValue("file:///tmp/export.csv")
    mockRemoveTemporaryFile.mockResolvedValue(undefined)
  })

  it("returns unavailable results when exporting is unsupported", async () => {
    mockReadFileSystemCapability.mockReturnValue({
      supported: false,
      reason: "Unavailable",
    })

    await expect(
      documentExportAdapter.exportFile({
        filename: "export.csv",
        content: "a,b",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        name: "NativeCapabilityUnavailableError",
        message: "Unavailable",
      },
    })
  })

  it("writes a temporary file and exports through the save dialog", async () => {
    mockSaveDocuments.mockResolvedValue([{
      uri: "content://saved/export.csv",
      name: "export.csv",
      error: null,
    }])

    await expect(
      documentExportAdapter.exportFile({
        filename: "export.csv",
        content: "a,b",
        mimeType: "text/csv",
      }),
    ).resolves.toEqual({
      ok: true,
      data: undefined,
    })

    expect(mockWriteTemporaryFile).toHaveBeenCalledWith({
      directoryName: "document-exports",
      filename: "export.csv",
      mimeType: "text/csv",
      fallbackBaseName: "export",
      fallbackExtension: "txt",
      content: "a,b",
      encoding: "utf8",
    })
    expect(mockSaveDocuments).toHaveBeenCalledWith({
      sourceUris: ["file:///tmp/export.csv"],
      fileName: "export.csv",
      mimeType: "text/csv",
    })
    expect(mockRemoveTemporaryFile).toHaveBeenCalledWith("file:///tmp/export.csv")
  })

  it("surfaces save dialog errors", async () => {
    mockSaveDocuments.mockResolvedValue([{
      uri: "content://saved/export.csv",
      name: "export.csv",
      error: "Disk full",
    }])

    await expect(
      documentExportAdapter.exportFile({
        filename: "export.csv",
        content: "a,b",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Disk full",
      },
    })
  })
})
