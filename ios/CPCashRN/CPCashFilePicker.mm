#import "CPCashFilePicker.h"

#import <PhotosUI/PhotosUI.h>
#import <React/RCTUtils.h>

@interface CPCashFilePicker () <PHPickerViewControllerDelegate>
@property (nonatomic, copy, nullable) RCTPromiseResolveBlock pendingResolve;
@property (nonatomic, copy, nullable) RCTPromiseRejectBlock pendingReject;
@end

@implementation CPCashFilePicker

RCT_EXPORT_MODULE(CPCashFilePicker)

static NSString *const CPCashFilePickerUnsupportedReason = @"Image picking requires iOS 14 or later.";

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (NSDictionary *)constantsToExport
{
  NSString *reason = [self unavailableReason];
  BOOL supported = reason.length == 0;

  return @{
    @"isSupported": @(supported),
    @"reason": reason,
  };
}

RCT_EXPORT_METHOD(pickImage:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *unavailableReason = [self unavailableReason];
  if (unavailableReason.length > 0) {
    reject(@"unsupported", unavailableReason, nil);
    return;
  }

  if (self.pendingResolve != nil || self.pendingReject != nil) {
    reject(@"busy", @"Another file picker request is already in progress.", nil);
    return;
  }

  self.pendingResolve = resolve;
  self.pendingReject = reject;

  dispatch_async(dispatch_get_main_queue(), ^{
    UIViewController *presented = RCTPresentedViewController();
    if (presented == nil) {
      [self rejectPendingWithCode:@"activity_unavailable" message:@"Unable to present image picker." error:nil];
      return;
    }

    PHPickerConfiguration *configuration = [[PHPickerConfiguration alloc] init];
    configuration.selectionLimit = 1;
    configuration.filter = [PHPickerFilter imagesFilter];
    configuration.preferredAssetRepresentationMode = PHPickerConfigurationAssetRepresentationModeCurrent;

    PHPickerViewController *picker = [[PHPickerViewController alloc] initWithConfiguration:configuration];
    picker.delegate = self;
    [presented presentViewController:picker animated:YES completion:nil];
  });
}

- (void)picker:(PHPickerViewController *)picker didFinishPicking:(NSArray<PHPickerResult *> *)results
{
  [picker dismissViewControllerAnimated:YES completion:nil];

  if (results.count == 0) {
    [self rejectPendingWithCode:@"cancelled" message:@"User cancelled image selection." error:nil];
    return;
  }

  PHPickerResult *result = results.firstObject;
  NSItemProvider *provider = result.itemProvider;
  if (![provider hasItemConformingToTypeIdentifier:@"public.image"]) {
    [self rejectPendingWithCode:@"invalid_type" message:@"The selected file is not an image." error:nil];
    return;
  }

  [provider loadFileRepresentationForTypeIdentifier:@"public.image"
                                  completionHandler:^(NSURL * _Nullable url, NSError * _Nullable error) {
    if (error != nil) {
      [self rejectPendingWithCode:@"picker_error" message:error.localizedDescription error:error];
      return;
    }

    if (url == nil) {
      [self rejectPendingWithCode:@"empty_result" message:@"No image was selected." error:nil];
      return;
    }

    NSError *persistError = nil;
    NSDictionary *payload = [self buildPayloadFromFileURL:url
                                            suggestedName:provider.suggestedName
                                                    error:&persistError];
    if (payload == nil) {
      [self rejectPendingWithCode:@"persist_error"
                          message:persistError.localizedDescription ?: @"Failed to persist selected image."
                            error:persistError];
      return;
    }

    [self resolvePendingWithPayload:payload];
  }];
}

- (NSDictionary * _Nullable)buildPayloadFromFileURL:(NSURL *)url
                                      suggestedName:(NSString * _Nullable)suggestedName
                                              error:(NSError * _Nullable __autoreleasing *)error
{
  NSString *extension = url.pathExtension.lowercaseString;
  if (extension.length == 0) {
    extension = suggestedName.pathExtension.lowercaseString;
  }
  if (extension.length == 0) {
    extension = @"jpg";
  }

  NSString *baseName = suggestedName.length > 0 ? suggestedName : NSUUID.UUID.UUIDString;
  NSString *filename = baseName.pathExtension.length > 0 ? baseName : [baseName stringByAppendingPathExtension:extension];
  NSString *temporaryFilename = [NSString stringWithFormat:@"%@-%@", NSUUID.UUID.UUIDString, filename];
  NSURL *temporaryURL = [NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:temporaryFilename]];

  NSFileManager *fileManager = [NSFileManager defaultManager];
  [fileManager removeItemAtURL:temporaryURL error:nil];

  if (![fileManager copyItemAtURL:url toURL:temporaryURL error:error]) {
    NSData *data = [NSData dataWithContentsOfURL:url options:0 error:error];
    if (data == nil) {
      return nil;
    }

    if (![data writeToURL:temporaryURL options:NSDataWritingAtomic error:error]) {
      return nil;
    }
  }

  return @{
    @"uri": temporaryURL.absoluteString,
    @"name": filename,
    @"mimeType": [self mimeTypeForPathExtension:extension],
  };
}

- (NSString *)mimeTypeForPathExtension:(NSString *)extension
{
  NSString *normalized = extension.lowercaseString;
  if ([normalized isEqualToString:@"png"]) {
    return @"image/png";
  }
  if ([normalized isEqualToString:@"gif"]) {
    return @"image/gif";
  }
  if ([normalized isEqualToString:@"heic"] || [normalized isEqualToString:@"heif"]) {
    return @"image/heic";
  }
  if ([normalized isEqualToString:@"webp"]) {
    return @"image/webp";
  }

  return @"image/jpeg";
}

- (void)resolvePendingWithPayload:(NSDictionary *)payload
{
  RCTPromiseResolveBlock resolve = self.pendingResolve;
  [self clearPendingCallbacks];

  if (resolve == nil) {
    return;
  }

  resolve(payload);
}

- (void)rejectPendingWithCode:(NSString *)code
                      message:(NSString *)message
                        error:(NSError * _Nullable)error
{
  RCTPromiseRejectBlock reject = self.pendingReject;
  [self clearPendingCallbacks];

  if (reject == nil) {
    return;
  }

  reject(code, message, error);
}

- (void)clearPendingCallbacks
{
  self.pendingResolve = nil;
  self.pendingReject = nil;
}

- (NSString *)unavailableReason
{
  if (@available(iOS 14.0, *)) {
    return @"";
  }

  return CPCashFilePickerUnsupportedReason;
}

@end
