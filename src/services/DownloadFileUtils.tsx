import * as Sharing from 'expo-sharing';
import RNFS from 'react-native-fs';
import DeviceInfo from "react-native-device-info";
import { PermissionsAndroid, Platform } from "react-native";


async function downloadAndroid(data: string, fileName: string, fileType: string) {
    try {

        let deviceVersion = DeviceInfo.getSystemVersion();
        let granted = PermissionsAndroid.RESULTS.DENIED;

        // Android version 13 no permission is needed.
        if (Number(deviceVersion) >= 13) {
            granted = PermissionsAndroid.RESULTS.GRANTED;
        } else {
            granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        }

        if (granted) {
            // try {

            //     let directory = await ScopedStorage.openDocumentTree(true);
            //     await ScopedStorage.writeFile(directory.uri, data, fileName, fileType, 'utf8', false);

            // } catch (error) {
            //     console.log(error);
            //     alert('Error exporting results: ' + error);
            // }
            await downloadFile(data, fileName, fileType);
        } else {
            alert('Permission denied.');
        }

    } catch (error) {
        console.error('Error checking or requesting permission: ', error);
    }
}

async function downloadFile(data: string, fileName: string, fileType: string) {

    const filePath = RNFS.DocumentDirectoryPath + '/' + fileName;

    await RNFS.writeFile(filePath, data, 'utf8');
    console.log('File written successfully:', filePath);

    try {
        const options = {
            type: fileType,
            message: '',
            url: `file://${filePath}`,
        };

        await Sharing.shareAsync(options.url);
    } catch (error) {
        console.error('Error sharing file:', error);
    }
}

export async function downloadDataToLocalStorage(data: string, fileName: string, fileType: string) {
    if (Platform.OS === 'android') {
        downloadAndroid(data, fileName, fileType)
    }
    else { //IOS
        downloadFile(data, fileName, fileType)
    }
}