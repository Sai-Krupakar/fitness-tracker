package com.levelup.trainingarc;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.ResultReceiver;
import android.os.SystemClock;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.Granularity;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.UUID;
import java.util.HashSet;
import java.util.Set;

public class RunTrackingService extends Service implements LocationListener {
    private static final String CHANNEL = "run-tracking";
    private static RunTrackingService instance;
    private JSONObject session;
    private Location previous;
    private long lastUsableFixNanos;
    private long lastReceivedFixNanos;
    private boolean usingGpsFallback;
    private long resumedAt;
    private boolean segmentStart = true;
    private String gpsStatus = "Waiting for GPS";
    private LocationManager locations;
    private FusedLocationProviderClient fusedLocations;
    private final LocationCallback fusedCallback = new LocationCallback() {
        @Override public void onLocationResult(LocationResult result) {
            if (usingGpsFallback) return;
            for (Location location : result.getLocations()) onLocationChanged(location);
        }
    };
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable checkpoint = new Runnable() {
        @Override public void run() {
            try {
                if (session != null && "running".equals(session.optString("status"))) {
                    persist();
                    notifyRun();
                }
            } catch (Exception error) { pauseAfterError("Recording interrupted. Resume when ready."); }
            handler.postDelayed(this, 5000);
        }
    };

    private static SharedPreferences store(Context context) { return context.getSharedPreferences("recorded-runs", MODE_PRIVATE); }
    private static JSONObject readSession(Context context) throws Exception {
        String value = store(context).getString("active", null);
        return value == null ? null : new JSONObject(value);
    }
    public static String validate(Context context, String owner, String action) throws Exception {
        JSONObject active = instance != null ? instance.session : readSession(context);
        if (active != null && !"finished".equals(active.optString("status"))) {
            if (!owner.equals(active.optString("owner"))) return "Another account has an unfinished run. Sign into that account to finish it.";
            if (action.equals("start")) return "Finish your current run before starting another.";
        } else if (!action.equals("start")) return "There is no active run.";
        return null;
    }
    public static JSONObject snapshot(Context context, String owner) throws Exception {
        JSONObject active = instance != null ? instance.copySession() : readSession(context);
        JSONObject result = new JSONObject();
        if (active != null && owner.equals(active.optString("owner"))) {
            if (instance == null && "running".equals(active.optString("status"))) {
                active.put("status", "paused").put("interrupted", true);
                store(context).edit().putString("active", active.toString()).commit();
            }
            result.put("run", active);
        }
        String status = "Ready to record";
        if (instance != null) status = instance.gpsStatus;
        else if (active != null && !"finished".equals(active.optString("status"))) status = "Recording stopped; resume to continue";
        result.put("gpsStatus", status);
        return result;
    }
    public static JSONObject history(Context context, String owner) throws Exception {
        return history(context, owner, 0);
    }
    public static void reconcileReset(Context context, String owner, long resetAt) throws Exception {
        if (resetAt > store(context).getLong("resetAt:" + owner, 0)) history(context, owner, resetAt);
    }
    static boolean hasRecordedMovement(JSONObject run) {
        return !run.optBoolean("discarded") && run.optDouble("distanceM", 0) >= 1
            && run.optLong("elapsedMs") >= 1000 && run.optJSONArray("points") != null
            && run.optJSONArray("points").length() >= 2;
    }
    public static JSONObject history(Context context, String owner, long resetAt) throws Exception {
        SharedPreferences preferences = store(context);
        long storedCutoff = preferences.getLong("resetAt:" + owner, 0);
        long cutoff = Math.max(storedCutoff, resetAt);
        JSONArray saved = new JSONArray(preferences.getString("history:" + owner, "[]"));
        JSONArray retained = new JSONArray();
        JSONArray pending = new JSONArray();
        Set<String> acknowledged = new HashSet<>(preferences.getStringSet("acknowledged:" + owner, new HashSet<>()));
        Set<String> retainedIds = new HashSet<>();
        for (int index = 0; index < saved.length(); index++) {
            JSONObject run = saved.getJSONObject(index);
            if (run.optLong("startedAt") <= cutoff || !hasRecordedMovement(run)) continue;
            String id = run.getString("id");
            if (!retainedIds.add(id)) continue;
            retained.put(run);
            if (run.optInt("recordingVersion") >= 2 && !acknowledged.contains(id)) pending.put(id);
        }
        boolean acknowledgementChanged = acknowledged.retainAll(retainedIds);
        boolean changed = cutoff != storedCutoff || acknowledgementChanged || !saved.toString().equals(retained.toString());
        SharedPreferences.Editor edit = preferences.edit().putLong("resetAt:" + owner, cutoff);
        if (!saved.toString().equals(retained.toString())) edit.putString("history:" + owner, retained.toString());
        edit.putStringSet("acknowledged:" + owner, acknowledged);
        JSONObject active = instance != null ? instance.session : readSession(context);
        if (active != null && owner.equals(active.optString("owner")) && active.optLong("startedAt") <= cutoff) {
            changed = true;
            edit.remove("active");
            if (instance != null) {
                instance.locations.removeUpdates(instance);
                instance.fusedLocations.removeLocationUpdates(instance.fusedCallback);
                instance.handler.removeCallbacks(instance.checkpoint);
                instance.session = null;
                instance.gpsStatus = "Ready to record";
                instance.stopForeground(true);
                instance.stopSelf();
            }
        }
        if (changed && !edit.commit()) throw new IllegalStateException("Could not reconcile run history");
        return new JSONObject().put("runs", retained).put("pendingIds", pending);
    }
    public static void acknowledge(Context context, String owner, JSONArray ids) throws Exception {
        SharedPreferences preferences = store(context);
        Set<String> acknowledged = new HashSet<>(preferences.getStringSet("acknowledged:" + owner, new HashSet<>()));
        for (int index = 0; index < ids.length(); index++) acknowledged.add(ids.getString(index));
        if (!preferences.edit().putStringSet("acknowledged:" + owner, acknowledged).commit()) {
            throw new IllegalStateException("Could not acknowledge saved runs");
        }
    }
    public static void clearHistory(Context context, String owner) throws Exception {
        clearHistory(context, owner, System.currentTimeMillis());
    }
    public static void clearHistory(Context context, String owner, long resetAt) throws Exception {
        JSONObject active = instance != null ? instance.session : readSession(context);
        if (active != null && owner.equals(active.optString("owner")) && !"finished".equals(active.optString("status"))) {
            throw new IllegalStateException("Run still active");
        }
        SharedPreferences preferences = store(context);
        SharedPreferences.Editor edit = preferences.edit().remove("history:" + owner).remove("acknowledged:" + owner)
            .putLong("resetAt:" + owner, Math.max(resetAt, preferences.getLong("resetAt:" + owner, 0)));
        if (active != null && owner.equals(active.optString("owner"))) {
            edit.remove("active");
            if (instance != null) instance.session = null;
        }
        if (!edit.commit()) throw new IllegalStateException("Could not clear history");
    }
    @Override public void onCreate() {
        super.onCreate();
        instance = this;
        locations = (LocationManager) getSystemService(LOCATION_SERVICE);
        fusedLocations = LocationServices.getFusedLocationProviderClient(this);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Run recording", NotificationManager.IMPORTANCE_LOW);
            channel.setSound(null, null);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
        try {
            session = readSession(this);
            if (session != null && "running".equals(session.optString("status"))) {
                session.put("status", "paused").put("interrupted", true);
                persist();
            }
        } catch (Exception error) { stopSelf(); }
    }
    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(42, notification());
        ResultReceiver receiver = intent == null ? null : intent.getParcelableExtra("receiver");
        try {
            String action = intent == null ? "" : intent.getAction();
            String owner = intent == null ? "" : intent.getStringExtra("owner");
            String validation = intent == null ? null : validate(this, owner, action);
            if (validation != null) {
                respond(receiver, validation);
                if (session == null || "finished".equals(session.optString("status"))) { stopForeground(true); stopSelf(); }
                return START_STICKY;
            }
            if ("start".equals(action)) {
                session = new JSONObject().put("id", UUID.randomUUID().toString()).put("owner", owner)
                    .put("startedAt", System.currentTimeMillis()).put("elapsedMs", 0).put("distanceM", 0)
                    .put("status", "paused").put("points", new JSONArray()).put("interrupted", false).put("recordingVersion", 2);
            }
            if ("start".equals(action) || "resume".equals(action)) {
                if ("running".equals(session.optString("status"))) { respond(receiver, null); return START_STICKY; }
                session.put("status", "running").put("interrupted", false);
                resumedAt = SystemClock.elapsedRealtime();
                previous = null;
                lastUsableFixNanos = 0;
                lastReceivedFixNanos = 0;
                usingGpsFallback = false;
                segmentStart = true;
                gpsStatus = "Waiting for accurate GPS";
                LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000)
                    .setMinUpdateIntervalMillis(1000).setGranularity(Granularity.GRANULARITY_FINE)
                    .setWaitForAccurateLocation(true).setMaxUpdateAgeMillis(0).setMaxUpdateDelayMillis(0).build();
                fusedLocations.requestLocationUpdates(request, fusedCallback, Looper.getMainLooper())
                    .addOnFailureListener(error -> startGpsFallback());
                handler.removeCallbacks(checkpoint);
                handler.postDelayed(checkpoint, 5000);
            } else if ("pause".equals(action) || "finish".equals(action)) {
                settleTime();
                locations.removeUpdates(this);
                fusedLocations.removeLocationUpdates(fusedCallback);
                handler.removeCallbacks(checkpoint);
                session.put("status", "pause".equals(action) ? "paused" : "finished");
                previous = null;
                gpsStatus = "Paused";
                if ("finish".equals(action)) {
                    session.put("finishedAt", System.currentTimeMillis());
                    session.put("discarded", !hasRecordedMovement(session));
                    if (!session.optBoolean("discarded")) {
                        JSONArray runs = history(this, session.getString("owner")).getJSONArray("runs");
                        boolean exists = false;
                        for (int index = 0; index < runs.length(); index++) {
                            if (runs.getJSONObject(index).optString("id").equals(session.getString("id"))) { runs.put(index, copySession()); exists = true; break; }
                        }
                        if (!exists) runs.put(copySession());
                        if (!store(this).edit().putString("history:" + session.getString("owner"), runs.toString()).commit()) {
                            session.put("status", "paused");
                            throw new IllegalStateException("Device storage is full");
                        }
                    }
                }
            }
            persist();
            notifyRun();
            respond(receiver, null);
            if (session == null || "finished".equals(session.optString("status"))) {
                stopForeground(true);
                stopSelf();
            }
        } catch (Exception error) {
            pauseAfterError("GPS or storage unavailable. Check permissions and resume.");
            respond(receiver, "GPS or storage unavailable. Check permissions and available storage, then resume.");
        }
        return START_STICKY;
    }
    private void respond(ResultReceiver receiver, String error) {
        if (receiver == null) return;
        Bundle result = new Bundle();
        if (error != null) result.putString("error", error);
        receiver.send(error == null ? 0 : 1, result);
    }
    private void settleTime() throws Exception {
        if (session != null && "running".equals(session.optString("status")) && resumedAt > 0) {
            long now = SystemClock.elapsedRealtime();
            session.put("elapsedMs", session.optLong("elapsedMs") + now - resumedAt);
            resumedAt = now;
        }
    }
    private JSONObject copySession() throws Exception {
        if (session == null) return null;
        JSONObject copy = new JSONObject(session.toString());
        if ("running".equals(copy.optString("status")) && resumedAt > 0) {
            copy.put("elapsedMs", copy.optLong("elapsedMs") + SystemClock.elapsedRealtime() - resumedAt);
        }
        return copy;
    }
    private void persist() throws Exception {
        settleTime();
        if (session != null && !store(this).edit().putString("active", session.toString()).commit()) {
            throw new IllegalStateException("Device storage is full");
        }
    }
    private void pauseAfterError(String message) {
        gpsStatus = message;
        try {
            settleTime();
            if (session != null) session.put("status", "paused").put("interrupted", true);
            locations.removeUpdates(this);
            fusedLocations.removeLocationUpdates(fusedCallback);
            persist();
            notifyRun();
        } catch (Exception ignored) { stopSelf(); }
    }
    private void startGpsFallback() {
        if (session == null || !"running".equals(session.optString("status")) || usingGpsFallback) return;
        try {
            usingGpsFallback = true;
            fusedLocations.removeLocationUpdates(fusedCallback);
            previous = null;
            lastUsableFixNanos = 0;
            lastReceivedFixNanos = 0;
            segmentStart = true;
            gpsStatus = "Using GPS - waiting for an accurate outdoor fix";
            locations.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000, 0, this, Looper.getMainLooper());
        } catch (Exception error) { pauseAfterError("Location unavailable. Check permissions and resume."); }
    }
    @Override public void onLocationChanged(Location location) {
        if (session == null || !"running".equals(session.optString("status"))) return;
        try {
            double ageSeconds = (SystemClock.elapsedRealtimeNanos() - location.getElapsedRealtimeNanos()) / 1e9;
            if (ageSeconds > 15 || ageSeconds < 0 || !location.hasAccuracy()) {
                gpsStatus = "Waiting for a fresh GPS fix - move outdoors"; return;
            }
            long fixNanos = location.getElapsedRealtimeNanos();
            if (fixNanos <= lastReceivedFixNanos) return;
            lastReceivedFixNanos = fixNanos;
            session.put("position", new JSONObject().put("lat", location.getLatitude()).put("lng", location.getLongitude())
                .put("accuracy", location.getAccuracy()).put("at", System.currentTimeMillis()));
            float requiredAccuracy = previous == null ? 15 : 25;
            if (location.getAccuracy() > requiredAccuracy) {
                gpsStatus = "Improving GPS (" + Math.round(location.getAccuracy()) + " m accuracy) - distance waits for a better fix"; return;
            }
            if (fixNanos <= lastUsableFixNanos) return;
            boolean signalGap = lastUsableFixNanos > 0 && fixNanos - lastUsableFixNanos > 30_000_000_000L;
            boolean newSegment = segmentStart;
            float distance = 0;
            if (previous != null) {
                double seconds = (location.getElapsedRealtimeNanos() - previous.getElapsedRealtimeNanos()) / 1e9;
                if (seconds <= 0) return;
                if (signalGap) { newSegment = true; }
                else {
                    distance = previous.distanceTo(location);
                    if (distance / seconds > 12) { gpsStatus = "GPS jump ignored"; return; }
                    if (seconds < 0.5) return;
                    lastUsableFixNanos = fixNanos;
                    session.put("lastFixAt", System.currentTimeMillis());
                    boolean measuredSpeed = hasReliableSpeed(location);
                    if (measuredSpeed && location.getSpeed() < 0.3f) {
                        previous = new Location(location);
                        gpsStatus = "GPS ready";
                        return;
                    }
                    if (measuredSpeed && hasReliableSpeed(previous) && seconds <= 5) {
                        distance = (float) ((previous.getSpeed() + location.getSpeed()) * 0.5 * seconds);
                    } else if (distance < Math.max(1, Math.min(8, (previous.getAccuracy() + location.getAccuracy()) * 0.25))) {
                        gpsStatus = "GPS ready"; return;
                    }
                }
            }
            lastUsableFixNanos = fixNanos;
            session.put("lastFixAt", System.currentTimeMillis());
            JSONArray points = session.getJSONArray("points");
            if (points.length() >= 6000) {
                JSONArray reduced = new JSONArray();
                for (int index = 0; index < points.length(); index++) {
                    JSONObject point = points.getJSONObject(index);
                    boolean boundary = point.optBoolean("segment") || (index + 1 < points.length() && points.getJSONObject(index + 1).optBoolean("segment"));
                    if (index % 2 == 0 || boundary || index == points.length() - 1) reduced.put(point);
                }
                points = reduced;
                session.put("points", points);
            }
            double cumulativeDistance = session.optDouble("distanceM") + (newSegment ? 0 : distance);
            points.put(new JSONObject().put("lat", location.getLatitude()).put("lng", location.getLongitude())
                .put("at", location.getTime()).put("accuracy", location.getAccuracy())
                .put("distanceM", cumulativeDistance).put("segment", newSegment));
            session.put("distanceM", cumulativeDistance);
            segmentStart = false;
            previous = new Location(location);
            gpsStatus = "GPS ready";
            persist();
        } catch (Exception error) { pauseAfterError("Recording interrupted. Check storage and resume."); }
    }
    @Override public void onProviderDisabled(String provider) {
        previous = null;
        segmentStart = true;
        gpsStatus = "GPS is off";
    }
    @Override public void onProviderEnabled(String provider) { gpsStatus = "Waiting for accurate GPS"; }
    @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
    private boolean hasReliableSpeed(Location location) {
        if (!location.hasSpeed() || location.getSpeed() < 0 || location.getSpeed() > 12) return false;
        if (Build.VERSION.SDK_INT >= 26) {
            float allowedError = Math.min(0.5f, Math.max(0.1f, location.getSpeed() * 0.25f));
            return location.hasSpeedAccuracy() && location.getSpeedAccuracyMetersPerSecond() <= allowedError;
        }
        return location.getAccuracy() <= 10;
    }
    private Notification notification() {
        Intent launch = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tap = PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String status = session != null ? session.optString("status", "paused") : "paused";
        double metres = session != null ? session.optDouble("distanceM") : 0;
        String text = String.format(java.util.Locale.US, "%.0f m · %s", metres, status.equals("running") ? gpsStatus : "Paused - tap to resume or finish");
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        return builder.setContentTitle("Level Up · Run recording").setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation).setContentIntent(tap).setOngoing(true).setOnlyAlertOnce(true).build();
    }
    private void notifyRun() { ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).notify(42, notification()); }
    @Override public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        try { locations.removeUpdates(this); fusedLocations.removeLocationUpdates(fusedCallback); persist(); } catch (Exception ignored) {}
        instance = null;
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
}