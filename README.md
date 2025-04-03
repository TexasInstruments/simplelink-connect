# Setup react-native
Setup react-native and its dependancies by following https://reactnative.dev/docs/environment-setup

# Install node packages
Install node packages
```
npm install
```

# Configure and run the Android app

## Setup Android phone
Enable adb debugging on the phone by following the instructions here https://developer.android.com/studio/debug/dev-options

## Running the app on an Android phone
Connect the phone to usb and run

```
adb devices
adb reverse tcp:8081 tcp:8081
npm run android
```

## Build and release the Android app
Refer to this documentation to set up app signing:
https://reactnative.dev/docs/signed-apk-android

To build the APK:
```
cd android
./gradlew assembleRelease
```

To build an app bundle:
```
cd android
./gradlew bundleRelease
```

# Configure and run the iOS app

## Set the signing certificate
Open xcode and set the signing certificates

## Running the app on an iOS phone

### Install pods
Only needed once
```
cd ios
pod install
```

### Install ReactNative tools
Only needed once
```
npm install -g react-native
npm install -g ios-deploy
```

### Build and run the app
Insure your phone is connected over USB and on the same WiFi network and run
```
npx react-native run-ios --device "Name of iPhone"
```

You will see an error first time you launch "No Bundle URL Present". There will also be a popup to allow the app to find and connect to devices on your local network. Click allow, then click "Reload JS" in the error window.
​
The app will request to use Bluetooth, click OK.
​
## Build and realese the iOS app
Refer to:
https://reactnative.dev/docs/publishing-to-app-store


# Design Notes

## Simple Scanner
a real App is unlikely to want to scan and connect to any device. It is more likely that it will only connect to a specific set of devices that the App is created to support. To aid in developing such an app a SimpleBleScanner impelemntation has been provided here:
src/components/SimpleBleScanner/index.tsx

To enable this version of the scanner to be used make the following change:
```
diff --git a/screens/ScanScreen.tsx b/screens/ScanScreen.tsx
index 71d6f14..f7948e0 100644
--- a/screens/ScanScreen.tsx
+++ b/screens/ScanScreen.tsx
@@ -31,7 +31,7 @@
  */
 
 import { StyleSheet } from 'react-native';
-import BleScanner from '../src/components/BleScanner';
+import BleScanner from '../src/components/SimpleBleScanner';
 import { useEffect } from 'react';
 import { Icon } from '@rneui/themed';
 import { TouchableOpacity, View } from '../components/Themed';
 ```

 Note the 2 ```TODO's``` that will allow the results to be filtered to specific devices.