import { buildImageUploadFormDataPart } from "@/shared/api/uploadFile"
import { UnsafeUploadFileError } from "@/shared/errors"

describe("buildImageUploadFormDataPart", () => {
  it("accepts picker-backed content URIs and normalizes filenames", () => {
    expect(
      buildImageUploadFormDataPart(
        {
          uri: "content://media/external/images/media/42",
          name: "../../avatar profile.png",
          mimeType: "image/png",
        },
        "avatar.jpg",
      ),
    ).toEqual({
      uri: "content://media/external/images/media/42",
      name: "avatar_profile.png",
      type: "image/png",
    })
  })

  it("accepts app temp file URIs and keeps supported image types", () => {
    expect(
      buildImageUploadFormDataPart(
        {
          uri: "file:///private/var/mobile/Containers/Data/Application/demo/tmp/12345",
          name: "picked.heic",
          mimeType: "image/heic",
        },
        "avatar.jpg",
      ),
    ).toEqual({
      uri: "file:///private/var/mobile/Containers/Data/Application/demo/tmp/12345",
      name: "picked.heic",
      type: "image/heic",
    })
  })

  it("rejects remote URIs", () => {
    expect(() =>
      buildImageUploadFormDataPart(
        {
          uri: "https://example.com/evil.jpg",
          name: "evil.jpg",
          mimeType: "image/jpeg",
        },
        "avatar.jpg",
      ),
    ).toThrow(UnsafeUploadFileError)
  })

  it("rejects file URIs outside temp or cache directories", () => {
    expect(() =>
      buildImageUploadFormDataPart(
        {
          uri: "file:///etc/passwd",
          name: "passwd.jpg",
          mimeType: "image/jpeg",
        },
        "avatar.jpg",
      ),
    ).toThrow(UnsafeUploadFileError)
  })

  it("rejects unsupported image mime types", () => {
    expect(() =>
      buildImageUploadFormDataPart(
        {
          uri: "content://media/external/images/media/42",
          name: "vector.svg",
          mimeType: "image/svg+xml",
        },
        "avatar.jpg",
      ),
    ).toThrow(UnsafeUploadFileError)
  })
})
