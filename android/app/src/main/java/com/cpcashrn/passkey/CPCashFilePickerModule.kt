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
import java.util.Locale

class CPCashFilePickerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var pendingPromise: Promise? = null
  private var pendingImageScanPromise: Promise? = null
  private var pendingCameraScanPromise: Promise? = null

  private val activityEventListener: ActivityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
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

      val permissionFlags = data.flags and Intent.FLAG_GRANT_READ_URI_PERMISSION
      if (permissionFlags != 0) {
        try {
          reactContext.contentResolver.takePersistableUriPermission(uri, permissionFlags)
        } catch (_: SecurityException) {
          // Some providers do not support persistable permissions.
        }
      }

      if (requestCode == REQUEST_CODE_SCAN_IMAGE) {
        processScannedImage(uri, promise)
        return
      }

      val result = Arguments.createMap().apply {
        putString("uri", uri.toString())
        putString("name", queryDisplayName(uri) ?: "avatar")
        putString("mimeType", reactContext.contentResolver.getType(uri) ?: guessMimeType(uri.toString()))
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

  private fun createPickImageIntent(): Intent {
    return Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "image/*"
      putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
    }
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
    return pendingPromise != null || pendingImageScanPromise != null || pendingCameraScanPromise != null
  }

  private fun isGoogleScannerAvailable(): Boolean {
    return GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(reactContext) == ConnectionResult.SUCCESS
  }

  companion object {
    private const val REQUEST_CODE_PICK_IMAGE = 64102
    private const val REQUEST_CODE_SCAN_IMAGE = 64103
  }
}
