import { buildImageUploadFormDataPart } from "@/shared/api/uploadFile"
import { UnsafeUploadFileError } from "@/shared/errors"

describe("buildImageUploadFormDataPart", () => {
  it("accepts app-owned cache file URIs and normalizes filenames", () => {
    expect(
      buildImageUploadFormDataPart(
        {
          uri: "file:///data/user/0/com.cpcashrn/cache/picked-images/picked-123-avatar-profile.png",
          name: "../../avatar profile.png",
          mimeType: "image/png",
        },
        "avatar.jpg",
      ),
    ).toEqual({
      uri: "file:///data/user/0/com.cpcashrn/cache/picked-images/picked-123-avatar-profile.png",
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

  it("rejects external content URIs now that the native picker copies into app cache", () => {
    expect(() =>
      buildImageUploadFormDataPart(
        {
          uri: "content://media/external/images/media/42",
          name: "avatar.png",
          mimeType: "image/png",
        },
        "avatar.jpg",
      ),
    ).toThrow(UnsafeUploadFileError)
  })

  it("rejects non-string upload uris before any path normalization", () => {
    expect(() =>
      buildImageUploadFormDataPart(
        {
          uri: 42 as never,
          name: "avatar.png",
          mimeType: "image/png",
        },
        "avatar.jpg",
      ),
    ).toThrow(new UnsafeUploadFileError("Invalid upload file URI."))
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
          uri: "file:///data/user/0/com.cpcashrn/cache/picked-images/picked-42-vector.svg",
          name: "vector.svg",
          mimeType: "image/svg+xml",
        },
        "avatar.jpg",
      ),
    ).toThrow(UnsafeUploadFileError)
  })

  it("infers image types from filenames and sanitizes fallback names", () => {
    expect(
      buildImageUploadFormDataPart(
        {
          uri: "file:///private/var/mobile/Containers/Data/Application/demo/tmp/camera-roll/photo.webp",
          name: "../Profile Picture",
        },
        "  avatar backup  ",
      ),
    ).toEqual({
      uri: "file:///private/var/mobile/Containers/Data/Application/demo/tmp/camera-roll/photo.webp",
      name: "Profile_Picture.webp",
      type: "image/webp",
    })
  })

  it("normalizes image/jpg and uses the fallback basename when the original name is blank", () => {
    expect(
      buildImageUploadFormDataPart(
        {
          uri: "file:///private/var/mobile/Containers/Data/Application/demo/tmp/camera-roll/photo.jpg#preview",
          name: "   ",
          mimeType: "image/jpg",
        },
        "cover draft",
      ),
    ).toEqual({
      uri: "file:///private/var/mobile/Containers/Data/Application/demo/tmp/camera-roll/photo.jpg#preview",
      name: "cover_draft.jpg",
      type: "image/jpeg",
    })
  })

  it("falls back to jpeg names when mime type and extension are missing", () => {
    expect(
      buildImageUploadFormDataPart(
        {
          uri: "file:///private/var/mobile/Containers/Data/Application/demo/tmp/12345",
          name: "  ../../  ",
        },
        "___",
      ),
    ).toEqual({
      uri: "file:///private/var/mobile/Containers/Data/Application/demo/tmp/12345",
      name: "image.jpg",
      type: "image/jpeg",
    })
  })

  it("rejects unsupported extensions and control-character uris", () => {
    expect(() =>
      buildImageUploadFormDataPart(
        {
          uri: "file:///data/user/0/com.cpcashrn/cache/picked-images/photo.bmp",
          name: "photo.bmp",
        },
        "avatar.jpg",
      ),
    ).toThrow(UnsafeUploadFileError)

    expect(() =>
      buildImageUploadFormDataPart(
        {
          uri: "file:///data/user/0/com.cpcashrn/cache/picked-images/\u0000evil.png",
          name: "evil.png",
        },
        "avatar.jpg",
      ),
    ).toThrow(UnsafeUploadFileError)
  })

  it("accepts malformed-escape cache uris by falling back to the raw decoded path", () => {
    expect(
      buildImageUploadFormDataPart(
        {
          uri: "file:///private/var/mobile/Containers/Data/Application/demo/tmp/%E0%A4%A.jpg",
          name: "camera.jpg",
          mimeType: "   ",
        },
        "avatar.jpg",
      ),
    ).toEqual({
      uri: "file:///private/var/mobile/Containers/Data/Application/demo/tmp/%E0%A4%A.jpg",
      name: "camera.jpg",
      type: "image/jpeg",
    })
  })

  it("rejects file uris without absolute paths", () => {
    expect(() =>
      buildImageUploadFormDataPart(
        {
          uri: "file:///relative/path.jpg",
          name: "   ",
        },
        "avatar.jpg",
      ),
    ).toThrow(UnsafeUploadFileError)
  })

  it("uses the fallback name when the original file name is missing", () => {
    expect(
      buildImageUploadFormDataPart(
        {
          uri: "file:///private/var/mobile/Containers/Data/Application/demo/tmp/fallback-image",
          mimeType: "image/png",
        },
        "fallback-avatar",
      ),
    ).toEqual({
      uri: "file:///private/var/mobile/Containers/Data/Application/demo/tmp/fallback-image",
      name: "fallback-avatar.png",
      type: "image/png",
    })
  })
})
