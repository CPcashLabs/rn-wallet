const mockManipulateAsync = jest.fn()

jest.mock("expo-image-manipulator", () => ({
  FlipType: {
    Horizontal: "horizontal",
    Vertical: "vertical",
  },
  SaveFormat: {
    JPEG: "jpeg",
    PNG: "png",
  },
  manipulateAsync: (...args: unknown[]) => mockManipulateAsync(...args),
}))

import { imageCropAdapter } from "@/shared/native/imageCropAdapter"

describe("imageCropAdapter", () => {
  beforeEach(() => {
    mockManipulateAsync.mockReset()
  })

  it("applies crop transformations and returns a cropped asset", async () => {
    mockManipulateAsync.mockResolvedValue({
      uri: "file:///tmp/avatar-cropped.jpg",
      width: 200,
      height: 200,
    })

    await expect(
      imageCropAdapter.cropImage({
        source: {
          uri: "file:///tmp/source.jpg",
          width: 800,
          height: 600,
        },
        transform: {
          crop: {
            originX: 10,
            originY: 20,
            width: 300,
            height: 300,
          },
          context: {
            rotationAngle: 90,
            flipHorizontal: true,
            flipVertical: true,
          },
          resize: {
            width: 400,
            height: 400,
          },
        },
        format: "jpeg",
        filename: "avatar.jpg",
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        uri: "file:///tmp/avatar-cropped.jpg",
        name: "avatar.jpg",
        mimeType: "image/jpeg",
        width: 200,
        height: 200,
      },
    })

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      "file:///tmp/source.jpg",
      [
        { flip: "horizontal" },
        { flip: "vertical" },
        { rotate: 90 },
        { resize: { width: 400, height: 400 } },
        { crop: { originX: 10, originY: 20, width: 300, height: 300 } },
      ],
      {
        compress: 0.9,
        format: "jpeg",
      },
    )
  })

  it("normalizes manipulation failures", async () => {
    mockManipulateAsync.mockRejectedValue("failed")

    await expect(
      imageCropAdapter.cropImage({
        source: {
          uri: "file:///tmp/source.jpg",
          width: 800,
          height: 600,
        },
        transform: {
          crop: {
            originX: 0,
            originY: 0,
            width: 100,
            height: 100,
          },
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Image cropping failed.",
      },
    })
  })
})
