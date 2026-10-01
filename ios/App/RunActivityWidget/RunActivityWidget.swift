import ActivityKit
import WidgetKit
import SwiftUI

// CARD-RF2 (R2-10). The run on the lock screen and in the Dynamic Island. The app starts, updates and ends the activity
// (RunActivityPlugin in App/AppDelegate.swift); this extension only draws it. What it draws: RunActivityAttributes.swift.

// the run screen's own colours
private let runLime = Color(red: 0.71, green: 0.95, blue: 0.24)
private let runYellow = Color(red: 1.0, green: 0.90, blue: 0.13)
private let runBlue = Color(red: 0.30, green: 0.79, blue: 1.0)
private let runGrey = Color(red: 0.60, green: 0.60, blue: 0.62)

private func rounded(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font { .system(size: size, weight: weight, design: .rounded) }

private typealias RunState = RunActivityAttributes.ContentState

/// A clock that ticks on the phone's own time while the run is running; stopped, it shows the time it stopped at.
private struct RunClock: View {
    let ticking: Bool
    let start: Date
    let stopped: String
    var body: some View {
        if ticking { Text(timerInterval: start...Date.distantFuture, countsDown: false) } else { Text(stopped) }
    }
}
private struct RunBadge: View {
    var size: CGFloat = 22
    var body: some View {
        Image(systemName: "figure.run").font(.system(size: size * 0.58, weight: .bold)).foregroundColor(.black)
            .frame(width: size, height: size).background(Circle().fill(runLime))
    }
}
/// The word at the top right: the run's state when it is not running, else the mile just finished.
private func runWord(_ s: RunState, _ stale: Bool) -> String { stale ? "OPEN FOOTWORK" : !s.running ? (s.status.isEmpty ? "PAUSED" : s.status) : s.lastSplit.isEmpty ? "FOOTWORK" : s.lastSplit }

/// The run's numbers, two lines: the clock and the distance; the pace and the split in hand with its own clock.
private struct RunNumbers: View {
    let state: RunState
    let live: Bool                                     // the clocks tick (running, and the app has been heard from)
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                RunClock(ticking: live, start: state.timerStart, stopped: state.elapsed)
                    .font(rounded(42)).monospacedDigit().foregroundColor(live ? runYellow : runGrey).lineLimit(1).minimumScaleFactor(0.6)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text("\(Text(state.distance).font(rounded(34)))\(Text(" " + state.unit).font(rounded(15)))").foregroundColor(runBlue).monospacedDigit().lineLimit(1).fixedSize()
            }
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("\(Text("PACE  ").font(rounded(11)).foregroundColor(runGrey))\(Text(state.pace).font(rounded(18)).foregroundColor(.white))\(Text(" /" + state.unit).font(rounded(11)).foregroundColor(runGrey))").lineLimit(1)
                Spacer(minLength: 8)
                if !state.splitLabel.isEmpty {
                    Text(state.splitLabel).font(rounded(11)).foregroundColor(runGrey).lineLimit(1)
                    RunClock(ticking: live, start: state.splitStart, stopped: state.splitElapsed)
                        .font(rounded(18)).monospacedDigit().foregroundColor(live ? runLime : runGrey).multilineTextAlignment(.trailing).lineLimit(1).minimumScaleFactor(0.7).frame(width: 64, alignment: .trailing)
                }
            }
        }
    }
}

/// The lock screen: the run's name and its word; the numbers under them.
private struct RunLockScreen: View {
    let state: RunState
    let stale: Bool                                    // no word from the app for three minutes: the clock stops, the card says to open the app
    var body: some View {
        let live = state.running && !stale
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 7) {
                RunBadge()
                Text("Outdoor Run").font(rounded(14)).foregroundColor(runLime)
                Spacer(minLength: 8)
                Text(runWord(state, stale)).font(rounded(11)).foregroundColor(live ? runGrey : runYellow).lineLimit(1)
            }
            RunNumbers(state: state, live: live)
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
    }
}

struct RunActivityLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RunActivityAttributes.self) { context in
            RunLockScreen(state: context.state, stale: context.isStale)
                .activityBackgroundTint(Color.black)
                .activitySystemActionForegroundColor(Color.white)
        } dynamicIsland: { context in
            let s = context.state, live = s.running && !context.isStale
            return DynamicIsland {
                // opened (a press held on the island): the lock screen's card, the name and the word beside the camera
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 5) { RunBadge(size: 20); Text("Outdoor Run").font(rounded(13)).foregroundColor(runLime).lineLimit(1).minimumScaleFactor(0.8) }.padding(.leading, 6)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(runWord(s, context.isStale)).font(rounded(11)).foregroundColor(live ? runGrey : runYellow).lineLimit(1).minimumScaleFactor(0.8).padding(.trailing, 6).padding(.top, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    RunNumbers(state: s, live: live).padding(.horizontal, 8).padding(.bottom, 2)      // clear of the island's round corners
                }
            } compactLeading: {
                Image(systemName: "figure.run").font(.system(size: 14, weight: .bold)).foregroundColor(runLime)
            } compactTrailing: {
                RunClock(ticking: live, start: s.timerStart, stopped: s.elapsed)
                    .font(rounded(14)).monospacedDigit().foregroundColor(live ? runYellow : runGrey).multilineTextAlignment(.trailing).lineLimit(1).frame(maxWidth: 54)
            } minimal: {
                Image(systemName: "figure.run").font(.system(size: 13, weight: .bold)).foregroundColor(live ? runLime : runGrey)
            }
            .keylineTint(runLime)
        }
    }
}

@main
struct RunActivityBundle: WidgetBundle {
    var body: some Widget { RunActivityLiveActivity() }
}
