package com.levelup.trainingarc;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.ResultReceiver;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.annotation.ActivityCallback;
import java.io.OutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileInputStream;

@CapacitorPlugin(name = "RunTracker", permissions = {
    @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
    @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public class RunTrackerPlugin extends Plugin {
    @PluginMethod
    public void command(PluginCall call) {
        getActivity().runOnUiThread(() -> execute(call));
    }

    private void execute(PluginCall call) {
        String owner = call.getString("owner", "");
        String action = call.getString("action", "");
        if (owner.isEmpty()) { call.reject("Sign in before recording a run."); return; }
        if (!action.equals("start") && !action.equals("pause") && !action.equals("resume") && !action.equals("finish")) {
            call.reject("Unknown tracking action."); return;
        }
        if (action.equals("start") || action.equals("resume")) {
            if (getPermissionState("location") != PermissionState.GRANTED) {
                requestPermissionForAlias("location", call, "locationResult"); return;
            }
            LocationManager manager = (LocationManager) getContext().getSystemService(android.content.Context.LOCATION_SERVICE);
            if (!manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                call.reject("Turn on precise location / GPS, then try again."); return;
            }
            if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") == PermissionState.PROMPT) {
                requestPermissionForAlias("notifications", call, "notificationResult"); return;
            }
        }
        try {
            RunTrackingService.history(getContext(), owner, call.getLong("resetAt", 0L));
            String error = RunTrackingService.validate(getContext(), owner, action);
            if (error != null) { call.reject(error); return; }
            ResultReceiver receiver = new ResultReceiver(new Handler(Looper.getMainLooper())) {
                @Override protected void onReceiveResult(int code, Bundle data) {
                    if (code != 0) { call.reject(data.getString("error", "Recording could not be changed.")); return; }
                    try { call.resolve(JSObject.fromJSONObject(RunTrackingService.snapshot(getContext(), owner))); }
                    catch (Exception error) { call.reject("Could not read recording status.", error); }
                }
            };
            Intent intent = new Intent(getContext(), RunTrackingService.class).setAction(action).putExtra("owner", owner).putExtra("receiver", receiver);
            if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(intent);
            else getContext().startService(intent);
        } catch (Exception error) {
            call.reject("Could not change GPS tracking: " + error.getMessage());
        }
    }

    @PermissionCallback
    private void locationResult(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            call.reject("Precise location permission is required to record your route."); return;
        }
        execute(call);
    }

    @PermissionCallback
    private void notificationResult(PluginCall call) { execute(call); }

    @PluginMethod
    public void snapshot(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                String owner = call.getString("owner", "");
                RunTrackingService.reconcileReset(getContext(), owner, call.getLong("resetAt", 0L));
                call.resolve(JSObject.fromJSONObject(RunTrackingService.snapshot(getContext(), owner)));
            }
            catch (Exception error) { call.reject("Could not read the run.", error); }
        });
    }

    @PluginMethod
    public void history(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try { call.resolve(JSObject.fromJSONObject(RunTrackingService.history(getContext(), call.getString("owner", ""), call.getLong("resetAt", 0L)))); }
            catch (Exception error) { call.reject("Could not read run history.", error); }
        });
    }

    @PluginMethod
    public void acknowledge(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try { RunTrackingService.acknowledge(getContext(), call.getString("owner", ""), call.getArray("ids")); call.resolve(); }
            catch (Exception error) { call.reject("Could not acknowledge run history.", error); }
        });
    }

    @PluginMethod
    public void clearHistory(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try { RunTrackingService.clearHistory(getContext(), call.getString("owner", ""), call.getLong("resetAt", System.currentTimeMillis())); call.resolve(); }
            catch (Exception error) { call.reject("Finish the active run before clearing history.", error); }
        });
    }

    @PluginMethod
    public void saveImage(PluginCall call) {
        String image = call.getString("dataUrl", "");
        if (!image.startsWith("data:image/png;base64,") || image.length() > 8_000_000) {
            call.reject("Invalid run summary image."); return;
        }
        String filename = call.getString("filename", "level-up-run.png").replaceAll("[^a-zA-Z0-9._-]", "_");
        if (Build.VERSION.SDK_INT >= 29) {
            try {
                byte[] bytes = Base64.decode(image.substring("data:image/png;base64,".length()), Base64.DEFAULT);
                RunImageExporter.save(getContext(), filename, bytes);
                call.resolve(new JSObject().put("cancelled", false).put("location", "Image saved to Pictures/Level Up."));
            } catch (Exception error) { call.reject("Could not save to Pictures/Level Up. Check available storage.", error); }
            return;
        }
        final File staged;
        try {
            staged = File.createTempFile("run-summary-", ".png", getContext().getCacheDir());
            try (OutputStream output = new FileOutputStream(staged)) {
                output.write(Base64.decode(image.substring("data:image/png;base64,".length()), Base64.DEFAULT));
            }
            call.getData().remove("dataUrl");
            call.getData().put("stagedImage", staged.getAbsolutePath());
        } catch (Exception error) { call.reject("Could not prepare the saved run image.", error); return; }
        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("image/png").putExtra(Intent.EXTRA_TITLE, filename);
                startActivityForResult(call, intent, "imageResult");
            } catch (Exception error) { staged.delete(); call.reject("Could not open the image save picker.", error); }
        });
    }

    @ActivityCallback
    private void imageResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        File staged = new File(call.getString("stagedImage", ""));
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            staged.delete();
            call.resolve(new JSObject().put("cancelled", true)); return;
        }
        try (FileInputStream input = new FileInputStream(staged);
            OutputStream output = getContext().getContentResolver().openOutputStream(result.getData().getData(), "w")) {
            if (output == null) throw new IllegalStateException("Selected file cannot be written");
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            output.flush();
            call.resolve(new JSObject().put("cancelled", false));
        } catch (Exception error) { call.reject("Could not save the run summary image.", error); }
        finally { staged.delete(); }
    }
}