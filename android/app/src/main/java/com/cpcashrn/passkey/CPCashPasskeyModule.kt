package com.cpcashrn.passkey

import android.os.Build
import androidx.core.content.ContextCompat
import androidx.credentials.CreateCredentialResponse
import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.CreatePublicKeyCredentialResponse
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.GetPublicKeyCredentialOption
import androidx.credentials.PublicKeyCredential
import androidx.credentials.exceptions.CreateCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialCancellationException
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONArray
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.security.SecureRandom

class CPCashPasskeyModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  private val credentialManager = CredentialManager.create(reactContext)
  private val executor = ContextCompat.getMainExecutor(reactContext)
  private val secureRandom = SecureRandom()

  override fun getName(): String = "CPCashPasskey"

  override fun getConstants(): MutableMap<String, Any> {
    val supported = isSupported()

    return mutableMapOf(
      "isSupported" to supported,
      "reason" to if (supported) "" else "Passkey requires Android 9 (API 28) or later.",
    )
  }

  @ReactMethod
  fun register(options: ReadableMap, promise: Promise) {
    if (!isSupported()) {
      promise.reject("unsupported", "Passkey requires Android 9 (API 28) or later.")
      return
    }

    val activity = currentActivity
    if (activity == null) {
      promise.reject("activity_unavailable", "Activity is not available.")
      return
    }

    val username = options.getString("username")?.trim().orEmpty()
    val rpId = options.getString("rpId")?.trim().orEmpty()

    if (username.isEmpty() || rpId.isEmpty()) {
      promise.reject("invalid_arguments", "username and rpId are required.")
      return
    }

    val userId = generateEntropyHex()
    val requestJson = JSONObject().apply {
      put("challenge", randomBase64Url(32))
      put("rp", JSONObject().apply {
        put("name", "CPCash Wallet")
        put("id", rpId)
      })
      put("user", JSONObject().apply {
        put("id", base64UrlEncode(userId.toByteArray(StandardCharsets.UTF_8)))
        put("name", username)
        put("displayName", username)
      })
      put("pubKeyCredParams", JSONArray().apply {
        put(JSONObject().apply {
          put("alg", -7)
          put("type", "public-key")
        })
      })
      put("attestation", "none")
      put("timeout", 60000)
      put("authenticatorSelection", JSONObject().apply {
        put("residentKey", "required")
        put("userVerification", "required")
      })
    }.toString()

    val request = CreatePublicKeyCredentialRequest(requestJson)
    credentialManager.createCredentialAsync(
      activity,
      request,
      null,
      executor,
      object : androidx.credentials.CredentialManagerCallback<CreateCredentialResponse, Exception> {
        override fun onResult(result: CreateCredentialResponse) {
          val response = result as? CreatePublicKeyCredentialResponse
          if (response == null) {
            promise.reject("invalid_response", "Unexpected create credential response.")
            return
          }

          val payload = JSONObject(response.registrationResponseJson)
          val responseJson = payload.optJSONObject("response")
          val map = Arguments.createMap().apply {
            putString("credentialId", payload.optString("id"))
            putString("rawId", payload.optString("rawId", payload.optString("id")))
            putString("userId", userId)
            putString("clientDataJSON", responseJson?.optString("clientDataJSON"))
            putString("attestationObject", responseJson?.optString("attestationObject"))
          }

          promise.resolve(map)
        }

        override fun onError(e: Exception) {
          val code = if (e is CreateCredentialCancellationException) "cancelled" else "passkey_error"
          promise.reject(code, e.message, e)
        }
      },
    )
  }

  @ReactMethod
  fun authenticate(options: ReadableMap, promise: Promise) {
    if (!isSupported()) {
      promise.reject("unsupported", "Passkey requires Android 9 (API 28) or later.")
      return
    }

    val activity = currentActivity
    if (activity == null) {
      promise.reject("activity_unavailable", "Activity is not available.")
      return
    }

    val rpId = options.getString("rpId")?.trim().orEmpty()
    val rawId = options.getString("rawId")?.trim().orEmpty()

    if (rpId.isEmpty()) {
      promise.reject("invalid_arguments", "rpId is required.")
      return
    }

    val requestJson = JSONObject().apply {
      put("challenge", randomBase64Url(32))
      put("rpId", rpId)
      put("timeout", 60000)
      put("userVerification", "required")
      if (rawId.isNotEmpty()) {
        put("allowCredentials", JSONArray().apply {
          put(JSONObject().apply {
            put("id", rawId)
            put("type", "public-key")
          })
        })
      }
    }.toString()

    val option = GetPublicKeyCredentialOption(requestJson)
    val request = GetCredentialRequest(listOf(option))
    credentialManager.getCredentialAsync(
      activity,
      request,
      null,
      executor,
      object : androidx.credentials.CredentialManagerCallback<GetCredentialResponse, Exception> {
        override fun onResult(result: GetCredentialResponse) {
          val credential = result.credential as? PublicKeyCredential
          if (credential == null) {
            promise.reject("invalid_response", "Unexpected get credential response.")
            return
          }

          val payload = JSONObject(credential.authenticationResponseJson)
          val responseJson = payload.optJSONObject("response")
          val userHandle = responseJson?.optString("userHandle").orEmpty()
          val userId = decodeUserId(userHandle)

          if (userId.isEmpty()) {
            promise.reject("missing_user_id", "Passkey userHandle is missing.")
            return
          }

          val map = Arguments.createMap().apply {
            putString("credentialId", payload.optString("id"))
            putString("rawId", payload.optString("rawId", payload.optString("id")))
            putString("userId", userId)
            putString("clientDataJSON", responseJson?.optString("clientDataJSON"))
            putString("authenticatorData", responseJson?.optString("authenticatorData"))
            putString("signature", responseJson?.optString("signature"))
          }

          promise.resolve(map)
        }

        override fun onError(e: Exception) {
          val code = if (e is GetCredentialCancellationException) "cancelled" else "passkey_error"
          promise.reject(code, e.message, e)
        }
      },
    )
  }

  private fun isSupported(): Boolean = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P

  private fun generateEntropyHex(): String {
    val bytes = ByteArray(16)
    secureRandom.nextBytes(bytes)
    return bytes.joinToString(separator = "") { "%02x".format(it) }
  }

  private fun randomBase64Url(length: Int): String {
    val bytes = ByteArray(length)
    secureRandom.nextBytes(bytes)
    return base64UrlEncode(bytes)
  }

  private fun base64UrlEncode(bytes: ByteArray): String {
    return android.util.Base64.encodeToString(
      bytes,
      android.util.Base64.NO_WRAP or android.util.Base64.NO_PADDING or android.util.Base64.URL_SAFE,
    )
  }

  private fun decodeUserId(base64Url: String): String {
    if (base64Url.isBlank()) {
      return ""
    }

    val bytes = android.util.Base64.decode(base64Url, android.util.Base64.NO_WRAP or android.util.Base64.NO_PADDING or android.util.Base64.URL_SAFE)
    return String(bytes, StandardCharsets.UTF_8)
  }
}
