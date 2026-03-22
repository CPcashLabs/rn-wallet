package com.cpcashrn.scanner

import android.app.Activity
import android.content.Intent
import android.net.Uri
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

class CPCashScannerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var pendingImageScanPromise: Promise? = null
  private var pendingCameraScanPromise: Promise? = null

  private val activityEventListener: ActivityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
      if (requestCode != REQUEST_CODE_SCAN_IMAGE) {
        return
      }

      val promise = pendingImageScanPromise.also { pendingImageScanPromise = null }
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

      processScannedImage(uri, promise)
    }
  }

  init {
    reactContext.addActivityEventListener(activityEventListener)
  }

  override fun getName(): String = "CPCashScanner"

  override fun getConstants(): MutableMap<String, Any> {
    val imageScannerSupported = createPickImageIntent().resolveActivity(reactContext.packageManager) != null
    val cameraScannerSupported = isGoogleScannerAvailable()
    val scannerReason = when {
      !cameraScannerSupported && !imageScannerSupported -> "QR scanning is not supported on this device."
      !cameraScannerSupported -> "Camera scanning requires Google Play services."
      !imageScannerSupported -> "No system image picker is available on this device."
      else -> ""
    }

    return mutableMapOf(
      "scannerCameraSupported" to cameraScannerSupported,
      "scannerImageSupported" to imageScannerSupported,
      "scannerReason" to scannerReason,
    )
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

  private fun createPickImageIntent(): Intent {
    return Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "image/*"
      putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
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
    return pendingImageScanPromise != null || pendingCameraScanPromise != null
  }

  private fun isGoogleScannerAvailable(): Boolean {
    return GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(reactContext) == ConnectionResult.SUCCESS
  }

  companion object {
    private const val REQUEST_CODE_SCAN_IMAGE = 64103
  }
}
