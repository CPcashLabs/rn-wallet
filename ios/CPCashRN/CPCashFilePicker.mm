#import "CPCashFilePicker.h"

#import <AVFoundation/AVFoundation.h>
#import <CoreImage/CoreImage.h>
#import <Photos/Photos.h>
#import <PhotosUI/PhotosUI.h>
#import <React/RCTUtils.h>

typedef void (^CPCashScannerDetectBlock)(NSString *value);
typedef void (^CPCashScannerFinishBlock)(NSString *code, NSString *message, NSError * _Nullable error);

@interface CPCashCameraScannerViewController : UIViewController <AVCaptureMetadataOutputObjectsDelegate>
@property (nonatomic, copy, nullable) CPCashScannerDetectBlock onDetect;
@property (nonatomic, copy, nullable) CPCashScannerFinishBlock onFinish;
@property (nonatomic, strong, nullable) AVCaptureSession *session;
@property (nonatomic, strong, nullable) AVCaptureVideoPreviewLayer *previewLayer;
@property (nonatomic, assign) BOOL completed;
@end

@implementation CPCashCameraScannerViewController

- (void)viewDidLoad
{
  [super viewDidLoad];

  self.view.backgroundColor = UIColor.blackColor;
  self.modalPresentationStyle = UIModalPresentationFullScreen;

  UILabel *titleLabel = [[UILabel alloc] init];
  titleLabel.translatesAutoresizingMaskIntoConstraints = NO;
  titleLabel.text = @"Scan QR Code";
  titleLabel.textColor = UIColor.whiteColor;
  titleLabel.font = [UIFont boldSystemFontOfSize:18.0];
  [self.view addSubview:titleLabel];

  UIButton *cancelButton = [UIButton buttonWithType:UIButtonTypeSystem];
  cancelButton.translatesAutoresizingMaskIntoConstraints = NO;
  [cancelButton setTitle:@"Cancel" forState:UIControlStateNormal];
  [cancelButton setTitleColor:UIColor.whiteColor forState:UIControlStateNormal];
  cancelButton.titleLabel.font = [UIFont systemFontOfSize:16.0 weight:UIFontWeightSemibold];
  [cancelButton addTarget:self action:@selector(cancelTapped) forControlEvents:UIControlEventTouchUpInside];
  [self.view addSubview:cancelButton];

  UIView *frameView = [[UIView alloc] init];
  frameView.translatesAutoresizingMaskIntoConstraints = NO;
  frameView.layer.borderWidth = 2.0;
  frameView.layer.borderColor = [UIColor colorWithWhite:1.0 alpha:0.78].CGColor;
  frameView.layer.cornerRadius = 16.0;
  frameView.backgroundColor = UIColor.clearColor;
  [self.view addSubview:frameView];

  UILabel *hintLabel = [[UILabel alloc] init];
  hintLabel.translatesAutoresizingMaskIntoConstraints = NO;
  hintLabel.text = @"Align the QR code inside the frame";
  hintLabel.textColor = [UIColor colorWithWhite:1.0 alpha:0.84];
  hintLabel.font = [UIFont systemFontOfSize:14.0];
  [self.view addSubview:hintLabel];

  [NSLayoutConstraint activateConstraints:@[
    [cancelButton.topAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.topAnchor constant:16.0],
    [cancelButton.trailingAnchor constraintEqualToAnchor:self.view.trailingAnchor constant:-20.0],
    [titleLabel.centerYAnchor constraintEqualToAnchor:cancelButton.centerYAnchor],
    [titleLabel.centerXAnchor constraintEqualToAnchor:self.view.centerXAnchor],
    [frameView.leadingAnchor constraintEqualToAnchor:self.view.leadingAnchor constant:48.0],
    [frameView.trailingAnchor constraintEqualToAnchor:self.view.trailingAnchor constant:-48.0],
    [frameView.centerYAnchor constraintEqualToAnchor:self.view.centerYAnchor constant:-40.0],
    [frameView.heightAnchor constraintEqualToAnchor:frameView.widthAnchor],
    [hintLabel.topAnchor constraintEqualToAnchor:frameView.bottomAnchor constant:24.0],
    [hintLabel.centerXAnchor constraintEqualToAnchor:self.view.centerXAnchor],
  ]];

  AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
  NSError *inputError = nil;
  AVCaptureDeviceInput *input = [AVCaptureDeviceInput deviceInputWithDevice:device error:&inputError];
  if (device == nil || input == nil || inputError != nil) {
    [self finishWithCode:@"camera_unavailable"
                 message:inputError.localizedDescription ?: @"Camera is unavailable."
                   error:inputError];
    return;
  }

  AVCaptureSession *session = [[AVCaptureSession alloc] init];
  if ([session canAddInput:input]) {
    [session addInput:input];
  } else {
    [self finishWithCode:@"camera_unavailable" message:@"Unable to configure camera input." error:nil];
    return;
  }

  AVCaptureMetadataOutput *output = [[AVCaptureMetadataOutput alloc] init];
  if ([session canAddOutput:output]) {
    [session addOutput:output];
  } else {
    [self finishWithCode:@"camera_unavailable" message:@"Unable to configure camera output." error:nil];
    return;
  }

  [output setMetadataObjectsDelegate:self queue:dispatch_get_main_queue()];
  output.metadataObjectTypes = @[AVMetadataObjectTypeQRCode];
  self.session = session;

  AVCaptureVideoPreviewLayer *previewLayer = [AVCaptureVideoPreviewLayer layerWithSession:session];
  previewLayer.videoGravity = AVLayerVideoGravityResizeAspectFill;
  previewLayer.frame = self.view.bounds;
  [self.view.layer insertSublayer:previewLayer atIndex:0];
  self.previewLayer = previewLayer;
}

- (void)viewDidAppear:(BOOL)animated
{
  [super viewDidAppear:animated];

  if (self.session != nil && !self.session.isRunning) {
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
      [self.session startRunning];
    });
  }
}

- (void)viewWillDisappear:(BOOL)animated
{
  [super viewWillDisappear:animated];

  if (self.session != nil && self.session.isRunning) {
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
      [self.session stopRunning];
    });
  }
}

- (void)viewDidLayoutSubviews
{
  [super viewDidLayoutSubviews];
  self.previewLayer.frame = self.view.bounds;
}

- (void)cancelTapped
{
  [self finishWithCode:@"cancelled" message:@"User cancelled QR scan." error:nil];
}

- (void)finishWithCode:(NSString *)code
               message:(NSString *)message
                 error:(NSError * _Nullable)error
{
  if (self.completed) {
    return;
  }

  self.completed = YES;
  if (self.session != nil && self.session.isRunning) {
    [self.session stopRunning];
  }

  __weak CPCashCameraScannerViewController *weakSelf = self;
  [self dismissViewControllerAnimated:YES completion:^{
    if (weakSelf.onFinish != nil) {
      weakSelf.onFinish(code, message, error);
    }
  }];
}

- (void)captureOutput:(AVCaptureOutput *)output
didOutputMetadataObjects:(NSArray<__kindof AVMetadataObject *> *)metadataObjects
       fromConnection:(AVCaptureConnection *)connection
{
  NSMutableOrderedSet<NSString *> *values = [[NSMutableOrderedSet alloc] init];

  for (AVMetadataMachineReadableCodeObject *object in metadataObjects) {
    if (![object.type isEqualToString:AVMetadataObjectTypeQRCode]) {
      continue;
    }

    NSString *value = object.stringValue;
    if (value.length > 0) {
      [values addObject:value];
    }
  }

  if (values.count == 0) {
    return;
  }

  if (values.count > 1) {
    [self finishWithCode:@"multiple_codes" message:@"Multiple QR codes were detected." error:nil];
    return;
  }

  if (self.completed) {
    return;
  }

  self.completed = YES;
  if (self.session != nil && self.session.isRunning) {
    [self.session stopRunning];
  }

  NSString *result = values.firstObject;
  __weak CPCashCameraScannerViewController *weakSelf = self;
  [self dismissViewControllerAnimated:YES completion:^{
    if (weakSelf.onDetect != nil) {
      weakSelf.onDetect(result);
    }
  }];
}

@end

@interface CPCashFilePicker () <PHPickerViewControllerDelegate>
@property (nonatomic, copy, nullable) RCTPromiseResolveBlock pendingResolve;
@property (nonatomic, copy, nullable) RCTPromiseRejectBlock pendingReject;
@property (nonatomic, copy, nullable) NSString *pendingPickerMode;
@property (nonatomic, copy, nullable) RCTPromiseResolveBlock pendingScanResolve;
@property (nonatomic, copy, nullable) RCTPromiseRejectBlock pendingScanReject;
@property (nonatomic, copy, nullable) RCTPromiseResolveBlock pendingSaveResolve;
@property (nonatomic, copy, nullable) RCTPromiseRejectBlock pendingSaveReject;
@property (nonatomic, copy, nullable) RCTPromiseResolveBlock pendingExportResolve;
@property (nonatomic, copy, nullable) RCTPromiseRejectBlock pendingExportReject;
@property (nonatomic, strong, nullable) NSURL *pendingExportTemporaryURL;
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
  BOOL imageSupported = reason.length == 0;
  BOOL cameraSupported = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo] != nil;
  NSString *scannerReason = @"";

  if (!cameraSupported && !imageSupported) {
    scannerReason = @"QR scanning is not supported on this device.";
  } else if (!cameraSupported) {
    scannerReason = @"Camera scanning is not supported on this device.";
  } else if (!imageSupported) {
    scannerReason = reason;
  }

  return @{
    @"isSupported": @(imageSupported),
    @"reason": reason,
    @"scannerCameraSupported": @(cameraSupported),
    @"scannerImageSupported": @(imageSupported),
    @"scannerReason": scannerReason,
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

  if ([self hasPendingRequest]) {
    reject(@"busy", @"Another file picker request is already in progress.", nil);
    return;
  }

  self.pendingResolve = resolve;
  self.pendingReject = reject;
  self.pendingPickerMode = @"file";
  [self presentPicker];
}

RCT_EXPORT_METHOD(scanImage:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *unavailableReason = [self unavailableReason];
  if (unavailableReason.length > 0) {
    reject(@"unsupported", unavailableReason, nil);
    return;
  }

  if ([self hasPendingRequest]) {
    reject(@"busy", @"Another scanner request is already in progress.", nil);
    return;
  }

  self.pendingResolve = resolve;
  self.pendingReject = reject;
  self.pendingPickerMode = @"scanImage";
  [self presentPicker];
}

RCT_EXPORT_METHOD(scan:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if ([self hasPendingRequest]) {
    reject(@"busy", @"Another scanner request is already in progress.", nil);
    return;
  }

  AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
  if (device == nil) {
    reject(@"camera_unavailable", @"Camera is unavailable on this device.", nil);
    return;
  }

  AVAuthorizationStatus status = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
  if (status == AVAuthorizationStatusDenied || status == AVAuthorizationStatusRestricted) {
    reject(@"permission_denied", @"Camera permission was denied.", nil);
    return;
  }

  self.pendingScanResolve = resolve;
  self.pendingScanReject = reject;

  if (status == AVAuthorizationStatusNotDetermined) {
    [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo completionHandler:^(BOOL granted) {
      dispatch_async(dispatch_get_main_queue(), ^{
        if (!granted) {
          [self rejectPendingScanWithCode:@"permission_denied" message:@"Camera permission was denied." error:nil];
          return;
        }

        [self presentScannerViewController];
      });
    }];
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    [self presentScannerViewController];
  });
}

RCT_EXPORT_METHOD(saveImage:(NSString *)filename
                  base64:(NSString *)base64
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (self.pendingSaveResolve != nil || self.pendingSaveReject != nil) {
    reject(@"busy", @"Another save request is already in progress.", nil);
    return;
  }

  NSData *imageData = [[NSData alloc] initWithBase64EncodedString:base64 options:NSDataBase64DecodingIgnoreUnknownCharacters];
  if (imageData == nil) {
    reject(@"invalid_image", @"Failed to decode image data.", nil);
    return;
  }

  self.pendingSaveResolve = resolve;
  self.pendingSaveReject = reject;

  void (^performSave)(void) = ^{
    [[PHPhotoLibrary sharedPhotoLibrary] performChanges:^{
      PHAssetCreationRequest *request = [PHAssetCreationRequest creationRequestForAsset];
      PHAssetResourceCreationOptions *options = [[PHAssetResourceCreationOptions alloc] init];
      options.originalFilename = filename.length > 0 ? filename : @"receive-qr.png";
      [request addResourceWithType:PHAssetResourceTypePhoto data:imageData options:options];
    } completionHandler:^(BOOL success, NSError * _Nullable error) {
      dispatch_async(dispatch_get_main_queue(), ^{
        if (success) {
          [self resolvePendingSave];
          return;
        }

        [self rejectPendingSaveWithCode:@"save_failed"
                                message:error.localizedDescription ?: @"Failed to save image."
                                  error:error];
      });
    }];
  };

  PHAuthorizationStatus status;
  if (@available(iOS 14, *)) {
    status = [PHPhotoLibrary authorizationStatusForAccessLevel:PHAccessLevelAddOnly];
  } else {
    status = [PHPhotoLibrary authorizationStatus];
  }

  if (status == PHAuthorizationStatusAuthorized || status == PHAuthorizationStatusLimited) {
    performSave();
    return;
  }

  if (status == PHAuthorizationStatusDenied || status == PHAuthorizationStatusRestricted) {
    [self rejectPendingSaveWithCode:@"permission_denied" message:@"Photo permission was denied." error:nil];
    return;
  }

  if (@available(iOS 14, *)) {
    [PHPhotoLibrary requestAuthorizationForAccessLevel:PHAccessLevelAddOnly handler:^(PHAuthorizationStatus authorizationStatus) {
      dispatch_async(dispatch_get_main_queue(), ^{
        if (authorizationStatus == PHAuthorizationStatusAuthorized || authorizationStatus == PHAuthorizationStatusLimited) {
          performSave();
          return;
        }

        [self rejectPendingSaveWithCode:@"permission_denied" message:@"Photo permission was denied." error:nil];
      });
    }];
    return;
  }

  [PHPhotoLibrary requestAuthorization:^(PHAuthorizationStatus authorizationStatus) {
    dispatch_async(dispatch_get_main_queue(), ^{
      if (authorizationStatus == PHAuthorizationStatusAuthorized) {
        performSave();
        return;
      }

      [self rejectPendingSaveWithCode:@"permission_denied" message:@"Photo permission was denied." error:nil];
    });
  }];
}

RCT_EXPORT_METHOD(exportFile:(NSString *)filename
                  base64:(NSString *)base64
                  mimeType:(NSString *)mimeType
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (self.pendingExportResolve != nil || self.pendingExportReject != nil) {
    reject(@"busy", @"Another export request is already in progress.", nil);
    return;
  }

  NSData *fileData = [[NSData alloc] initWithBase64EncodedString:base64 options:NSDataBase64DecodingIgnoreUnknownCharacters];
  if (fileData == nil) {
    reject(@"invalid_file", @"Failed to decode file data.", nil);
    return;
  }

  NSString *safeFilename = filename.length > 0 ? filename : @"cpcash-export.txt";
  NSString *temporaryFilename = [NSString stringWithFormat:@"%@-%@", NSUUID.UUID.UUIDString, safeFilename];
  NSURL *temporaryURL = [NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:temporaryFilename]];

  NSError *writeError = nil;
  if (![fileData writeToURL:temporaryURL options:NSDataWritingAtomic error:&writeError]) {
    reject(@"export_failed", writeError.localizedDescription ?: @"Failed to prepare export file.", writeError);
    return;
  }

  self.pendingExportResolve = resolve;
  self.pendingExportReject = reject;
  self.pendingExportTemporaryURL = temporaryURL;

  dispatch_async(dispatch_get_main_queue(), ^{
    UIViewController *presented = RCTPresentedViewController();
    if (presented == nil) {
      [self rejectPendingExportWithCode:@"activity_unavailable" message:@"Unable to present export sheet." error:nil];
      return;
    }

    (void)mimeType;
    UIActivityViewController *activityViewController = [[UIActivityViewController alloc] initWithActivityItems:@[temporaryURL] applicationActivities:nil];
    activityViewController.completionWithItemsHandler = ^(UIActivityType _Nullable activityType, BOOL completed, NSArray * _Nullable returnedItems, NSError * _Nullable activityError) {
      (void)activityType;
      (void)returnedItems;
      dispatch_async(dispatch_get_main_queue(), ^{
        if (activityError != nil) {
          [self rejectPendingExportWithCode:@"export_failed"
                                    message:activityError.localizedDescription ?: @"Failed to export file."
                                      error:activityError];
          return;
        }

        if (!completed) {
          [self rejectPendingExportWithCode:@"cancelled" message:@"User cancelled file export." error:nil];
          return;
        }

        [self resolvePendingExport];
      });
    };

    UIPopoverPresentationController *popover = activityViewController.popoverPresentationController;
    if (popover != nil) {
      popover.sourceView = presented.view;
      popover.sourceRect = CGRectMake(CGRectGetMidX(presented.view.bounds), CGRectGetMaxY(presented.view.bounds) - 1.0, 1.0, 1.0);
      popover.permittedArrowDirections = 0;
    }

    [presented presentViewController:activityViewController animated:YES completion:nil];
  });
}

- (BOOL)hasPendingRequest
{
  return self.pendingResolve != nil || self.pendingReject != nil || self.pendingScanResolve != nil || self.pendingScanReject != nil;
}

- (void)presentPicker
{
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

- (void)presentScannerViewController
{
  UIViewController *presented = RCTPresentedViewController();
  if (presented == nil) {
    [self rejectPendingScanWithCode:@"activity_unavailable" message:@"Unable to present QR scanner." error:nil];
    return;
  }

  CPCashCameraScannerViewController *scannerViewController = [[CPCashCameraScannerViewController alloc] init];
  __weak CPCashFilePicker *weakSelf = self;
  scannerViewController.onDetect = ^(NSString *value) {
    [weakSelf resolvePendingScanWithValue:value];
  };
  scannerViewController.onFinish = ^(NSString *code, NSString *message, NSError * _Nullable error) {
    [weakSelf rejectPendingScanWithCode:code message:message error:error];
  };
  [presented presentViewController:scannerViewController animated:YES completion:nil];
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

    if ([self.pendingPickerMode isEqualToString:@"scanImage"]) {
      [self detectQRCodeFromFileURL:url completion:^(NSDictionary * _Nullable payload, NSString * _Nullable code, NSString * _Nullable message, NSError * _Nullable detectError) {
        if (payload != nil) {
          [self resolvePendingWithPayload:payload];
          return;
        }

        [self rejectPendingWithCode:code ?: @"image_parse_failed"
                            message:message ?: @"Failed to parse QR code from the selected image."
                              error:detectError];
      }];
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

- (void)detectQRCodeFromFileURL:(NSURL *)url
                     completion:(void (^)(NSDictionary * _Nullable payload, NSString * _Nullable code, NSString * _Nullable message, NSError * _Nullable error))completion
{
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    CIImage *image = [CIImage imageWithContentsOfURL:url];
    if (image == nil) {
      dispatch_async(dispatch_get_main_queue(), ^{
        completion(nil, @"image_parse_failed", @"Failed to load the selected image.", nil);
      });
      return;
    }

    CIDetector *detector = [CIDetector detectorOfType:CIDetectorTypeQRCode
                                              context:nil
                                              options:@{CIDetectorAccuracy: CIDetectorAccuracyHigh}];
    NSArray<CIFeature *> *features = [detector featuresInImage:image];
    NSMutableOrderedSet<NSString *> *values = [[NSMutableOrderedSet alloc] init];

    for (CIFeature *feature in features) {
      if (![feature isKindOfClass:[CIQRCodeFeature class]]) {
        continue;
      }

      NSString *message = ((CIQRCodeFeature *)feature).messageString;
      if (message.length > 0) {
        [values addObject:message];
      }
    }

    dispatch_async(dispatch_get_main_queue(), ^{
      if (values.count == 0) {
        completion(nil, @"no_code", @"No QR code was found in the selected image.", nil);
        return;
      }

      if (values.count > 1) {
        completion(nil, @"multiple_codes", @"Multiple QR codes were found in the selected image.", nil);
        return;
      }

      completion(@{ @"value": values.firstObject }, nil, nil, nil);
    });
  });
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
  self.pendingPickerMode = nil;
}

- (void)resolvePendingScanWithValue:(NSString *)value
{
  RCTPromiseResolveBlock resolve = self.pendingScanResolve;
  [self clearPendingScanCallbacks];

  if (resolve == nil) {
    return;
  }

  resolve(@{ @"value": value });
}

- (void)rejectPendingScanWithCode:(NSString *)code
                          message:(NSString *)message
                            error:(NSError * _Nullable)error
{
  RCTPromiseRejectBlock reject = self.pendingScanReject;
  [self clearPendingScanCallbacks];

  if (reject == nil) {
    return;
  }

  reject(code, message, error);
}

- (void)clearPendingScanCallbacks
{
  self.pendingScanResolve = nil;
  self.pendingScanReject = nil;
}

- (void)resolvePendingSave
{
  RCTPromiseResolveBlock resolve = self.pendingSaveResolve;
  [self clearPendingSaveCallbacks];

  if (resolve == nil) {
    return;
  }

  resolve(nil);
}

- (void)rejectPendingSaveWithCode:(NSString *)code
                          message:(NSString *)message
                            error:(NSError * _Nullable)error
{
  RCTPromiseRejectBlock reject = self.pendingSaveReject;
  [self clearPendingSaveCallbacks];

  if (reject == nil) {
    return;
  }

  reject(code, message, error);
}

- (void)clearPendingSaveCallbacks
{
  self.pendingSaveResolve = nil;
  self.pendingSaveReject = nil;
}

- (void)resolvePendingExport
{
  RCTPromiseResolveBlock resolve = self.pendingExportResolve;
  [self clearPendingExportCallbacks];

  if (resolve == nil) {
    return;
  }

  resolve(nil);
}

- (void)rejectPendingExportWithCode:(NSString *)code
                            message:(NSString *)message
                              error:(NSError * _Nullable)error
{
  RCTPromiseRejectBlock reject = self.pendingExportReject;
  [self clearPendingExportCallbacks];

  if (reject == nil) {
    return;
  }

  reject(code, message, error);
}

- (void)clearPendingExportCallbacks
{
  NSURL *temporaryURL = self.pendingExportTemporaryURL;
  self.pendingExportResolve = nil;
  self.pendingExportReject = nil;
  self.pendingExportTemporaryURL = nil;

  if (temporaryURL != nil) {
    [[NSFileManager defaultManager] removeItemAtURL:temporaryURL error:nil];
  }
}

- (NSString *)unavailableReason
{
  if (@available(iOS 14.0, *)) {
    return @"";
  }

  return CPCashFilePickerUnsupportedReason;
}

@end
