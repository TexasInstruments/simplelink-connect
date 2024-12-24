import BleManager from 'react-native-ble-manager';
import { PermissionsAndroid, Platform } from "react-native";
import DeviceInfo from "react-native-device-info";
import RNFS from 'react-native-fs';
import * as Sharing from 'expo-sharing';
import { TI_DATA_STREAM_SERVICE, TI_SIMPLE_PERIPHERAL_SERVICE } from "../../constants/uuids";
export const data_stream = 'TI Terminal';
export const simple_peripheral = 'TI Simple Peripheral Service';

export const GATT_SERVICES = [
    { value: simple_peripheral, label: 'Simple GATT Profiles' },
    { value: data_stream, label: 'Data Stream' }
]

export const TEST_CASE: { [key: string]: string } = {
    WRITE_NOTIFY: 'write & receive notification',
    WRITE_READ: 'write & read'
}

export const TEST_CASES_OPTIONS = Object.keys(TEST_CASE).map((key) => ({
    value: TEST_CASE[key],
    label: TEST_CASE[key],
}));

export const NOTIFICATION_TIMEOUT = 20000;

export const LogLevel = {
    WARNING: "orange",
    SUCCESS: "green",
    ERROR: "red",
    INFO: "black",
}

export interface TestData {
    info: {
        date: string,
        platform: string,
        device_model: string,
        os_version: string,
        app_version: string,
        total_execution_time_ms: number,
    },
    test_parameters: {
        devices_list: string[],
        num_of_devices: number,
        num_of_main_loops?: number,
        gatt_testing_selected: boolean,
        test_case: null | string,
        supported_profile: string,
        num_of_gatt_loops: number,
        pair_and_bond?: boolean,
    },
    results: TestResult[],
}

export interface TestParams {
    devices_name_list: string[],
    pair_and_bond: boolean,
    connection_phy: number,
    gatt_data_testing: boolean,
    mtu_size: number,
    supported_service: string,
    test_case: string,
    delay_between_gatt_tests: number,
    connection_duration: number,
    delay_between_main_loops: number,
    write_data_size: number,
    expected_notifications_size: number,
    num_loops_gatt_test: number,
    main_loop_number: number,
}

export interface TestResult {
    main_loop_number?: number,
    device_name: string,
    connection?: boolean,
    bonded?: boolean,
    disconnected?: boolean,
    gatt_test_loop_number?: number,
    write?: boolean,
    got_expected_notification?: boolean,
    read_expected_value?: boolean,
    test_pass: boolean,
    error_message?: null | string,
    read?: boolean,
    connection_duration_ms?: number,
}

export interface Step {
    id: string,
    progress: number,
    title: string,
    desc: string,
    totalRounds: number,
    currentRound: number,
}

export interface DeviceName {
    value: string;
    timestamp: number;
}

export const StepsIDs =
{
    connect: "connect",
    scan: "scan",
    disconnect: "disconnect",
    pairAndBond: "pairAndBond",
    gattTesting: "gattTesting",
    write: "write",
    read: "read",
    receiveNotification: "receiveNotification",
    enableNotif: "enableNotifications",
    exchangeMtu: "mtu"
};

export function increaseProgress(steps: Step[], stepId: string, progress: number) {
    let currentStep = steps.find(step => step.id === stepId);
    if (currentStep) currentStep.progress += progress;
}

export function increaseRound(steps: Step[], stepId: string) {
    let currentStep = steps.find(step => step.id === stepId);
    if (currentStep) currentStep.currentRound += 1;
}

export function setMTUSize(peripheralId: string, selectedMtu: number, addLog: any) {
    return new Promise(async (resolve, reject) => {
        let ret = await BleManager.requestConnectionPriority(peripheralId, 1);

        addLog('Requesting MTU: ' + selectedMtu, LogLevel.INFO)

        let mtu = await BleManager.requestMTU(peripheralId, selectedMtu);

        addLog('MTU Size After Exchange: ' + mtu, LogLevel.INFO);
        resolve(mtu);
    });
}

export function write(writeChar: string, serviceUuid: string, bytesToWrite: any, dataSize: number, addLog: any, periphralId: string, testResult: TestResult) {
    addLog(`trying to write ${bytesToWrite} (${dataSize} size) to service: ${serviceUuid}, char: ${writeChar}`, LogLevel.WARNING)
    return new Promise<{ success: boolean, message?: string }>(async (resolve, reject) => {
        // Write data to characteristic 
        try {
            await BleManager.write(periphralId, serviceUuid, writeChar, bytesToWrite, dataSize);

            addLog('Writen: ' + bytesToWrite, LogLevel.SUCCESS);
            testResult!.write = true;
            resolve({ success: true });

        } catch (error) {
            addLog('write error: ' + error, LogLevel.ERROR);
            testResult!.write = false;
            testResult!.test_pass = false;
            testResult!.error_message = 'Failed Writing: ' + error;

            reject({ success: false, message: error });
        }
    });
}

export function read(readChar: string, serviceUuid: string, peripheralId: string, addLog: any, testResult: TestResult) {
    return new Promise(async (resolve, reject) => {
        // Write data to characteristic 
        try {
            let data = await BleManager.read(peripheralId, serviceUuid, readChar);
            addLog('Read: ' + data, LogLevel.SUCCESS);
            testResult.read = true;
            resolve(data.toString());

        } catch (error) {
            addLog('Read Error: ' + error, LogLevel.ERROR);
            testResult.read = false;
            testResult.test_pass = false;
            testResult.error_message = 'Faild Reading from Characterisric ' + readChar + ': ' + error;
            reject(error);
        }
    });

}

export async function handleExportLogs(logs: any[]) {
    const fileName = `logs_${getCurrentDateTimeString()}.txt`;
    const data = (logs.map(log => log.message)).join('\n');
    downloadDataToLocalStorage(data, fileName, 'text/plain')
};

export async function handleExportResults(testData: TestData) {
    const fileName = `test_results_${getCurrentDateTimeString()}.json`;
    const data = JSON.stringify(testData, null, 4);
    downloadDataToLocalStorage(data, fileName, 'application/json')
};

export function getNumOfPassed(testData: TestData): number {
    let pass = 0;
    testData.results.map((result) => {
        if (result.test_pass) pass++;
    })
    return pass;
}

//  https://developer.android.com/reference/android/bluetooth/BluetoothDevice?hl=en#connectGatt(android.content.Context,%20boolean,%20android.bluetooth.BluetoothGattCallback,%20int,%20int) 
export const PHY_OPTIONS = {
    phy_le_1m: { value: 1, label: '1M', id: '1' },
    phy_le_2m: { value: 2, label: '2M', id: '2' },
    phy_le_coded: { value: 3, label: 'LE CODED', id: '3' },
    phy_no_peffered: { value: 0, label: 'NO PREFERENCE', id: '0' },
}

export function hold(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

export function generateRandomBytes(count: number) {
    let range = 256;

    const result = Array(count);
    for (let i = 0; i < count; ++i) {
        result[i] = Math.floor(range * Math.random());
    }
    return result;
};

export function getCurrentDateTimeString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = `0${now.getMonth() + 1}`.slice(-2);
    const day = `0${now.getDate()}`.slice(-2);
    const hours = `0${now.getHours()}`.slice(-2);
    const minutes = `0${now.getMinutes()}`.slice(-2);
    const seconds = `0${now.getSeconds()}`.slice(-2);

    return `${month}-${day}-${year}_${hours}_${minutes}_${seconds}`;
};

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

export function checkIfTestingSupported(serviceUUID: string) {
    return (serviceUUID.toLocaleLowerCase() == TI_DATA_STREAM_SERVICE.uuid.toLocaleLowerCase() || serviceUUID.toLocaleLowerCase() == TI_SIMPLE_PERIPHERAL_SERVICE.uuid.toLocaleLowerCase())
}
