package com.cpcashrn.passkey

import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.util.Base64
import android.webkit.MimeTypeMap
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import com.google.mlkit.vision.common.InputImage
import java.io.File
import java.util.Locale
import java.util.UUID

class CPCashFilePickerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var pendingPromise: Promise? = null
  private var pendingImageScanPromise: Promise? = null
  private var pendingCameraScanPromise: Promise? = null
  private var pendingExportPromise: Promise? = null
  private var pendingExportBytes: ByteArray? = null

  private val activityEventListener: ActivityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
      if (requestCode == REQUEST_CODE_EXPORT_FILE) {
        val promise = pendingExportPromise.also { pendingExportPromise = null }
        val bytes = pendingExportBytes.also { pendingExportBytes = null }

        if (promise == null || bytes == null) {
          return
        }

        if (resultCode != Activity.RESULT_OK) {
          promise.reject("cancelled", "User cancelled file export.")
          return
        }

        val uri = data?.data
        if (uri == null) {
          promise.reject("empty_result", "No export destination was selected.")
          return
        }

        try {
          reactContext.contentResolver.openOutputStream(uri, "w")?.use { output ->
            output.write(bytes)
            output.flush()
          } ?: run {
            promise.reject("export_failed", "Failed to open the selected export destination.")
            return
          }

          promise.resolve(null)
        } catch (error: Exception) {
          promise.reject("export_failed", error.message, error)
        }

        return
      }

      if (requestCode != REQUEST_CODE_PICK_IMAGE && requestCode != REQUEST_CODE_SCAN_IMAGE) {
        return
      }

      val promise = when (requestCode) {
        REQUEST_CODE_PICK_IMAGE -> pendingPromise.also { pendingPromise = null }
        REQUEST_CODE_SCAN_IMAGE -> pendingImageScanPromise.also { pendingImageScanPromise = null }
        else -> null
      }

      if (promise == null) {
        return
      }

      if (resultCode != Activity.RESULT_OK) {
        promise.reject("cancelled", "User cancelled image selection.")
        return
      }

      val uri = data?.data
      if (uri == null) {
        promise.reject("empty_result", "No image was selected.")
        return
      }

      if (requestCode == REQUEST_CODE_SCAN_IMAGE) {
        processScannedImage(uri, promise)
        return
      }

      val result = try {
        copyPickedImageToCache(uri)
      } catch (error: Exception) {
        promise.reject("persist_error", error.message ?: "Failed to persist selected image.", error)
        return
      }

      promise.resolve(result)
    }
  }

  init {
    reactContext.addActivityEventListener(activityEventListener)
  }

  override fun getName(): String = "CPCashFilePicker"

  override fun getConstants(): MutableMap<String, Any> {
    val imagePickerSupported = createPickImageIntent().resolveActivity(reactContext.packageManager) != null
    val cameraScannerSupported = isGoogleScannerAvailable()
    val scannerReason = when {
      !cameraScannerSupported && !imagePickerSupported -> "QR scanning is not supported on this device."
      !cameraScannerSupported -> "Camera scanning requires Google Play services."
      !imagePickerSupported -> "No system image picker is available on this device."
      else -> ""
    }

    return mutableMapOf(
      "isSupported" to imagePickerSupported,
      "reason" to if (imagePickerSupported) "" else "No system image picker is available on this device.",
      "scannerCameraSupported" to cameraScannerSupported,
      "scannerImageSupported" to imagePickerSupported,
      "scannerReason" to scannerReason,
    )
  }

  @ReactMethod
  fun pickImage(promise: Promise) {
    if (isBusy()) {
      promise.reject("busy", "Another file picker request is already in progress.")
      return
    }

    val activity = currentActivity
    if (activity == null) {
      promise.reject("activity_unavailable", "Activity is not available.")
      return
    }

    val intent = createPickImageIntent()
    if (intent.resolveActivity(reactContext.packageManager) == null) {
      promise.reject("unsupported", "No system image picker is available on this device.")
      return
    }

    pendingPromise = promise

    try {
      activity.startActivityForResult(Intent.createChooser(intent, "Select image"), REQUEST_CODE_PICK_IMAGE)
    } catch (error: Exception) {
      pendingPromise = null
      promise.reject("picker_error", error.message, error)
    }
  }

  @ReactMethod
  fun scan(promise: Promise) {
    if (isBusy()) {
      promise.reject("busy", "Another scanner request is already in progress.")
      return
    }

    val activity = currentActivity
    if (activity == null) {
      promise.reject("activity_unavailable", "Activity is not available.")
      return
    }

    if (!isGoogleScannerAvailable()) {
      promise.reject("unsupported", "Camera scanning requires Google Play services.")
      return
    }

    pendingCameraScanPromise = promise

    val options = GmsBarcodeScannerOptions.Builder()
      .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
      .enableAutoZoom()
      .build()

    GmsBarcodeScanning.getClient(activity, options)
      .startScan()
      .addOnSuccessListener { barcode ->
        val pending = pendingCameraScanPromise
        pendingCameraScanPromise = null

        if (pending == null) {
          return@addOnSuccessListener
        }

        val value = barcode.rawValue?.trim().orEmpty()
        if (value.isEmpty()) {
          pending.reject("no_code", "No QR code was recognized.")
          return@addOnSuccessListener
        }

        val result = Arguments.createMap().apply {
          putString("value", value)
        }
        pending.resolve(result)
      }
      .addOnCanceledListener {
        val pending = pendingCameraScanPromise
        pendingCameraScanPromise = null
        pending?.reject("cancelled", "User cancelled QR scan.")
      }
      .addOnFailureListener { error ->
        val pending = pendingCameraScanPromise
        pendingCameraScanPromise = null
        pending?.reject("scan_failed", error.message, error)
      }
  }

  @ReactMethod
  fun scanImage(promise: Promise) {
    if (isBusy()) {
      promise.reject("busy", "Another scanner request is already in progress.")
      return
    }

    val activity = currentActivity
    if (activity == null) {
      promise.reject("activity_unavailable", "Activity is not available.")
      return
    }

    val intent = createPickImageIntent()
    if (intent.resolveActivity(reactContext.packageManager) == null) {
      promise.reject("unsupported", "No system image picker is available on this device.")
      return
    }

    pendingImageScanPromise = promise

    try {
      activity.startActivityForResult(Intent.createChooser(intent, "Select image"), REQUEST_CODE_SCAN_IMAGE)
    } catch (error: Exception) {
      pendingImageScanPromise = null
      promise.reject("picker_error", error.message, error)
    }
  }

  @ReactMethod
  fun saveImage(filename: String, base64: String, promise: Promise) {
    try {
      val bytes = Base64.decode(base64, Base64.DEFAULT)
      val resolver = reactContext.contentResolver
      val values = ContentValues().apply {
        put(MediaStore.Images.Media.DISPLAY_NAME, filename.ifBlank { "receive-qr.png" })
        put(MediaStore.Images.Media.MIME_TYPE, "image/png")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/CPCash")
          put(MediaStore.Images.Media.IS_PENDING, 1)
        }
      }

      val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
      if (uri == null) {
        promise.reject("save_failed", "Failed to create image entry.")
        return
      }

      resolver.openOutputStream(uri)?.use { output ->
        output.write(bytes)
        output.flush()
      } ?: run {
        promise.reject("save_failed", "Failed to open image output stream.")
        return
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        values.clear()
        values.put(MediaStore.Images.Media.IS_PENDING, 0)
        resolver.update(uri, values, null, null)
      }

      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("save_failed", error.message, error)
    }
  }

  @ReactMethod
  fun exportFile(filename: String, base64: String, mimeType: String?, promise: Promise) {
    if (isBusy()) {
      promise.reject("busy", "Another file request is already in progress.")
      return
    }

    val activity = currentActivity
    if (activity == null) {
      promise.reject("activity_unavailable", "Activity is not available.")
      return
    }

    val bytes = try {
      Base64.decode(base64, Base64.DEFAULT)
    } catch (error: IllegalArgumentException) {
      promise.reject("invalid_file", "Failed to decode file data.", error)
      return
    }

    val exportName = filename.ifBlank { "cpcash-export.txt" }
    val exportMimeType = resolveExportMimeType(exportName, mimeType)
    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = exportMimeType
      putExtra(Intent.EXTRA_TITLE, exportName)
      addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
    }

    if (intent.resolveActivity(reactContext.packageManager) == null) {
      promise.reject("unsupported", "No system file exporter is available on this device.")
      return
    }

    pendingExportPromise = promise
    pendingExportBytes = bytes

    try {
      activity.startActivityForResult(intent, REQUEST_CODE_EXPORT_FILE)
    } catch (error: Exception) {
      clearPendingExportState()
      promise.reject("export_failed", error.message, error)
    }
  }

  private fun createPickImageIntent(): Intent {
    return Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "image/*"
      putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
  }

  private fun copyPickedImageToCache(uri: Uri) = Arguments.createMap().apply {
    val resolver = reactContext.contentResolver
    val displayName = queryDisplayName(uri)
    val mimeType = resolver.getType(uri)?.takeIf { it.isNotBlank() } ?: guessMimeType(uri.toString())
    val extension = resolvePickedImageExtension(displayName, mimeType, uri)
    val safeBaseName = sanitizeFilenameComponent(displayName?.substringBeforeLast('.', "") ?: "image", "image")
    val cacheDirectory = File(reactContext.cacheDir, "picked-images")
    if (!cacheDirectory.exists() && !cacheDirectory.mkdirs()) {
      throw IllegalStateException("Failed to prepare picked image cache directory.")
    }

    val storedFilename = "picked-${UUID.randomUUID()}-$safeBaseName.$extension"
    val destinationFile = File(cacheDirectory, storedFilename)

    resolver.openInputStream(uri)?.use { input ->
      destinationFile.outputStream().use { output ->
        input.copyTo(output)
      }
    } ?: throw IllegalStateException("Failed to open the selected image stream.")

    putString("uri", Uri.fromFile(destinationFile).toString())
    putString("name", "$safeBaseName.$extension")
    putString("mimeType", mimeType)
  }

  private fun queryDisplayName(uri: Uri): String? {
    reactContext.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
      if (cursor.moveToFirst()) {
        val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (index >= 0) {
          return cursor.getString(index)
        }
      }
    }

    return null
  }

  private fun guessMimeType(uriValue: String): String {
    val extension = MimeTypeMap.getFileExtensionFromUrl(uriValue)?.lowercase(Locale.US).orEmpty()
    if (extension.isNotEmpty()) {
      val mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
      if (!mimeType.isNullOrBlank()) {
        return mimeType
      }
    }

    return "image/jpeg"
  }

  private fun resolvePickedImageExtension(displayName: String?, mimeType: String, uri: Uri): String {
    val mimeExtension = MimeTypeMap.getSingleton()
      .getExtensionFromMimeType(mimeType)
      ?.lowercase(Locale.US)
      .orEmpty()
    if (mimeExtension.isNotEmpty()) {
      return mimeExtension
    }

    val displayNameExtension = displayName
      ?.substringAfterLast('.', "")
      ?.trim()
      ?.lowercase(Locale.US)
      .orEmpty()
    if (displayNameExtension.isNotEmpty()) {
      return displayNameExtension
    }

    val uriExtension = MimeTypeMap.getFileExtensionFromUrl(uri.toString())
      ?.lowercase(Locale.US)
      .orEmpty()
    if (uriExtension.isNotEmpty()) {
      return uriExtension
    }

    return "jpg"
  }

  private fun sanitizeFilenameComponent(value: String, fallback: String): String {
    val normalized = value
      .trim()
      .lowercase(Locale.US)
      .ifEmpty { fallback }
    val sanitized = buildString(normalized.length) {
      normalized.forEach { character ->
        append(
          when {
            character in 'a'..'z' || character in '0'..'9' || character == '-' || character == '_' -> character
            else -> '_'
          },
        )
      }
    }
      .trim('_')

    if (sanitized.isEmpty()) {
      return fallback
    }

    return sanitized.take(48)
  }

  private fun processScannedImage(uri: Uri, promise: Promise) {
    try {
      val image = InputImage.fromFilePath(reactContext, uri)
      val options = BarcodeScannerOptions.Builder()
        .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
        .build()

      BarcodeScanning.getClient(options)
        .process(image)
        .addOnSuccessListener { barcodes ->
          val values = barcodes
            .mapNotNull { it.rawValue?.trim() }
            .filter { it.isNotEmpty() }
            .distinct()

          when {
            values.isEmpty() -> promise.reject("no_code", "No QR code was found in the selected image.")
            values.size > 1 -> promise.reject("multiple_codes", "Multiple QR codes were found in the selected image.")
            else -> {
              val result = Arguments.createMap().apply {
                putString("value", values.first())
              }
              promise.resolve(result)
            }
          }
        }
        .addOnFailureListener { error ->
          promise.reject("image_parse_failed", error.message, error)
        }
    } catch (error: Exception) {
      promise.reject("image_parse_failed", error.message, error)
    }
  }

  private fun isBusy(): Boolean {
    return pendingPromise != null || pendingImageScanPromise != null || pendingCameraScanPromise != null || pendingExportPromise != null
  }

  private fun isGoogleScannerAvailable(): Boolean {
    return GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(reactContext) == ConnectionResult.SUCCESS
  }

  private fun resolveExportMimeType(filename: String, explicitMimeType: String?): String {
    if (!explicitMimeType.isNullOrBlank()) {
      return explicitMimeType
    }

    val extension = filename.substringAfterLast('.', "").lowercase(Locale.US)
    if (extension.isNotEmpty()) {
      val mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
      if (!mimeType.isNullOrBlank()) {
        return mimeType
      }
    }

    return "application/octet-stream"
  }

  private fun clearPendingExportState() {
    pendingExportPromise = null
    pendingExportBytes = null
  }

  companion object {
    private const val REQUEST_CODE_PICK_IMAGE = 64102
    private const val REQUEST_CODE_SCAN_IMAGE = 64103
    private const val REQUEST_CODE_EXPORT_FILE = 64104
  }
}
