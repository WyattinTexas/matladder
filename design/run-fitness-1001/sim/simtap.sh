#!/bin/bash
# simtap.sh <x> <y> [hold ms] — one tap (or a press held) on the simulated phone's screen, in the phone's own points
# (iPhone 17 Pro: 402 × 874).
# The Simulator has no command for a tap: its window comes forward, the Mac's pointer clicks the spot (cliclick), the
# pointer goes back where it was, and the app that was in front gets its place back.
# Used by sim-run.mjs: the lock screen's one-time "Allow Live Activities from FOOTWORK?" → Allow; a press held on the
# Dynamic Island opens it.
X="$1"; Y="$2"; HOLD="${3:-0}"; [ -n "$X" ] && [ -n "$Y" ] || { echo "usage: $0 <x> <y> [hold ms]"; exit 2; }
command -v cliclick >/dev/null || { echo "cliclick is not installed (brew install cliclick)"; exit 3; }
ORIGIN=$(osascript <<'OSA'
tell application "System Events" to tell process "Simulator"
  repeat with e in (every UI element of window 1)
    try
      if subrole of e is "iOSContentGroup" then
        set p to position of e
        set s to size of e
        return ((item 1 of p) as text) & " " & ((item 2 of p) as text) & " " & ((item 1 of s) as text) & " " & ((item 2 of s) as text)
      end if
    end try
  end repeat
end tell
return ""
OSA
)
[ -n "$ORIGIN" ] || { echo "the Simulator's screen was not found"; exit 4; }
read -r OX OY OW OH <<<"$ORIGIN"
# the window may be scaled: the phone's 402 points across its width
PX=$(python3 -c "print(round($OX + $X * $OW / 402))"); PY=$(python3 -c "print(round($OY + $Y * $OW / 402))")
WAS=$(osascript -e 'tell application "System Events" to get name of first process whose frontmost is true')
osascript -e 'tell application "Simulator" to activate' -e 'delay 0.7'
if [ "$HOLD" -gt 0 ]; then cliclick -r "dd:$PX,$PY" "w:$HOLD" "du:$PX,$PY"; else cliclick -r "c:$PX,$PY"; fi
sleep 0.3
[ "$WAS" = "Simulator" ] || osascript -e "tell application \"$WAS\" to activate"
echo "tapped $X,$Y (screen $PX,$PY)"
