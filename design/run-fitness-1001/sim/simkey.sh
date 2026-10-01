#!/bin/bash
# simkey.sh <Device menu item> — the Simulator's Device menu only answers while its window is in front: it comes
# forward for the click, then the app that was in front gets its place back.
osascript <<OSA
tell application "System Events" to set was to name of first process whose frontmost is true
tell application "Simulator" to activate
delay 0.7
tell application "System Events" to tell process "Simulator"
  set ok to enabled of menu item "$1" of menu 1 of menu bar item "Device" of menu bar 1
  if ok then click menu item "$1" of menu 1 of menu bar item "Device" of menu bar 1
end tell
delay 0.3
if was is not "Simulator" then tell application was to activate
return ok
OSA
