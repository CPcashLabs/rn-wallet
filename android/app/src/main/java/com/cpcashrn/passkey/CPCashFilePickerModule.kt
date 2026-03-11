package com.cpcashrn.passkey

import android.app.Activity
import android.content.Intent
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Locale

class CPCashFilePickerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var pendingPromise: Promise? = null
  private val activityEventListener: ActivityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
      if (requestCode != REQUEST_CODE_PICK_IMAGE) {
        return
      }

      val promise = pendingPromise
      pendingPromise = null

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
    val supported = createPickImageIntent().resolveActivity(reactContext.packageManager) != null

    return mutableMapOf(
      "isSupported" to supported,
      "reason" to if (supported) "" else "No system image picker is available on this device.",
    )
  }

  @ReactMethod
  fun pickImage(promise: Promise) {
    if (pendingPromise != null) {
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

  private fun createPickImageIntent(): Intent {
    return Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "image/*"
      putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
    }
  }

  private fun queryDisplayName(uri: android.net.Uri): String? {
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

  companion object {
    private const val REQUEST_CODE_PICK_IMAGE = 64102
  }
}
