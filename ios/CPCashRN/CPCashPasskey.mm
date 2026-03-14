#import "CPCashPasskey.h"

#import <AuthenticationServices/AuthenticationServices.h>
#import <React/RCTUtils.h>
#import <Security/Security.h>
#import <UIKit/UIKit.h>

@interface CPCashPasskey () <ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding>
@property (nonatomic, copy, nullable) RCTPromiseResolveBlock pendingResolve;
@property (nonatomic, copy, nullable) RCTPromiseRejectBlock pendingReject;
@property (nonatomic, copy, nullable) NSString *pendingOperation;
@property (nonatomic, copy, nullable) NSString *pendingUserID;
@end

@implementation CPCashPasskey

RCT_EXPORT_MODULE(CPCashPasskey)

static NSString *const CPCashPasskeyUnsupportedReason = @"Passkey requires iOS 16 or later.";

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (NSDictionary *)constantsToExport
{
  NSString *reason = [self passkeyUnavailableReason];
  BOOL supported = reason.length == 0;

  return @{
    @"isSupported": @(supported),
    @"reason": reason,
  };
}

RCT_EXPORT_METHOD(register:(NSDictionary *)options
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  NSString *unavailableReason = [self passkeyUnavailableReason];
  if (unavailableReason.length == 0) {
    NSString *username = [self sanitizedString:options[@"username"]];
    NSString *rpId = [self sanitizedString:options[@"rpId"]];

    if (username.length == 0 || rpId.length == 0) {
      reject(@"invalid_arguments", @"username and rpId are required.", nil);
      return;
    }

    NSString *userID = [self randomEntropyHex];
    NSData *userIDData = [userID dataUsingEncoding:NSUTF8StringEncoding];
    NSData *challenge = [self randomDataWithLength:32];
    ASAuthorizationPlatformPublicKeyCredentialProvider *provider =
      [[ASAuthorizationPlatformPublicKeyCredentialProvider alloc] initWithRelyingPartyIdentifier:rpId];
    ASAuthorizationPlatformPublicKeyCredentialRegistrationRequest *request =
      [provider createCredentialRegistrationRequestWithChallenge:challenge name:username userID:userIDData];

    [self performRequest:request
               operation:@"register"
                  userID:userID
                 resolve:resolve
                  reject:reject];
  } else {
    reject(@"unsupported", unavailableReason, nil);
  }
}

RCT_EXPORT_METHOD(authenticate:(NSDictionary *)options
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  NSString *unavailableReason = [self passkeyUnavailableReason];
  if (unavailableReason.length == 0) {
    NSString *rpId = [self sanitizedString:options[@"rpId"]];
    NSString *rawId = [self sanitizedString:options[@"rawId"]];

    if (rpId.length == 0) {
      reject(@"invalid_arguments", @"rpId is required.", nil);
      return;
    }

    NSData *challenge = [self randomDataWithLength:32];
    ASAuthorizationPlatformPublicKeyCredentialProvider *provider =
      [[ASAuthorizationPlatformPublicKeyCredentialProvider alloc] initWithRelyingPartyIdentifier:rpId];
    ASAuthorizationPlatformPublicKeyCredentialAssertionRequest *request =
      [provider createCredentialAssertionRequestWithChallenge:challenge];

    if (rawId.length > 0) {
      NSData *credentialData = [self dataFromBase64URLString:rawId];
      if (credentialData == nil) {
        reject(@"invalid_raw_id", @"rawId is invalid.", nil);
        return;
      }

      ASAuthorizationPlatformPublicKeyCredentialDescriptor *descriptor =
        [[ASAuthorizationPlatformPublicKeyCredentialDescriptor alloc] initWithCredentialID:credentialData];
      request.allowedCredentials = @[ descriptor ];
    }

    [self performRequest:request
               operation:@"authenticate"
                  userID:nil
                 resolve:resolve
                  reject:reject];
  } else {
    reject(@"unsupported", unavailableReason, nil);
  }
}

- (void)performRequest:(ASAuthorizationRequest *)request
             operation:(NSString *)operation
                userID:(NSString * _Nullable)userID
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject
{
  if (self.pendingResolve != nil || self.pendingReject != nil) {
    reject(@"busy", @"Another passkey request is already in progress.", nil);
    return;
  }

  self.pendingResolve = resolve;
  self.pendingReject = reject;
  self.pendingOperation = operation;
  self.pendingUserID = userID;

  dispatch_async(dispatch_get_main_queue(), ^{
    ASAuthorizationController *controller = [[ASAuthorizationController alloc] initWithAuthorizationRequests:@[ request ]];
    controller.delegate = self;
    controller.presentationContextProvider = self;
    [controller performRequests];
  });
}

- (void)authorizationController:(ASAuthorizationController *)controller didCompleteWithAuthorization:(ASAuthorization *)authorization
{
  RCTPromiseResolveBlock resolve = self.pendingResolve;
  RCTPromiseRejectBlock reject = self.pendingReject;
  NSString *operation = self.pendingOperation;
  NSString *userID = self.pendingUserID;
  [self clearPendingCallbacks];

  if (resolve == nil) {
    return;
  }

  if ([operation isEqualToString:@"register"]) {
    id<ASAuthorizationCredential> authorizationCredential = authorization.credential;
    if (![authorizationCredential conformsToProtocol:@protocol(ASAuthorizationPublicKeyCredentialRegistration)]) {
      if (reject != nil) {
        reject(@"invalid_credential", @"Unexpected passkey registration credential.", nil);
      }
      return;
    }

    id<ASAuthorizationPublicKeyCredentialRegistration> credential =
      (id<ASAuthorizationPublicKeyCredentialRegistration>)authorizationCredential;
    resolve(@{
      @"credentialId": [self base64URLStringFromData:credential.credentialID],
      @"rawId": [self base64URLStringFromData:credential.credentialID],
      @"userId": userID ?: @"",
      @"clientDataJSON": credential.rawClientDataJSON ? [self base64URLStringFromData:credential.rawClientDataJSON] : [NSNull null],
      @"attestationObject": credential.rawAttestationObject ? [self base64URLStringFromData:credential.rawAttestationObject] : [NSNull null],
    });
    return;
  }

  id<ASAuthorizationCredential> authorizationCredential = authorization.credential;
  if (![authorizationCredential conformsToProtocol:@protocol(ASAuthorizationPublicKeyCredentialAssertion)]) {
    if (reject != nil) {
      reject(@"invalid_credential", @"Unexpected passkey assertion credential.", nil);
    }
    return;
  }

  id<ASAuthorizationPublicKeyCredentialAssertion> credential =
    (id<ASAuthorizationPublicKeyCredentialAssertion>)authorizationCredential;
  NSString *assertedUserID = [[NSString alloc] initWithData:credential.userID encoding:NSUTF8StringEncoding] ?: @"";
  resolve(@{
    @"credentialId": [self base64URLStringFromData:credential.credentialID],
    @"rawId": [self base64URLStringFromData:credential.credentialID],
    @"userId": assertedUserID,
    @"clientDataJSON": credential.rawClientDataJSON ? [self base64URLStringFromData:credential.rawClientDataJSON] : [NSNull null],
    @"authenticatorData": credential.rawAuthenticatorData ? [self base64URLStringFromData:credential.rawAuthenticatorData] : [NSNull null],
    @"signature": credential.signature ? [self base64URLStringFromData:credential.signature] : [NSNull null],
  });
}

- (void)authorizationController:(ASAuthorizationController *)controller didCompleteWithError:(NSError *)error
{
  RCTPromiseRejectBlock reject = self.pendingReject;
  [self clearPendingCallbacks];

  if (reject == nil) {
    return;
  }

  reject([self errorCodeFromNSError:error], error.localizedDescription, error);
}

- (ASPresentationAnchor)presentationAnchorForAuthorizationController:(ASAuthorizationController *)controller
{
  UIViewController *presented = RCTPresentedViewController();
  if (presented.view.window != nil) {
    return presented.view.window;
  }

  UIWindow *keyWindow = RCTKeyWindow();
  if (keyWindow != nil) {
    return keyWindow;
  }

  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:[UIWindowScene class]]) {
      continue;
    }

    UIWindowScene *windowScene = (UIWindowScene *)scene;
    for (UIWindow *window in windowScene.windows) {
      if (window != nil) {
        return window;
      }
    }
  }

  return presented.view.window ?: RCTKeyWindow();
}

- (void)clearPendingCallbacks
{
  self.pendingResolve = nil;
  self.pendingReject = nil;
  self.pendingOperation = nil;
  self.pendingUserID = nil;
}

- (NSString *)sanitizedString:(id)value
{
  if (![value isKindOfClass:[NSString class]]) {
    return @"";
  }

  return [(NSString *)value stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
}

- (NSData *)randomDataWithLength:(size_t)length
{
  NSMutableData *data = [NSMutableData dataWithLength:length];
  int result = SecRandomCopyBytes(kSecRandomDefault, length, data.mutableBytes);
  if (result != errSecSuccess) {
    return [@"fallback-passkey-challenge" dataUsingEncoding:NSUTF8StringEncoding];
  }

  return data;
}

- (NSString *)randomEntropyHex
{
  NSData *randomData = [self randomDataWithLength:16];
  const unsigned char *bytes = (const unsigned char *)randomData.bytes;
  NSMutableString *hex = [NSMutableString stringWithCapacity:randomData.length * 2];

  for (NSUInteger index = 0; index < randomData.length; index++) {
    [hex appendFormat:@"%02x", bytes[index]];
  }

  return hex;
}

- (NSString *)base64URLStringFromData:(NSData *)data
{
  NSString *base64 = [data base64EncodedStringWithOptions:0];
  base64 = [base64 stringByReplacingOccurrencesOfString:@"+" withString:@"-"];
  base64 = [base64 stringByReplacingOccurrencesOfString:@"/" withString:@"_"];
  return [base64 stringByTrimmingCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"="]];
}

- (NSData * _Nullable)dataFromBase64URLString:(NSString *)value
{
  NSString *base64 = [value stringByReplacingOccurrencesOfString:@"-" withString:@"+"];
  base64 = [base64 stringByReplacingOccurrencesOfString:@"_" withString:@"/"];

  NSUInteger padding = base64.length % 4;
  if (padding > 0) {
    base64 = [base64 stringByPaddingToLength:base64.length + (4 - padding) withString:@"=" startingAtIndex:0];
  }

  return [[NSData alloc] initWithBase64EncodedString:base64 options:0];
}

- (NSString *)errorCodeFromNSError:(NSError *)error
{
  if ([error.domain isEqualToString:ASAuthorizationErrorDomain] && error.code == ASAuthorizationErrorCanceled) {
    return @"cancelled";
  }

  return @"passkey_error";
}

- (NSString *)passkeyUnavailableReason
{
  if (@available(iOS 16.0, *)) {
    return @"";
  }

  return CPCashPasskeyUnsupportedReason;
}

@end
