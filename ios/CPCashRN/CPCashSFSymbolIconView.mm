#import <React/RCTConvert.h>
#import <React/RCTViewManager.h>
#import <UIKit/UIKit.h>

static UIImageSymbolWeight CPCashSFSymbolWeightFromString(NSString *weight) {
  NSString *normalized = [weight.lowercaseString stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];

  if ([normalized isEqualToString:@"ultralight"]) {
    return UIImageSymbolWeightUltraLight;
  }
  if ([normalized isEqualToString:@"thin"]) {
    return UIImageSymbolWeightThin;
  }
  if ([normalized isEqualToString:@"light"]) {
    return UIImageSymbolWeightLight;
  }
  if ([normalized isEqualToString:@"regular"]) {
    return UIImageSymbolWeightRegular;
  }
  if ([normalized isEqualToString:@"medium"]) {
    return UIImageSymbolWeightMedium;
  }
  if ([normalized isEqualToString:@"bold"]) {
    return UIImageSymbolWeightBold;
  }
  if ([normalized isEqualToString:@"heavy"]) {
    return UIImageSymbolWeightHeavy;
  }
  if ([normalized isEqualToString:@"black"]) {
    return UIImageSymbolWeightBlack;
  }

  return UIImageSymbolWeightSemibold;
}

static UIImageSymbolScale CPCashSFSymbolScaleFromString(NSString *scale) {
  NSString *normalized = [scale.lowercaseString stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];

  if ([normalized isEqualToString:@"small"]) {
    return UIImageSymbolScaleSmall;
  }
  if ([normalized isEqualToString:@"large"]) {
    return UIImageSymbolScaleLarge;
  }

  return UIImageSymbolScaleMedium;
}

@interface CPCashSFSymbolIconView : UIView

@property(nonatomic, copy) NSString *name;
@property(nonatomic, assign) CGFloat pointSize;
@property(nonatomic, copy) NSString *scale;
@property(nonatomic, strong) UIColor *symbolTintColor;
@property(nonatomic, copy) NSString *weight;

@end

@implementation CPCashSFSymbolIconView {
  UIImageView *_imageView;
}

- (instancetype)initWithFrame:(CGRect)frame {
  self = [super initWithFrame:frame];
  if (self != nil) {
    self.backgroundColor = UIColor.clearColor;
    self.userInteractionEnabled = NO;
    _pointSize = 24;
    _scale = @"medium";
    _weight = @"semibold";
    _symbolTintColor = UIColor.labelColor;
    _imageView = [[UIImageView alloc] initWithFrame:self.bounds];
    _imageView.contentMode = UIViewContentModeScaleAspectFit;
    _imageView.tintColor = _symbolTintColor;
    _imageView.backgroundColor = UIColor.clearColor;
    [self addSubview:_imageView];
  }

  return self;
}

- (void)layoutSubviews {
  [super layoutSubviews];
  _imageView.frame = self.bounds;
  [self updateImage];
}

- (void)setName:(NSString *)name {
  _name = [name copy];
  [self updateImage];
}

- (void)setPointSize:(CGFloat)pointSize {
  _pointSize = pointSize;
  [self updateImage];
}

- (void)setWeight:(NSString *)weight {
  _weight = [weight copy];
  [self updateImage];
}

- (void)setScale:(NSString *)scale {
  _scale = [scale copy];
  [self updateImage];
}

- (void)setSymbolTintColor:(UIColor *)symbolTintColor {
  _symbolTintColor = symbolTintColor;
  _imageView.tintColor = symbolTintColor ?: UIColor.labelColor;
}

- (void)updateImage {
  if (@available(iOS 13.0, *)) {
    NSString *symbolName = self.name.length > 0 ? self.name : @"questionmark.circle";
    CGFloat resolvedPointSize = self.pointSize > 0 ? self.pointSize : MIN(CGRectGetWidth(self.bounds), CGRectGetHeight(self.bounds));
    UIImageSymbolConfiguration *configuration = [UIImageSymbolConfiguration configurationWithPointSize:MAX(resolvedPointSize, 1)
                                                                                                weight:CPCashSFSymbolWeightFromString(self.weight)
                                                                                                 scale:CPCashSFSymbolScaleFromString(self.scale)];
    UIImage *image = [UIImage systemImageNamed:symbolName withConfiguration:configuration];
    if (image == nil) {
      image = [UIImage systemImageNamed:@"questionmark.circle" withConfiguration:configuration];
    }
    _imageView.image = [image imageWithRenderingMode:UIImageRenderingModeAlwaysTemplate];
    _imageView.tintColor = self.symbolTintColor ?: UIColor.labelColor;
    return;
  }

  _imageView.image = nil;
}

@end

@interface CPCashSFSymbolIconViewManager : RCTViewManager
@end

@implementation CPCashSFSymbolIconViewManager

RCT_EXPORT_MODULE(CPCashSFSymbolIconView)

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (UIView *)view {
  return [[CPCashSFSymbolIconView alloc] initWithFrame:CGRectZero];
}

RCT_EXPORT_VIEW_PROPERTY(name, NSString)
RCT_EXPORT_VIEW_PROPERTY(scale, NSString)
RCT_EXPORT_VIEW_PROPERTY(weight, NSString)

RCT_CUSTOM_VIEW_PROPERTY(pointSize, NSNumber, CPCashSFSymbolIconView) {
  view.pointSize = json != nil ? [RCTConvert CGFloat:json] : 24;
}

RCT_CUSTOM_VIEW_PROPERTY(tintColor, UIColor, CPCashSFSymbolIconView) {
  view.symbolTintColor = json != nil ? [RCTConvert UIColor:json] : UIColor.labelColor;
}

@end
