# Android Install

Build the latest web app, sync it into Capacitor Android, create the debug APK, and install it on the connected device:

```powershell
npm run android:apk; npm run android:install
```

To only reinstall an APK that was already built:

```powershell
npm run android:install
```

Check that the device is connected and authorized:

```powershell
adb devices
```

## GPS Run Recording

The recorder requires the installed Android APK, not a mobile browser. Open Hunter Log, choose Training Day, and press Start Training. The Run row's Start Run button then becomes available and opens a separate recording screen without starting GPS or the timer. Press Start Run inside that screen to begin. Finish & Save stops recording and automatically exports the run image without leaving the recorder. The completed route map, distance, pace, and active time remain visible until the next successful Start Run. Leaving and reopening the recorder or restarting the Android app restores that last session without downloading the image again. No completed image preview or saved-runs list is shown. Returning to the training log or switching tabs does not stop an active run; use Return to Run in the Run row to reopen it.

The exported image uses the actual saved distance, average pace, active duration, and GPS route shape, with LEVEL UP branding. Paused/signal-gap route sections remain disconnected. The 1080-by-1920 PNG is generated in memory only, without an in-app image cache. Run summaries still support training totals and XP, and private routes remain backed up independently.

Automatic export needs no map tiles, remote fonts, or internet. On Android 10+ the image is saved directly to Pictures/Level Up through MediaStore and becomes visible in gallery/file apps, without a storage permission or save-picker round trip. Older Android uses a system save picker with a staged local PNG. A failed or cancelled save keeps the map and statistics visible with Retry Download; retrying does not award distance or XP again. Reset Progress clears the retained session but does not remove images already exported to Pictures. No-movement sessions remain discarded and do not produce a share image.

The Training Day exercise checklist under Log your training has no background video. Videos on other pages retain their existing element and playback position during updates to the current page. Off-screen videos, videos on a tab that was left, and all videos while the app is backgrounded are paused; visible videos resume when the app returns. The sticky header uses an opaque background rather than a scrolling backdrop blur. Idle GPS snapshot polling is stopped, and active snapshot requests no longer rescan the entire native run history unless a newer reset needs reconciliation.

- Allow **precise location** and, when prompted, notifications. Start or resume recording while the app is visible. Background location permission is not needed: a location foreground service maintains the user-started run with an ongoing notification.
- Pause excludes that time and breaks the GPS path. Finish & Save stores the run on the phone, adds its distance to the finishing day's log, and awards the existing per-kilometre XP once. Manual entries should cover only distance not already tracked.
- XP is retained to four decimal places: 13 m at 2.5 XP/km earns 0.0325 XP, and 1 m earns 0.0025 XP. On the first server-confirmed sync, missing run XP from earlier one-decimal rounding is restored from saved daily kilometres and the credited run breakdown. Repeating sync does not award it again; existing overcredited XP is not subtracted by this recovery.
- The Training Day Run row displays all-time, daily, and latest saved-run distances in kilometres with up to three decimal places. Its manual input is in kilometres (for example, 0.461 km), beside the Run description and Add/Logged button. Start Run remains below the row. The recorder and notification display metres. A stationary session does not reset accumulated daily distance.
- Sessions with less than one metre of recorded movement, fewer than two route points, or less than one second of active time are discarded on finish; no workout, distance credit, XP, or route upload is created. The app shows "No movement recorded. Run was not saved." Existing zero-distance history entries are removed from the run list during normalization.
- New completed runs have a durable pending acknowledgement and are imported only until their summary is saved locally. Legacy native cache entries are never blindly imported into an empty cloud progress record. Reset Progress stores `runHistoryResetAt` in the account record and Android storage; older cached/pending recordings and late responses cannot resurrect pre-reset runs. A newer cloud reset takes precedence over locally unsynced progress. After upgrading from the old replay behavior, use Reset Progress once to remove already-restored unwanted totals; the update does not guess which nonzero historical workouts were genuine.
- Route recording works without mobile data. OpenStreetMap basemap tiles need internet unless already cached; the recorded path itself is retained offline.
- Publish the updated `firestore.rules` in Firebase before using route backup. Each route has a separate private document at `users/{uid}/runs/{runId}`; summaries remain in the existing progress document. Pending backups retry while the app is open and when it reconnects.
- Sign-out is blocked during an active run. Completed routes remain in app-private, account-scoped Android storage for backup recovery. Reset Progress clears this account's native history and requests deletion of its cloud routes.
- If Android kills the service or the phone reboots, the last checkpoint is recovered **paused**, rather than inventing distance or time during the interruption. Up to approximately five seconds of time since the last checkpoint may be lost. Force-stop, revoked permissions, and aggressive manufacturer battery settings can interrupt recording. Allow background operation in the phone's app battery settings when needed.
- Fused high-accuracy location is the primary source; raw GPS is activated only if the fused request fails, avoiding interleaved provider fixes. The request asks for fine, fresh, one-second fixes with no batching. The first route point needs estimated accuracy of 15 metres or better; subsequent distance fixes need 25 metres or better. Poorer fixes can still position the map but do not increase distance. Duplicate/out-of-order fixes, stale fixes, implausible jumps, and uncertain speed measurements are rejected. Each accepted route point stores accuracy and accumulated distance in metres. The map opens before recording and reports tile-network failures independently of GPS. Gaps longer than 30 seconds without usable fixes start a new route segment; time spent accumulating small movements is not treated as a signal gap. Very short movements and poor reception can undercount distance. This is outdoor tracking, not treadmill tracking.

### On-Device Acceptance Check

Distance is displayed in whole metres in the recorder and notification; pace remains min/km and training totals use km. Recording samples at approximately one-second intervals. When Android reports reliable speed, speed is integrated between consecutive fixes to retain curved-path distance even when a loop returns to its start. Speed uncertainty must be at most 0.5 m/s and passes a tighter relative threshold at walking speeds. Otherwise short GPS segments are summed with an accuracy-dependent movement threshold. Reliable stationary speed suppresses position drift. These are GPS estimates, not survey-grade measurements: tight circles smaller than location accuracy, indoor movement, and missing speed data can still be undercounted or overcounted. No distance is invented during signal gaps or pauses. Existing saved runs are not recalculated or changed.

1. Build/install the new APK and publish the Firestore rules.
2. Deny location once, then allow precise location and start a run outdoors. Verify a GPS fix and route appear.
3. Walk a known route with the screen locked for several minutes. Reopen the app and verify time, distance, and the path continued.
4. Pause, move, and resume. Confirm paused time/distance and the gap between route segments are excluded.
5. Finish, reopen the app, and verify the run and XP are recorded exactly once. Record a second run on the same day and confirm its kilometres accumulate.
6. Repeat offline, reconnect, and verify cloud route backup. Confirm another account cannot access the saved route.
7. Interrupt the service or reboot during a run and confirm recovery is paused with an interruption message. Test GPS disabled, weak signal, and notification permission denied.
8. For real-world accuracy, wait for a good fix outdoors, then walk a measured 400 m track lap and a marked short loop, and stand still for two minutes. Compare recorded metres with the known distances and check stationary drift. Synthetic instrumentation tests validate algorithm behavior, not the phone's real-world positioning error.
9. Reset in the browser or on a second device, then reopen the phone and start/finish without moving. Confirm the old 461 m record does not return, `runs` stays empty, and no new run-route document is uploaded.

### Persistence Regression Tests

Run `npm run test:runs` for isolated browser regressions covering stationary sessions, legacy cache replay, pending recovery, and reset races. The runner starts a separate Vite server on port 5181 and uses local Edge on Windows; install Playwright Chromium on other platforms. Firebase and Android responses are mocked, so the tests do not access real account data or device location.

Run the Android `RunTrackingServiceTest` instrumentation class for native persistence and GPS-filter regressions. It uses synthetic locations and separate test preferences.

### Measurement References

- [Strava: How Distance is Calculated](https://support.strava.com/hc/en-us/articles/216919487-How-Distance-is-Calculated) describes accumulated GPS-based distance and the limitations of straight segments between sampled points. This app does not reproduce Strava's proprietary processing or claim identical accuracy.
- [Android FusedLocationProviderClient](https://developers.google.com/android/reference/com/google/android/gms/location/FusedLocationProviderClient) supplies native location estimates and continuous foreground location updates. Route rendering uses the recorded coordinates over OpenStreetMap tiles; it does not snap runs to roads or invent missing movement.