package com.levelup.trainingarc;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import android.content.Context;
import android.content.ContextWrapper;
import android.content.SharedPreferences;
import android.location.Location;
import android.os.SystemClock;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Test;
import java.lang.reflect.Field;

public class RunTrackingServiceTest {
    private final Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
    private final Context historyContext = new ContextWrapper(context) {
        @Override public SharedPreferences getSharedPreferences(String name, int mode) {
            return context.getSharedPreferences("run-tracker-regression-test", MODE_PRIVATE);
        }
    };
    private final RunTrackingService recorder = new RunTrackingService() {
        @Override public SharedPreferences getSharedPreferences(String name, int mode) {
            return context.getSharedPreferences("run-tracker-regression-test", MODE_PRIVATE);
        }
    };

    private void setField(String name, Object value) throws Exception {
        Field field = RunTrackingService.class.getDeclaredField(name);
        field.setAccessible(true);
        field.set(recorder, value);
    }

    private Location fix(double longitude, float accuracy, long nanos) {
        Location location = new Location("test");
        location.setLatitude(0);
        location.setLongitude(longitude);
        location.setAccuracy(accuracy);
        location.setTime(System.currentTimeMillis());
        location.setElapsedRealtimeNanos(nanos);
        return location;
    }

    private JSONObject seed(long lastFixNanos) throws Exception {
        JSONObject session = new JSONObject().put("id", "regression-test").put("owner", "regression-test")
            .put("status", "running").put("elapsedMs", 0).put("distanceM", 0)
            .put("points", new JSONArray().put(new JSONObject().put("lat", 0).put("lng", 0).put("segment", true)));
        setField("session", session);
        setField("previous", fix(0, 50, SystemClock.elapsedRealtimeNanos() - 40_000_000_000L));
        setField("lastUsableFixNanos", lastFixNanos);
        setField("segmentStart", false);
        return session;
    }

    @After public void cleanUp() {
        context.getSharedPreferences("run-tracker-regression-test", Context.MODE_PRIVATE).edit().clear().commit();
    }

    @Test public void slowMovementWithContinuousFixesAccumulatesDistance() throws Exception {
        JSONObject session = seed(SystemClock.elapsedRealtimeNanos() - 2_000_000_000L);
        recorder.onLocationChanged(fix(0.0004, 20, SystemClock.elapsedRealtimeNanos()));
        assertTrue(session.getDouble("distanceM") > 40);
        assertEquals(2, session.getJSONArray("points").length());
        assertFalse(session.getJSONArray("points").getJSONObject(1).getBoolean("segment"));
    }

    @Test public void realSignalGapStartsANewSegmentWithoutInventingDistance() throws Exception {
        JSONObject session = seed(SystemClock.elapsedRealtimeNanos() - 40_000_000_000L);
        recorder.onLocationChanged(fix(0.0004, 20, SystemClock.elapsedRealtimeNanos()));
        assertEquals(0, session.getDouble("distanceM"), 0);
        assertTrue(session.getJSONArray("points").getJSONObject(1).getBoolean("segment"));
    }

    @Test public void smallClosedCircleCountsTravelledPathRatherThanDisplacement() throws Exception {
        long start = SystemClock.elapsedRealtimeNanos() - 12_000_000_000L;
        JSONObject session = seed(start);
        Location first = fix(0.00002, 3, start);
        first.setSpeed(1.2f);
        first.setSpeedAccuracyMetersPerSecond(0.1f);
        setField("previous", first);
        for (int index = 1; index <= 12; index++) {
            double angle = index * 2 * Math.PI / 12;
            Location point = fix(Math.cos(angle) * 0.00002, 3, start + index * 1_000_000_000L);
            point.setLatitude(Math.sin(angle) * 0.00002);
            point.setSpeed(1.2f);
            point.setSpeedAccuracyMetersPerSecond(0.1f);
            recorder.onLocationChanged(point);
        }
        assertEquals(14.4, session.getDouble("distanceM"), 0.05);
        assertEquals(13, session.getJSONArray("points").length());
        assertEquals(session.getDouble("distanceM"), session.getJSONArray("points").getJSONObject(12).getDouble("distanceM"), 0);
    }

    @Test public void stationarySpeedRejectsPositionDrift() throws Exception {
        long start = SystemClock.elapsedRealtimeNanos() - 3_000_000_000L;
        JSONObject session = seed(start);
        Location first = fix(0, 5, start);
        first.setSpeed(0);
        first.setSpeedAccuracyMetersPerSecond(0.1f);
        setField("previous", first);
        Location drift = fix(0.00003, 5, start + 2_000_000_000L);
        drift.setSpeed(0.1f);
        drift.setSpeedAccuracyMetersPerSecond(0.1f);
        recorder.onLocationChanged(drift);
        assertEquals(0, session.getDouble("distanceM"), 0);
        assertEquals(1, session.getJSONArray("points").length());
    }

    @Test public void twoMetreSegmentsCountWithoutSpeedMeasurements() throws Exception {
        long start = SystemClock.elapsedRealtimeNanos() - 3_000_000_000L;
        JSONObject session = seed(start);
        setField("previous", fix(0, 3, start));
        recorder.onLocationChanged(fix(0.00002, 3, start + 2_000_000_000L));
        assertTrue(session.getDouble("distanceM") > 2);
        assertTrue(session.getDouble("distanceM") < 2.5);
    }

    @Test public void PoorAccuracyPositionsMapWithoutAddingDistance() throws Exception {
        JSONObject session = seed(SystemClock.elapsedRealtimeNanos() - 2_000_000_000L);
        recorder.onLocationChanged(fix(0.0004, 100, SystemClock.elapsedRealtimeNanos()));
        assertTrue(session.has("position"));
        assertEquals(100, session.getJSONObject("position").getDouble("accuracy"), 0);
        assertEquals(0, session.getDouble("distanceM"), 0);
        assertEquals(1, session.getJSONArray("points").length());
    }

    @Test public void moderateAccuracyDoesNotAddDistance() throws Exception {
        JSONObject session = seed(SystemClock.elapsedRealtimeNanos() - 2_000_000_000L);
        recorder.onLocationChanged(fix(0.0004, 30, SystemClock.elapsedRealtimeNanos()));
        assertTrue(session.has("position"));
        assertEquals(0, session.getDouble("distanceM"), 0);
        assertEquals(1, session.getJSONArray("points").length());
    }

    @Test public void initialFixWaitsForGoodAccuracy() throws Exception {
        long start = SystemClock.elapsedRealtimeNanos() - 3_000_000_000L;
        JSONObject session = seed(start);
        session.put("points", new JSONArray());
        setField("previous", null);
        setField("segmentStart", true);
        recorder.onLocationChanged(fix(0, 20, start + 1_000_000_000L));
        assertEquals(0, session.getJSONArray("points").length());
        recorder.onLocationChanged(fix(0, 5, start + 2_000_000_000L));
        assertEquals(1, session.getJSONArray("points").length());
        assertEquals(0, session.getDouble("distanceM"), 0);
    }

    @Test public void duplicateAndOutOfOrderFixesDoNotChangeRouteOrPreview() throws Exception {
        long start = SystemClock.elapsedRealtimeNanos() - 4_000_000_000L;
        JSONObject session = seed(start);
        setField("previous", fix(0, 3, start));
        Location point = fix(0.00002, 3, start + 2_000_000_000L);
        recorder.onLocationChanged(point);
        double distance = session.getDouble("distanceM");
        recorder.onLocationChanged(point);
        recorder.onLocationChanged(fix(1, 3, start + 1_000_000_000L));
        assertEquals(distance, session.getDouble("distanceM"), 0);
        assertEquals(2, session.getJSONArray("points").length());
        assertEquals(0.00002, session.getJSONObject("position").getDouble("lng"), 0);
    }

    @Test public void stationaryJitterWithoutSpeedDoesNotAccumulate() throws Exception {
        long start = SystemClock.elapsedRealtimeNanos() - 6_000_000_000L;
        JSONObject session = seed(start);
        setField("previous", fix(0, 5, start));
        for (int index = 1; index <= 5; index++) {
            recorder.onLocationChanged(fix(index % 2 == 0 ? -0.00001 : 0.00001, 5, start + index * 1_000_000_000L));
        }
        assertEquals(0, session.getDouble("distanceM"), 0);
        assertEquals(1, session.getJSONArray("points").length());
    }

    @Test public void gpsSpikeDoesNotPolluteDistanceOrPreventRecovery() throws Exception {
        long start = SystemClock.elapsedRealtimeNanos() - 4_000_000_000L;
        JSONObject session = seed(start);
        setField("previous", fix(0, 3, start));
        recorder.onLocationChanged(fix(0.01, 3, start + 1_000_000_000L));
        assertEquals(0, session.getDouble("distanceM"), 0);
        recorder.onLocationChanged(fix(0.00002, 3, start + 2_000_000_000L));
        assertTrue(session.getDouble("distanceM") > 2);
        assertTrue(session.getDouble("distanceM") < 2.5);
    }

    @Test public void uncertainSpeedFallsBackToMeasuredPath() throws Exception {
        long start = SystemClock.elapsedRealtimeNanos() - 3_000_000_000L;
        JSONObject session = seed(start);
        Location first = fix(0, 3, start);
        first.setSpeed(10);
        first.setSpeedAccuracyMetersPerSecond(3);
        setField("previous", first);
        Location point = fix(0.00002, 3, start + 2_000_000_000L);
        point.setSpeed(10);
        point.setSpeedAccuracyMetersPerSecond(3);
        recorder.onLocationChanged(point);
        assertTrue(session.getDouble("distanceM") > 2);
        assertTrue(session.getDouble("distanceM") < 2.5);
    }

    @Test public void staleFixDoesNotChangeRoute() throws Exception {
        JSONObject session = seed(SystemClock.elapsedRealtimeNanos() - 30_000_000_000L);
        recorder.onLocationChanged(fix(0.001, 3, SystemClock.elapsedRealtimeNanos() - 20_000_000_000L));
        assertEquals(0, session.getDouble("distanceM"), 0);
        assertEquals(1, session.getJSONArray("points").length());
        assertFalse(session.has("position"));
    }

    private JSONObject savedRun(String id, long startedAt, double distance) throws Exception {
        return new JSONObject().put("id", id).put("owner", "history-test").put("startedAt", startedAt)
            .put("finishedAt", startedAt + 5000).put("elapsedMs", 5000).put("status", "finished")
            .put("distanceM", distance).put("points", new JSONArray().put(new JSONObject()).put(new JSONObject()));
    }

    private void writeHistory(JSONArray runs) {
        historyContext.getSharedPreferences("ignored", Context.MODE_PRIVATE).edit()
            .putString("history:history-test", runs.toString()).commit();
    }

    @Test public void noMovementIsNotASavableWorkout() throws Exception {
        assertFalse(RunTrackingService.hasRecordedMovement(savedRun("empty", 100, 0)));
        assertFalse(RunTrackingService.hasRecordedMovement(savedRun("sub-metre", 100, 0.4)));
        assertFalse(RunTrackingService.hasRecordedMovement(savedRun("single-fix", 100, 100).put("points", new JSONArray().put(new JSONObject()))));
        assertTrue(RunTrackingService.hasRecordedMovement(savedRun("walking", 100, 2)));
    }

    @Test public void legacyCacheIsNotTreatedAsNewPendingWorkouts() throws Exception {
        writeHistory(new JSONArray().put(savedRun("old-461", 100, 461)));
        JSONObject result = RunTrackingService.history(historyContext, "history-test", 0);
        assertEquals(1, result.getJSONArray("runs").length());
        assertEquals(0, result.getJSONArray("pendingIds").length());
    }

    @Test public void zeroDistanceHistoryIsPruned() throws Exception {
        writeHistory(new JSONArray().put(savedRun("empty", 100, 0)).put(savedRun("walking", 200, 12)));
        JSONObject result = RunTrackingService.history(historyContext, "history-test", 0);
        assertEquals(1, result.getJSONArray("runs").length());
        assertEquals("walking", result.getJSONArray("runs").getJSONObject(0).getString("id"));
    }

    @Test public void newlyRecordedRunIsPendingUntilAcknowledged() throws Exception {
        writeHistory(new JSONArray().put(savedRun("new", 200, 12).put("recordingVersion", 2)));
        assertEquals(1, RunTrackingService.history(historyContext, "history-test", 0).getJSONArray("pendingIds").length());
        RunTrackingService.acknowledge(historyContext, "history-test", new JSONArray().put("new"));
        JSONObject result = RunTrackingService.history(historyContext, "history-test", 0);
        assertEquals(1, result.getJSONArray("runs").length());
        assertEquals(0, result.getJSONArray("pendingIds").length());
    }

    @Test public void remoteResetDiscardsOlderPendingRuns() throws Exception {
        writeHistory(new JSONArray().put(savedRun("old", 100, 461).put("recordingVersion", 2))
            .put(savedRun("after-reset", 200, 12).put("recordingVersion", 2)));
        JSONObject result = RunTrackingService.history(historyContext, "history-test", 150);
        assertEquals(1, result.getJSONArray("runs").length());
        assertEquals("after-reset", result.getJSONArray("pendingIds").getString(0));
    }

    @Test public void snapshotResetReconcilesANewerCutoff() throws Exception {
        writeHistory(new JSONArray().put(savedRun("old", 100, 461)).put(savedRun("new", 200, 12)));
        RunTrackingService.reconcileReset(historyContext, "history-test", 150);
        SharedPreferences preferences = historyContext.getSharedPreferences("ignored", Context.MODE_PRIVATE);
        assertEquals(150, preferences.getLong("resetAt:history-test", 0));
        JSONArray retained = new JSONArray(preferences.getString("history:history-test", "[]"));
        assertEquals(1, retained.length());
        assertEquals("new", retained.getJSONObject(0).getString("id"));
    }

    @Test public void unchangedSnapshotResetDoesNotParseHistory() throws Exception {
        SharedPreferences preferences = historyContext.getSharedPreferences("ignored", Context.MODE_PRIVATE);
        preferences.edit().putLong("resetAt:history-test", 150).putString("history:history-test", "not-json").commit();
        RunTrackingService.reconcileReset(historyContext, "history-test", 150);
        RunTrackingService.reconcileReset(historyContext, "history-test", 100);
        assertEquals("not-json", preferences.getString("history:history-test", ""));
    }

    @Test public void resetCutoffSurvivesStaleHistoryReappearing() throws Exception {
        RunTrackingService.clearHistory(historyContext, "history-test", 200);
        writeHistory(new JSONArray().put(savedRun("stale-461", 100, 461).put("recordingVersion", 2)));
        JSONObject result = RunTrackingService.history(historyContext, "history-test", 0);
        assertEquals(0, result.getJSONArray("runs").length());
        assertEquals(0, result.getJSONArray("pendingIds").length());
    }

    @Test public void duplicateHistoryIdsAreReturnedOnce() throws Exception {
        JSONObject run = savedRun("same-run", 200, 12).put("recordingVersion", 2);
        writeHistory(new JSONArray().put(run).put(run));
        JSONObject result = RunTrackingService.history(historyContext, "history-test", 0);
        assertEquals(1, result.getJSONArray("runs").length());
        assertEquals(1, result.getJSONArray("pendingIds").length());
    }
}