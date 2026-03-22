#import "AppDelegate.h"

#import "RCTAppDependencyProvider.h"
#import "RCTAppSetupUtils.h"
#import <React/RCTBundleURLProvider.h>
#import <React/RCTBridge.h>
#import <React/RCTRootView.h>
#import <React/RCTLinkingManager.h>
#if __has_include(<React-RCTAppDelegate/RCTReactNativeFactory.h>)
#import <React-RCTAppDelegate/RCTReactNativeFactory.h>
#else
#import <React_RCTAppDelegate/RCTReactNativeFactory.h>
#endif
#if USE_THIRD_PARTY_JSC != 1
#import <React/RCTHermesInstanceFactory.h>
#endif

@interface AppDelegate ()

@property (nonatomic, strong) UIWindow *window;
@property (nonatomic, strong) id<RCTDependencyProvider> dependencyProvider;
@property (nonatomic, strong) RCTReactNativeFactory *reactNativeFactory;

@end

@implementation AppDelegate {
  UIWindow *_window;
  id<RCTDependencyProvider> _dependencyProvider;
  RCTReactNativeFactory *_reactNativeFactory;
}

@synthesize window = _window;
@synthesize dependencyProvider = _dependencyProvider;
@synthesize reactNativeFactory = _reactNativeFactory;

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"CPCashRN";
  self.dependencyProvider = [RCTAppDependencyProvider new];
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};
  self.reactNativeFactory = [[RCTReactNativeFactory alloc] initWithDelegate:self];
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];

  [self.reactNativeFactory startReactNativeWithModuleName:self.moduleName
                                                inWindow:self.window
                                       initialProperties:self.initialProps
                                           launchOptions:launchOptions];

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@".expo/.virtual-metro-entry"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

- (RCTBridge *)createBridgeWithDelegate:(id<RCTBridgeDelegate>)delegate launchOptions:(NSDictionary *)launchOptions
{
  return [[RCTBridge alloc] initWithDelegate:delegate launchOptions:launchOptions];
}

- (UIView *)createRootViewWithBridge:(RCTBridge *)bridge
                          moduleName:(NSString *)moduleName
                           initProps:(NSDictionary *)initProps
{
  UIView *rootView = RCTAppSetupDefaultRootView(bridge, moduleName, initProps, RCTIsNewArchEnabled());
  rootView.backgroundColor = [UIColor systemBackgroundColor];
  return rootView;
}

- (UIViewController *)createRootViewController
{
  return [UIViewController new];
}

- (void)setRootView:(UIView *)rootView toRootViewController:(UIViewController *)rootViewController
{
  rootViewController.view = rootView;
}

- (RCTColorSpace)defaultColorSpace
{
  return RCTColorSpaceSRGB;
}

- (void)customizeRootView:(RCTRootView *)rootView
{
  rootView.backgroundColor = [UIColor systemBackgroundColor];
}

- (JSRuntimeFactoryRef)createJSRuntimeFactory
{
#if USE_THIRD_PARTY_JSC != 1
  return jsrt_create_hermes_factory();
#endif
}

- (BOOL)newArchEnabled
{
  return RCTIsNewArchEnabled();
}

- (BOOL)bridgelessEnabled
{
  return RCTIsNewArchEnabled();
}

- (BOOL)fabricEnabled
{
  return RCTIsNewArchEnabled();
}

- (BOOL)turboModuleEnabled
{
  return RCTIsNewArchEnabled();
}

- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
  return [RCTLinkingManager application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
}

@end
