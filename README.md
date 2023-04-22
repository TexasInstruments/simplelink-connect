# Setup react-native
Setup react-native and its dependancies by following https://reactnative.dev/docs/environment-setup

# Install node packages
install node packages
```
npm instal
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
Refer to:
https://reactnative.dev/docs/signed-apk-android

# Configure and run the iOS app

## Set the signing certificate
Open xcode and set the signing certificates

## Running the app on an iOS phone

### Install pods
Only needed once
```
cd ios
pon install
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
react-native run-ios --device "Name of iPhone"
```

You will see an error first time you launch "No Bundle URL Present". There will also be a popup to allow the app to find and connect to devices on your local network. Click allow, then click "Reload JS" in the error window.
​
The app will request to use Bluetooth, click OK.
​
## Build and realese the iOS app
Refer to:
https://reactnative.dev/docs/publishing-to-app-store