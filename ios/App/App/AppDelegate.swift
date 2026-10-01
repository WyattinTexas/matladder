import UIKit
import Capacitor
import WebKit
import ActivityKit

/// CARD-RF. The bridge view controller, plus one thing: the strips of screen outside the web content (behind the status
/// bar and the home indicator; the web view is inset by the safe area) follow the page's own background. The page is
/// white for the drill timer and black for RUN, so the run screen is black edge to edge and the status bar's text turns
/// white on it. The page sends nothing: WebKit reports the colour behind the page (underPageBackgroundColor).
class MainViewController: CAPBridgeViewController {
    private var pageColorObservation: NSKeyValueObservation?

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(RunActivityPlugin())            // the run on the lock screen (CARD-RF2)
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

/// CARD-RF2 (R2-10). The run on the lock screen and in the Dynamic Island: a Live Activity with the clock, the distance,
/// the pace and the split in hand (RunActivityWidget/: RunActivityAttributes.swift is what it shows, built into both
/// targets; RunActivityWidget.swift draws it). The page starts, updates and ends it:
/// window.Capacitor.Plugins.RunActivity.start / update / end, each with
/// { running, elapsedMs, elapsed, distance, unit, pace, splitLabel, splitMs, splitElapsed, lastSplit, status, staleSeconds }.
/// On a phone before iOS 16.2, or with Live Activities switched off for the app, every call resolves { on: false }.
@objc(RunActivityPlugin)
public class RunActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RunActivityPlugin"
    public let jsName = "RunActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise)
    ]

    @available(iOS 16.2, *)
    private func content(_ call: CAPPluginCall) -> ActivityContent<RunActivityAttributes.ContentState> {
        let now = Date()
        let state = RunActivityAttributes.ContentState(
            running: call.getBool("running") ?? true,
            timerStart: now.addingTimeInterval(-(call.getDouble("elapsedMs") ?? 0) / 1000),
            elapsed: call.getString("elapsed") ?? "0:00",
            distance: call.getString("distance") ?? "0.00",
            unit: call.getString("unit") ?? "MI",
            pace: call.getString("pace") ?? "--'--\"",
            splitLabel: call.getString("splitLabel") ?? "",
            splitStart: now.addingTimeInterval(-(call.getDouble("splitMs") ?? 0) / 1000),
            splitElapsed: call.getString("splitElapsed") ?? "0:00",
            lastSplit: call.getString("lastSplit") ?? "",
            status: call.getString("status") ?? "")
        // stale after this long without a word from the app (0: never): the card then stops its clock and says to open FOOTWORK
        let stale = call.getDouble("staleSeconds") ?? 0
        return ActivityContent(state: state, staleDate: stale > 0 ? now.addingTimeInterval(stale) : nil)
    }

    /// The run's activity, if the phone still shows one (one that has ended is waiting to be dismissed: not it).
    @available(iOS 16.2, *)
    private func live() -> Activity<RunActivityAttributes>? {
        Activity<RunActivityAttributes>.activities.first { $0.activityState == .active || $0.activityState == .stale }
    }

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *), ActivityAuthorizationInfo().areActivitiesEnabled else { call.resolve(["on": false]); return }
        let content = self.content(call)
        let resume = call.getBool("resume") ?? false
        Task {
            if resume, let keep = self.live() {                       // a run picked up after a restart keeps the card it left
                await keep.update(content)
                call.resolve(["on": true, "kept": true]); return
            }
            for a in Activity<RunActivityAttributes>.activities { await a.end(nil, dismissalPolicy: .immediate) }
            do {
                _ = try Activity<RunActivityAttributes>.request(attributes: RunActivityAttributes(startedAt: Date()), content: content, pushType: nil)
                call.resolve(["on": true])
            } catch { call.resolve(["on": false, "why": error.localizedDescription]) }
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *), let activity = live() else { call.resolve(["on": false]); return }
        let content = self.content(call)
        Task { await activity.update(content); call.resolve(["on": true]) }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(["on": false]); return }
        Task {
            for a in Activity<RunActivityAttributes>.activities { await a.end(nil, dismissalPolicy: .immediate) }
            call.resolve(["on": true])
        }
    }

    /// The app is going away (swiped off mid-run): the run stops recording, so its card leaves the lock screen with it.
    static func endAllNow() {
        guard #available(iOS 16.2, *) else { return }
        let done = DispatchSemaphore(value: 0)
        Task.detached {
            for a in Activity<RunActivityAttributes>.activities { await a.end(nil, dismissalPolicy: .immediate) }
            done.signal()
        }
        _ = done.wait(timeout: .now() + 2)
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
        RunActivityPlugin.endAllNow()                                  // CARD-RF2: a run's lock screen card does not outlive the app
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
