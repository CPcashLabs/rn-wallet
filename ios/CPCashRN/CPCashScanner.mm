#import <AVFoundation/AVFoundation.h>
#import <CoreImage/CoreImage.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>
#import <UIKit/UIKit.h>
#import <Vision/Vision.h>
#import <ImageIO/ImageIO.h>

static NSString *const CPCashScannerErrorDomain = @"CPCashScannerErrorDomain";

static NSString *CPCashScannerTrimmedString(NSString *value) {
  return [value stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
}

static BOOL CPCashScannerCameraSupported(void) {
  return [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo] != nil;
}

static BOOL CPCashScannerImageSupported(void) {
  return [UIImagePickerController isSourceTypeAvailable:UIImagePickerControllerSourceTypePhotoLibrary];
}

static NSString *CPCashScannerLocalized(NSString *zhHans, NSString *english) {
  NSString *language = [[[NSLocale preferredLanguages] firstObject] lowercaseString];
  if ([language hasPrefix:@"zh"]) {
    return zhHans;
  }

  return english;
}

static NSString *CPCashScannerCameraReason(void) {
  if (!CPCashScannerCameraSupported() && !CPCashScannerImageSupported()) {
    return @"QR scanning is not supported on this device.";
  }

  if (!CPCashScannerCameraSupported()) {
    return @"Camera scanning is not available on this device.";
  }

  if (!CPCashScannerImageSupported()) {
    return @"Image QR recognition is not available on this device.";
  }

  return @"";
}

static NSString *CPCashScannerPickerReason(void) {
  if (!CPCashScannerImageSupported() && !CPCashScannerCameraSupported()) {
    return @"QR scanning is not supported on this device.";
  }

  if (!CPCashScannerImageSupported()) {
    return @"Image QR recognition is not available on this device.";
  }

  if (!CPCashScannerCameraSupported()) {
    return @"Camera scanning is not available on this device.";
  }

  return @"";
}

static CGImagePropertyOrientation CPCashScannerExifOrientation(UIImageOrientation orientation) {
  switch (orientation) {
    case UIImageOrientationUp:
      return kCGImagePropertyOrientationUp;
    case UIImageOrientationDown:
      return kCGImagePropertyOrientationDown;
    case UIImageOrientationLeft:
      return kCGImagePropertyOrientationLeft;
    case UIImageOrientationRight:
      return kCGImagePropertyOrientationRight;
    case UIImageOrientationUpMirrored:
      return kCGImagePropertyOrientationUpMirrored;
    case UIImageOrientationDownMirrored:
      return kCGImagePropertyOrientationDownMirrored;
    case UIImageOrientationLeftMirrored:
      return kCGImagePropertyOrientationLeftMirrored;
    case UIImageOrientationRightMirrored:
      return kCGImagePropertyOrientationRightMirrored;
  }

  return kCGImagePropertyOrientationUp;
}

typedef void (^CPCashScannerImageDetectionCompletion)(NSArray<NSString *> *_Nullable values, NSError *_Nullable error);

static void CPCashScannerDetectQrValues(UIImage *image, CPCashScannerImageDetectionCompletion completion) {
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    CGImageRef cgImage = image.CGImage;
    CIImage *temporaryCiImage = nil;

    if (cgImage == nil && image.CIImage != nil) {
      temporaryCiImage = image.CIImage;
      CIContext *context = [CIContext contextWithOptions:nil];
      cgImage = [context createCGImage:temporaryCiImage fromRect:temporaryCiImage.extent];
    }

    if (cgImage == nil) {
      NSError *error = [NSError errorWithDomain:CPCashScannerErrorDomain
                                           code:1001
                                       userInfo:@{NSLocalizedDescriptionKey : @"Selected image could not be parsed."}];
      dispatch_async(dispatch_get_main_queue(), ^{
        completion(nil, error);
      });
      return;
    }

    VNDetectBarcodesRequest *request = [[VNDetectBarcodesRequest alloc] init];
    request.symbologies = @[ VNBarcodeSymbologyQR ];

    NSError *error = nil;
    VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:cgImage
                                                                        orientation:CPCashScannerExifOrientation(image.imageOrientation)
                                                                            options:@{}];
    BOOL success = [handler performRequests:@[ request ] error:&error];

    if (temporaryCiImage != nil && cgImage != nil) {
      CGImageRelease(cgImage);
    }

    if (!success || error != nil) {
      dispatch_async(dispatch_get_main_queue(), ^{
        completion(nil, error ?: [NSError errorWithDomain:CPCashScannerErrorDomain
                                                     code:1002
                                                 userInfo:@{NSLocalizedDescriptionKey : @"Selected image could not be parsed."}]);
      });
      return;
    }

    NSMutableOrderedSet<NSString *> *values = [NSMutableOrderedSet orderedSet];
    for (VNBarcodeObservation *observation in request.results) {
      NSString *value = CPCashScannerTrimmedString(observation.payloadStringValue ?: @"");
      if (value.length > 0) {
        [values addObject:value];
      }
    }

    dispatch_async(dispatch_get_main_queue(), ^{
      completion(values.array, nil);
    });
  });
}

@protocol CPCashScannerCameraViewControllerDelegate;

@interface CPCashScannerCameraViewController
    : UIViewController <AVCaptureMetadataOutputObjectsDelegate, UIImagePickerControllerDelegate, UINavigationControllerDelegate>

@property(nonatomic, weak) id<CPCashScannerCameraViewControllerDelegate> delegate;

@end

@protocol CPCashScannerCameraViewControllerDelegate <NSObject>

- (void)scannerCameraViewControllerDidCancel:(CPCashScannerCameraViewController *)controller;
- (void)scannerCameraViewController:(CPCashScannerCameraViewController *)controller didScanValue:(NSString *)value;
- (void)scannerCameraViewController:(CPCashScannerCameraViewController *)controller didFailWithCode:(NSString *)code message:(NSString *)message;

@end

@interface CPCashScannerCameraViewController ()

@property(nonatomic, strong) AVCaptureSession *captureSession;
@property(nonatomic, strong) AVCaptureVideoPreviewLayer *previewLayer;
@property(nonatomic, strong) dispatch_queue_t sessionQueue;
@property(nonatomic, strong) UIButton *closeButton;
@property(nonatomic, strong) UIButton *photoButton;
@property(nonatomic, strong) UILabel *hintLabel;
@property(nonatomic, strong) UIView *scanFrameView;
@property(nonatomic, assign) BOOL finished;
@property(nonatomic, assign) BOOL isPickerPresented;

@end

@implementation CPCashScannerCameraViewController

- (instancetype)init {
  self = [super initWithNibName:nil bundle:nil];
  if (self != nil) {
    _sessionQueue = dispatch_queue_create("com.cpcashrn.scanner.camera", DISPATCH_QUEUE_SERIAL);
    self.modalPresentationStyle = UIModalPresentationFullScreen;
  }

  return self;
}

- (BOOL)prefersStatusBarHidden {
  return YES;
}

- (UIInterfaceOrientationMask)supportedInterfaceOrientations {
  return UIInterfaceOrientationMaskPortrait;
}

- (void)viewDidLoad {
  [super viewDidLoad];

  self.view.backgroundColor = [UIColor blackColor];
  [self setupScannerView];
  [self setupCaptureSession];
}

- (void)viewDidAppear:(BOOL)animated {
  [super viewDidAppear:animated];
  [self startCaptureSessionIfNeeded];
}

- (void)viewDidDisappear:(BOOL)animated {
  [super viewDidDisappear:animated];

  if (self.isBeingDismissed || self.isMovingFromParentViewController) {
    [self stopCaptureSession];
  }
}

- (void)viewDidLayoutSubviews {
  [super viewDidLayoutSubviews];

  self.previewLayer.frame = self.view.bounds;

  UIEdgeInsets safeAreaInsets = self.view.safeAreaInsets;
  CGFloat width = CGRectGetWidth(self.view.bounds);
  CGFloat height = CGRectGetHeight(self.view.bounds);
  CGFloat frameSize = MIN(width - 56.0, 280.0);
  CGFloat frameX = (width - frameSize) / 2.0;
  CGFloat frameY = MAX(safeAreaInsets.top + 84.0, (height - frameSize) / 2.0 - 72.0);
  self.scanFrameView.frame = CGRectMake(frameX, frameY, frameSize, frameSize);

  CGSize closeSize = [self.closeButton sizeThatFits:CGSizeMake(CGFLOAT_MAX, 44.0)];
  self.closeButton.frame = CGRectMake(20.0,
                                      safeAreaInsets.top + 12.0,
                                      MAX(closeSize.width + 28.0, 84.0),
                                      40.0);

  CGSize photoSize = [self.photoButton sizeThatFits:CGSizeMake(CGFLOAT_MAX, 48.0)];
  CGFloat photoWidth = MAX(photoSize.width + 36.0, 136.0);
  self.photoButton.frame = CGRectMake((width - photoWidth) / 2.0,
                                      height - safeAreaInsets.bottom - 92.0,
                                      photoWidth,
                                      48.0);

  CGFloat hintWidth = width - 48.0;
  self.hintLabel.frame = CGRectMake(24.0,
                                    CGRectGetMaxY(self.scanFrameView.frame) + 20.0,
                                    hintWidth,
                                    44.0);
}

- (void)setupScannerView {
  self.scanFrameView = [[UIView alloc] initWithFrame:CGRectZero];
  self.scanFrameView.layer.borderColor = [UIColor colorWithWhite:1.0 alpha:0.88].CGColor;
  self.scanFrameView.layer.borderWidth = 2.0;
  self.scanFrameView.layer.cornerRadius = 24.0;
  self.scanFrameView.backgroundColor = [UIColor clearColor];
  self.scanFrameView.userInteractionEnabled = NO;
  [self.view addSubview:self.scanFrameView];

  self.hintLabel = [[UILabel alloc] initWithFrame:CGRectZero];
  self.hintLabel.text = CPCashScannerLocalized(@"将二维码放入框内，或点下方从图片识别", @"Place the QR code inside the frame or scan from a photo.");
  self.hintLabel.textAlignment = NSTextAlignmentCenter;
  self.hintLabel.textColor = [UIColor colorWithWhite:1.0 alpha:0.88];
  self.hintLabel.numberOfLines = 2;
  self.hintLabel.font = [UIFont systemFontOfSize:15.0 weight:UIFontWeightMedium];
  [self.view addSubview:self.hintLabel];

  self.closeButton = [self makePillButtonWithTitle:CPCashScannerLocalized(@"关闭", @"Close")];
  [self.closeButton addTarget:self action:@selector(handleClose) forControlEvents:UIControlEventTouchUpInside];
  [self.view addSubview:self.closeButton];

  self.photoButton = [self makePrimaryButtonWithTitle:CPCashScannerLocalized(@"识别图片", @"Scan Image")];
  [self.photoButton addTarget:self action:@selector(handlePhoto) forControlEvents:UIControlEventTouchUpInside];
  [self.view addSubview:self.photoButton];
}

- (UIButton *)makePillButtonWithTitle:(NSString *)title {
  UIButton *button = [UIButton buttonWithType:UIButtonTypeSystem];
  [button setTitle:title forState:UIControlStateNormal];
  [button setTitleColor:[UIColor whiteColor] forState:UIControlStateNormal];
  button.backgroundColor = [UIColor colorWithWhite:0.08 alpha:0.52];
  button.layer.cornerRadius = 20.0;
  button.contentEdgeInsets = UIEdgeInsetsMake(10.0, 14.0, 10.0, 14.0);
  button.titleLabel.font = [UIFont systemFontOfSize:15.0 weight:UIFontWeightSemibold];
  return button;
}

- (UIButton *)makePrimaryButtonWithTitle:(NSString *)title {
  UIButton *button = [UIButton buttonWithType:UIButtonTypeSystem];
  [button setTitle:title forState:UIControlStateNormal];
  [button setTitleColor:[UIColor blackColor] forState:UIControlStateNormal];
  button.backgroundColor = [UIColor whiteColor];
  button.layer.cornerRadius = 24.0;
  button.contentEdgeInsets = UIEdgeInsetsMake(12.0, 18.0, 12.0, 18.0);
  button.titleLabel.font = [UIFont systemFontOfSize:16.0 weight:UIFontWeightSemibold];
  return button;
}

- (void)setupCaptureSession {
  AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
  if (device == nil) {
    [self.delegate scannerCameraViewController:self didFailWithCode:@"unsupported" message:@"Camera scanning is not available on this device."];
    return;
  }

  AVCaptureSession *session = [[AVCaptureSession alloc] init];
  session.sessionPreset = AVCaptureSessionPresetHigh;

  NSError *inputError = nil;
  AVCaptureDeviceInput *input = [AVCaptureDeviceInput deviceInputWithDevice:device error:&inputError];
  if (input == nil || inputError != nil || ![session canAddInput:input]) {
    [self.delegate scannerCameraViewController:self
                               didFailWithCode:@"scan_failed"
                                       message:inputError.localizedDescription ?: @"Failed to configure camera input."];
    return;
  }
  [session addInput:input];

  AVCaptureMetadataOutput *output = [[AVCaptureMetadataOutput alloc] init];
  if (![session canAddOutput:output]) {
    [self.delegate scannerCameraViewController:self didFailWithCode:@"scan_failed" message:@"Failed to configure camera output."];
    return;
  }

  [session addOutput:output];
  output.metadataObjectTypes = @[ AVMetadataObjectTypeQRCode ];
  [output setMetadataObjectsDelegate:self queue:dispatch_get_main_queue()];

  self.captureSession = session;
  self.previewLayer = [AVCaptureVideoPreviewLayer layerWithSession:session];
  self.previewLayer.videoGravity = AVLayerVideoGravityResizeAspectFill;
  [self.view.layer insertSublayer:self.previewLayer atIndex:0];
}

- (void)startCaptureSessionIfNeeded {
  if (self.finished || self.isPickerPresented || self.captureSession == nil || self.captureSession.isRunning) {
    return;
  }

  dispatch_async(self.sessionQueue, ^{
    [self.captureSession startRunning];
  });
}

- (void)stopCaptureSession {
  if (self.captureSession == nil || !self.captureSession.isRunning) {
    return;
  }

  dispatch_async(self.sessionQueue, ^{
    [self.captureSession stopRunning];
  });
}

- (void)handleClose {
  if (self.finished) {
    return;
  }

  self.finished = YES;
  [self stopCaptureSession];
  [self dismissViewControllerAnimated:YES
                           completion:^{
                             [self.delegate scannerCameraViewControllerDidCancel:self];
                           }];
}

- (void)handlePhoto {
  if (self.finished) {
    return;
  }

  if (!CPCashScannerImageSupported()) {
    [self presentAlertWithMessage:CPCashScannerLocalized(@"当前设备暂不支持从图片识别二维码。", @"Image QR recognition is not available on this device.")
                        completion:nil];
    return;
  }

  self.isPickerPresented = YES;
  [self stopCaptureSession];

  UIImagePickerController *picker = [[UIImagePickerController alloc] init];
  picker.sourceType = UIImagePickerControllerSourceTypePhotoLibrary;
  picker.delegate = self;
  picker.modalPresentationStyle = UIModalPresentationFullScreen;
  [self presentViewController:picker animated:YES completion:nil];
}

- (void)finishWithScannedValue:(NSString *)value {
  NSString *trimmedValue = CPCashScannerTrimmedString(value);
  if (trimmedValue.length == 0 || self.finished) {
    return;
  }

  self.finished = YES;
  [self stopCaptureSession];
  [self dismissViewControllerAnimated:YES
                           completion:^{
                             [self.delegate scannerCameraViewController:self didScanValue:trimmedValue];
                           }];
}

- (void)captureOutput:(AVCaptureOutput *)output
    didOutputMetadataObjects:(NSArray<__kindof AVMetadataObject *> *)metadataObjects
               fromConnection:(AVCaptureConnection *)connection {
  if (self.finished) {
    return;
  }

  for (AVMetadataObject *object in metadataObjects) {
    if (![object isKindOfClass:[AVMetadataMachineReadableCodeObject class]]) {
      continue;
    }

    AVMetadataMachineReadableCodeObject *codeObject = (AVMetadataMachineReadableCodeObject *)object;
    NSString *value = CPCashScannerTrimmedString(codeObject.stringValue ?: @"");
    if (value.length > 0) {
      [self finishWithScannedValue:value];
      return;
    }
  }
}

- (void)imagePickerControllerDidCancel:(UIImagePickerController *)picker {
  [picker dismissViewControllerAnimated:YES
                             completion:^{
                               self.isPickerPresented = NO;
                               [self startCaptureSessionIfNeeded];
                             }];
}

- (void)imagePickerController:(UIImagePickerController *)picker
didFinishPickingMediaWithInfo:(NSDictionary<UIImagePickerControllerInfoKey, id> *)info {
  UIImage *image = info[UIImagePickerControllerOriginalImage];
  [picker dismissViewControllerAnimated:YES
                             completion:^{
                               self.isPickerPresented = NO;

                               if (image == nil) {
                                 [self presentAlertWithMessage:CPCashScannerLocalized(@"所选图片解析失败。", @"The selected image could not be parsed.")
                                                     completion:^{
                                                       [self startCaptureSessionIfNeeded];
                                                     }];
                                 return;
                               }

                               CPCashScannerDetectQrValues(image, ^(NSArray<NSString *> *values, NSError *error) {
                                 if (error != nil) {
                                   [self presentAlertWithMessage:CPCashScannerLocalized(@"所选图片解析失败。", @"The selected image could not be parsed.")
                                                       completion:^{
                                                         [self startCaptureSessionIfNeeded];
                                                       }];
                                   return;
                                 }

                                 if (values.count == 0) {
                                   [self presentAlertWithMessage:CPCashScannerLocalized(@"所选图片中未识别到二维码。", @"No QR code was found in the selected image.")
                                                       completion:^{
                                                         [self startCaptureSessionIfNeeded];
                                                       }];
                                   return;
                                 }

                                 if (values.count > 1) {
                                   [self presentAlertWithMessage:CPCashScannerLocalized(@"检测到多个二维码，请只保留一个二维码后重试。", @"Multiple QR codes were found in the selected image.")
                                                       completion:^{
                                                         [self startCaptureSessionIfNeeded];
                                                       }];
                                   return;
                                 }

                                 [self finishWithScannedValue:values.firstObject];
                               });
                             }];
}

- (void)presentAlertWithMessage:(NSString *)message completion:(void (^_Nullable)(void))completion {
  UIAlertController *alertController = [UIAlertController alertControllerWithTitle:CPCashScannerLocalized(@"提示", @"Notice")
                                                                           message:message
                                                                    preferredStyle:UIAlertControllerStyleAlert];
  UIAlertAction *action = [UIAlertAction actionWithTitle:CPCashScannerLocalized(@"知道了", @"OK")
                                                   style:UIAlertActionStyleDefault
                                                 handler:^(__unused UIAlertAction *alertAction) {
                                                   if (completion != nil) {
                                                     completion();
                                                   }
                                                 }];
  [alertController addAction:action];
  [self presentViewController:alertController animated:YES completion:nil];
}

@end

@interface CPCashScanner : NSObject <RCTBridgeModule, UIImagePickerControllerDelegate, UINavigationControllerDelegate,
                                     CPCashScannerCameraViewControllerDelegate>

@property(nonatomic, copy) RCTPromiseResolveBlock pendingResolve;
@property(nonatomic, copy) RCTPromiseRejectBlock pendingReject;
@property(nonatomic, strong) UIImagePickerController *pendingImagePicker;
@property(nonatomic, strong) CPCashScannerCameraViewController *pendingCameraController;

@end

@implementation CPCashScanner

RCT_EXPORT_MODULE(CPCashScanner)

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (dispatch_queue_t)methodQueue {
  return dispatch_get_main_queue();
}

- (NSDictionary<NSString *, id> *)constantsToExport {
  return @{
    @"scannerCameraSupported" : @(CPCashScannerCameraSupported()),
    @"scannerImageSupported" : @(CPCashScannerImageSupported()),
    @"scannerReason" : CPCashScannerCameraSupported() ? CPCashScannerPickerReason() : CPCashScannerCameraReason(),
  };
}

- (BOOL)isBusy {
  return self.pendingResolve != nil || self.pendingReject != nil;
}

- (void)resetPendingState {
  self.pendingResolve = nil;
  self.pendingReject = nil;
  self.pendingImagePicker = nil;
  self.pendingCameraController = nil;
}

- (void)resolvePendingValue:(NSString *)value {
  RCTPromiseResolveBlock resolve = self.pendingResolve;
  [self resetPendingState];

  if (resolve == nil) {
    return;
  }

  resolve(@{@"value" : value});
}

- (void)rejectPendingWithCode:(NSString *)code message:(NSString *)message error:(NSError *)error {
  RCTPromiseRejectBlock reject = self.pendingReject;
  [self resetPendingState];

  if (reject == nil) {
    return;
  }

  reject(code, message, error);
}

- (UIViewController *)presentingController {
  return RCTPresentedViewController();
}

- (void)requestCameraAccess:(void (^)(BOOL granted))completion {
  AVAuthorizationStatus status = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
  if (status == AVAuthorizationStatusAuthorized) {
    completion(YES);
    return;
  }

  if (status == AVAuthorizationStatusNotDetermined) {
    [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo
                             completionHandler:^(BOOL granted) {
                               dispatch_async(dispatch_get_main_queue(), ^{
                                 completion(granted);
                               });
                             }];
    return;
  }

  completion(NO);
}

RCT_EXPORT_METHOD(scan:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  if ([self isBusy]) {
    reject(@"busy", @"Another scanner request is already in progress.", nil);
    return;
  }

  if (!CPCashScannerCameraSupported()) {
    reject(@"unsupported", @"Camera scanning is not available on this device.", nil);
    return;
  }

  UIViewController *presenter = [self presentingController];
  if (presenter == nil) {
    reject(@"activity_unavailable", @"Activity is not available.", nil);
    return;
  }

  [self requestCameraAccess:^(BOOL granted) {
    if (!granted) {
      reject(@"permission_denied", @"Camera permission was denied.", nil);
      return;
    }

    if ([self isBusy]) {
      reject(@"busy", @"Another scanner request is already in progress.", nil);
      return;
    }

    self.pendingResolve = resolve;
    self.pendingReject = reject;

    CPCashScannerCameraViewController *controller = [[CPCashScannerCameraViewController alloc] init];
    controller.delegate = self;
    self.pendingCameraController = controller;
    [presenter presentViewController:controller animated:YES completion:nil];
  }];
}

RCT_EXPORT_METHOD(scanImage:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  if ([self isBusy]) {
    reject(@"busy", @"Another scanner request is already in progress.", nil);
    return;
  }

  if (!CPCashScannerImageSupported()) {
    reject(@"unsupported", @"Image QR recognition is not available on this device.", nil);
    return;
  }

  UIViewController *presenter = [self presentingController];
  if (presenter == nil) {
    reject(@"activity_unavailable", @"Activity is not available.", nil);
    return;
  }

  self.pendingResolve = resolve;
  self.pendingReject = reject;

  UIImagePickerController *picker = [[UIImagePickerController alloc] init];
  picker.sourceType = UIImagePickerControllerSourceTypePhotoLibrary;
  picker.delegate = self;
  picker.modalPresentationStyle = UIModalPresentationFullScreen;
  self.pendingImagePicker = picker;
  [presenter presentViewController:picker animated:YES completion:nil];
}

- (void)imagePickerControllerDidCancel:(UIImagePickerController *)picker {
  [picker dismissViewControllerAnimated:YES
                             completion:^{
                               [self rejectPendingWithCode:@"cancelled" message:@"User cancelled image selection." error:nil];
                             }];
}

- (void)imagePickerController:(UIImagePickerController *)picker
didFinishPickingMediaWithInfo:(NSDictionary<UIImagePickerControllerInfoKey, id> *)info {
  UIImage *image = info[UIImagePickerControllerOriginalImage];
  [picker dismissViewControllerAnimated:YES
                             completion:^{
                               if (image == nil) {
                                 [self rejectPendingWithCode:@"image_parse_failed"
                                                    message:@"Selected image could not be parsed."
                                                      error:nil];
                                 return;
                               }

                               CPCashScannerDetectQrValues(image, ^(NSArray<NSString *> *values, NSError *error) {
                                 if (error != nil) {
                                   [self rejectPendingWithCode:@"image_parse_failed"
                                                      message:error.localizedDescription ?: @"Selected image could not be parsed."
                                                        error:error];
                                   return;
                                 }

                                 if (values.count == 0) {
                                   [self rejectPendingWithCode:@"no_code" message:@"No QR code was found in the selected image." error:nil];
                                   return;
                                 }

                                 if (values.count > 1) {
                                   [self rejectPendingWithCode:@"multiple_codes"
                                                      message:@"Multiple QR codes were found in the selected image."
                                                        error:nil];
                                   return;
                                 }

                                 [self resolvePendingValue:values.firstObject];
                               });
                             }];
}

- (void)scannerCameraViewControllerDidCancel:(__unused CPCashScannerCameraViewController *)controller {
  [self rejectPendingWithCode:@"cancelled" message:@"User cancelled QR scan." error:nil];
}

- (void)scannerCameraViewController:(__unused CPCashScannerCameraViewController *)controller didScanValue:(NSString *)value {
  [self resolvePendingValue:value];
}

- (void)scannerCameraViewController:(__unused CPCashScannerCameraViewController *)controller
                    didFailWithCode:(NSString *)code
                            message:(NSString *)message {
  if (self.pendingCameraController.presentingViewController != nil) {
    [self.pendingCameraController dismissViewControllerAnimated:YES
                                                     completion:^{
                                                       [self rejectPendingWithCode:code message:message error:nil];
                                                     }];
    return;
  }

  [self rejectPendingWithCode:code message:message error:nil];
}

@end
