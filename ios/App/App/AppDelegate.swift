import UIKit
import Capacitor
import WebKit

/// CARD-RF. The bridge view controller, plus one thing: the strips of screen outside the web content (behind the status
/// bar and the home indicator; the web view is inset by the safe area) follow the page's own background. The page is
/// white for the drill timer and black for RUN, so the run screen is black edge to edge and the status bar's text turns
/// white on it. The page sends nothing: WebKit reports the colour behind the page (underPageBackgroundColor).
class MainViewController: CAPBridgeViewController {
    private var pageColorObservation: NSKeyValueObservation?

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let webView = self.webView else { return }
        pageColorObservation = webView.observe(\.underPageBackgroundColor, options: [.initial, .new]) { [weak self] webView, _ in
            DispatchQueue.main.async { self?.follow(webView.underPageBackgroundColor) }
        }
    }

    private func follow(_ color: UIColor?) {
        guard let color = color, let webView = self.webView else { return }
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        guard color.getRed(&r, green: &g, blue: &b, alpha: &a), a > 0.5 else { return }
        webView.backgroundColor = color
        webView.scrollView.backgroundColor = color
        view.backgroundColor = color
        let dark = (0.299 * r + 0.587 * g + 0.114 * b) < 0.5
        setStatusBarStyle(dark ? .lightContent : .darkContent)
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
