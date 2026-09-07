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