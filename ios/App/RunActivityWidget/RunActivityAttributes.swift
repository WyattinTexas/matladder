import ActivityKit
import Foundation

/// CARD-RF2 (R2-10). What the lock screen shows of a run. ONE file, built into both targets: the app starts, updates and
/// ends the activity (RunActivityPlugin in App/AppDelegate.swift); the widget extension draws it (RunActivityWidget.swift).
@available(iOS 16.2, *)
struct RunActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var running: Bool          // the clock is ticking (false: paused, the texts below are shown as they are)
        var timerStart: Date       // now − the run's time: the clock ticks from it on the phone's own time
        var elapsed: String        // the run's time as text, for a stopped clock
        var distance: String       // "3.40" ("--" on a timing-only run)
        var unit: String           // "MI" | "KM"
        var pace: String           // "8'23\""
        var splitLabel: String     // "MILE 4" ("" on a timing-only run)
        var splitStart: Date       // now − the time into the split
        var splitElapsed: String   // the time into the split as text, for a stopped clock
        var lastSplit: String      // the split before it: "MILE 3  8'46\"" or ""
        var status: String         // "" while running · "PAUSED" · "AUTO-PAUSED"
    }
    var startedAt: Date
}
