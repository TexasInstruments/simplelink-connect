import { View, StyleSheet, AsyncStorage, NativeEventEmitter, NativeModules, PermissionsAndroid, Platform, ScrollView } from 'react-native';
import { Text } from '../../Themed';
import React, { useEffect, useRef, useState } from 'react';
import Colors from '../../../constants/Colors';
import { TI_SIMPLE_PERIPHERAL_SERVICE, TI_DATA_STREAM_SERVICE } from '../../../constants/uuids';
import { useTestParamsContext } from '../../../context/TestParamsContext';
import { Buffer } from 'buffer';
import BleManager, { Peripheral } from 'react-native-ble-manager';
import { EventRegister } from 'react-native-event-listeners'
import TestStep from '../../Tests/TestStep';
import RNRestart from 'react-native-restart';
import DeviceInfo from 'react-native-device-info';
import { hold, getCurrentDateTimeString, generateRandomBytes, LogLevel, DeviceName, Step, StepsIDs, TestResult, TestData, increaseProgress, increaseRound, setMTUSize, write, read, handleExportLogs, handleExportResults, getNumOfPassed, TestParams, TEST_CASE, data_stream, simple_peripheral, sendEmail, NOTIFICATION_TIMEOUT } from '../testsUtils';
import ActionButtons from '../ActionButtons';
import IdleTimerManager from 'react-native-idle-timer';


const StressTestScenario: React.FC = ({ }) => {

    const { testParametersContext } = useTestParamsContext();

    if (!testParametersContext) {
        return null;
    }
    const [logs, setLogs] = useState<{ message: string, severity: string }[]>([{ message: 'Click on the button to start testing', severity: LogLevel.INFO }]);
    const [status, setStatus] = useState<string>('');
    const [currentDevice, setCurrentDevice] = useState<DeviceName>({ value: "", timestamp: 0 });

    const [isRunning, updateRunning] = useState<boolean>(false);
    const [loopFinished, setLoopFinished] = useState<boolean>(false);
    const [gattLoopFinished, setGattLoopFinished] = useState<boolean>(false);

    const steps = useRef<Step[]>([]);

    const currentAddressIndex = useRef<number>(0);
    const currentMainLoopNumber = useRef<number>(0);
    const currentGattLoopNumber = useRef<number>(0);

    const peripheralDiscoveredTimeout = useRef<any>(null);
    const connectTimeout = useRef<any>(null);
    const notifTimeout = useRef<any>(null);
    const firstNotifTimeout = useRef<any>(null);

    const testData = useRef<TestData | null>(null);
    const testResult = useRef<TestResult | null>(null);
    const notifChar = useRef<string>('');
    const serviceUUID = useRef<string>('');
    const peripheralInfo = useRef<Peripheral | null>(null);
    const startTime = useRef<number>(0);
    const startConnectionTime = useRef<number>(0);
    const testParameters = useRef<TestParams>(testParametersContext);

    const notificationSize = useRef<number>(0);

    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

    const connectionPromises: Promise<void>[] = [];

    const lastResults = useRef<TestData | null>(null);
    const lastLogs = useRef<{ message: string, severity: string }[]>([]);

    useEffect(() => {

        const initializeBluetooth = async () => {
            try {
                console.log('starting ble manager');
                if (Platform.OS === 'android') {
                    await requestAndroidPermissions();
                }
                await BleManager.start({ showAlert: true });
                console.log('starting ble manager');

            }
            catch (err) {
                console.log(err)
            }
        };

        initializeBluetooth();

        /* component mounting, disable lock screen sleep */
        IdleTimerManager.setIdleTimerDisabled(true, 'stress-test-screen');

        return () => {
            /* component unmounting, enable lock screen sleep */
            IdleTimerManager.setIdleTimerDisabled(false, 'stress-test-screen');


            stopTest();
        };

    }, []);

    useEffect(() => {
        testParameters.current = testParametersContext;
        console.log("Test Parametrts:", JSON.stringify(testParameters.current, null, 2));
        runTestScenario();
    }, [testParametersContext,]);

    // Trigger next loop when the loop finished
    useEffect(() => {

        const trigger = async () => {
            if (loopFinished && currentMainLoopNumber.current != 0) {
                bleManagerEmitter.removeAllListeners('BleManagerStopScan')
                bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral')
                try {
                    increaseRound(steps.current, StepsIDs.disconnect);
                    increaseProgress(steps.current, StepsIDs.disconnect, 0.3);
                    let isConnected = await BleManager.isPeripheralConnected(peripheralInfo.current!.id, [])
                    if (isConnected) {
                        let res = await disconnectPeripheral(peripheralInfo.current!.id);

                        // stop connection duration timer 
                        let endConnectionTime = performance.now();
                        let connectionDuration = endConnectionTime - startConnectionTime.current;

                        if (!res.success) {
                            testResult.current!.connection_duration_ms = connectionDuration;
                            testResult.current!.disconnected = false;
                            testResult.current!.test_pass = false;
                            testResult.current!.error_message = "Disconnect Peripheral Failed" + res.message;
                        }

                        else {
                            testResult.current!.connection_duration_ms = connectionDuration;
                            testResult.current!.disconnected = true;
                        }
                    }
                }
                catch (err) {
                    increaseProgress(steps.current, StepsIDs.disconnect, 1);
                    // resetProgresses();
                }

                triggerNextMainLoop();
            }
        }

        trigger();

    }, [loopFinished]);

    // Trigger next loop when the loop finished
    useEffect(() => {

        if (gattLoopFinished && currentGattLoopNumber.current > 0) {
            increaseRound(steps.current, StepsIDs.gattTesting);

            triggerNextGattLoop();
        }

    }, [gattLoopFinished]);

    // Start loop when device changed
    useEffect(() => {
        const triggerNextDevice = async () => {
            if (currentDevice!.value) {
                EventRegister.removeAllListeners();
                EventRegister.removeEventListener('ExecuteMainLoop');

                const mainLoopListener = EventRegister.addEventListener('ExecuteMainLoop', (loopNum: number) => {
                    executeMainLoop(loopNum);
                })

                let writeChar: string;
                let readWriteChar: string;

                if (testParameters.current.test_case === TEST_CASE.WRITE_NOTIFY) {
                    if (testParameters.current.supported_service == simple_peripheral) {
                        serviceUUID.current = TI_SIMPLE_PERIPHERAL_SERVICE.uuid;
                        notifChar.current = TI_SIMPLE_PERIPHERAL_SERVICE.simpleprofile_char4;
                        writeChar = TI_SIMPLE_PERIPHERAL_SERVICE.simpleprofile_char3;
                    }
                    else { //data_stream
                        serviceUUID.current = TI_DATA_STREAM_SERVICE.uuid;
                        notifChar.current = TI_DATA_STREAM_SERVICE.data_out_char;
                        writeChar = TI_DATA_STREAM_SERVICE.data_in_char;
                    }

                    const gattLoopListener = EventRegister.addEventListener('ExecuteGattLoop', (gattLoopNum: number) => {
                        executeWriteNotifSimpleGatt(gattLoopNum, serviceUUID.current, notifChar.current, writeChar)
                    })

                }

                else { // WRITE_READ
                    if (testParameters.current.supported_service == simple_peripheral) {
                        serviceUUID.current = TI_SIMPLE_PERIPHERAL_SERVICE.uuid;
                        readWriteChar = TI_SIMPLE_PERIPHERAL_SERVICE.simpleprofile_char1;
                        const gattLoopListener = EventRegister.addEventListener('ExecuteGattLoop', (gattLoopNum: number) => {
                            executeWriteReadSimpleGatt(gattLoopNum, serviceUUID.current, readWriteChar)
                        })
                    }
                }
                initiateSteps();

                addLog('Start Running Test Scenario on ' + currentDevice.value + ' Peripheral ' + testParameters.current.main_loop_number + ' Times', LogLevel.INFO);
                triggerNextMainLoop();
            }
        }
        EventRegister.removeAllListeners();

        const initiateSteps = () => {

            let device = currentDevice.value;
            let newSteps: Step[] =
                [
                    {
                        id: StepsIDs.scan,
                        title: "Scan and Discover Device",
                        desc: `Start scanning and look for ${device} device`,
                        progress: 0,
                        totalRounds: testParameters.current.main_loop_number,
                        currentRound: 0
                    },

                ]
            if (testParameters.current.pair_and_bond) {
                newSteps = [...newSteps,
                {
                    id: StepsIDs.pairAndBond,
                    title: "Pair and Bond",
                    desc: `Create bond with discovered device`,
                    progress: 0,
                    totalRounds: testParameters.current.main_loop_number,
                    currentRound: 0
                }
                ]
            }
            newSteps = [...newSteps,
            {
                id: StepsIDs.connect,
                title: "Connect to the Device",
                desc: `Establish connection, set PHY and exchange MTU`,
                progress: 0,
                totalRounds: testParameters.current.main_loop_number,
                currentRound: 0
            },
            ]

            if (testParameters.current.gatt_data_testing) {

                let writeChar;
                if (testParameters.current.supported_service == data_stream) {
                    writeChar = TI_DATA_STREAM_SERVICE.data_in_char;
                }
                else { // simple_peripheral
                    if (testParameters.current.test_case == TEST_CASE.WRITE_NOTIFY) {
                        writeChar = TI_SIMPLE_PERIPHERAL_SERVICE.simpleprofile_char3;
                    }
                    else {
                        writeChar = TI_SIMPLE_PERIPHERAL_SERVICE.simpleprofile_char1;
                    }
                }
                let desc = testParameters.current.test_case == TEST_CASE.WRITE_NOTIFY ?
                    `Write ${testParameters.current.write_data_size} random bytes to ${writeChar} and wait for notification of size ${testParameters.current.expected_notifications_size}, ${testParameters.current.num_loops_gatt_test} times.` :
                    `Write ${testParameters.current.write_data_size} random bytes to ${writeChar} and read its value, ${testParameters.current.num_loops_gatt_test} times.`

                newSteps = [...newSteps,
                {
                    id: StepsIDs.gattTesting,
                    title: "Execute GATT Testing",
                    desc: desc,
                    progress: 0,
                    totalRounds: testParameters.current.main_loop_number * testParameters.current.num_loops_gatt_test,
                    currentRound: 0
                }]

            }

            newSteps = [...newSteps, {
                id: StepsIDs.disconnect,
                title: "Disconnect",
                desc: `Disconnecting from ${device}`,
                progress: 0,
                totalRounds: testParameters.current.main_loop_number,
                currentRound: 0
            }]
            steps.current = newSteps;

        }

        triggerNextDevice();


    }, [currentDevice]);

    function resetProgresses() {
        steps.current.map(s => s.progress = 0)
    }

    async function requestAndroidPermissions(): Promise<void> {
        if (Platform.OS === 'android') {
            try {
                if (Platform.Version >= 31) {
                    await PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
                    ]);
                }
                // Android 11 and lower 
                else {
                    await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    );

                    // First time asking for permission - need to reload the app
                    const hasAskedPermission = await AsyncStorage.getItem('hasAskedPermission');
                    if (hasAskedPermission !== 'true') {
                        await AsyncStorage.setItem('hasAskedPermission', 'true');
                        RNRestart.Restart();
                    }
                }

                console.log('got permissions')
                Promise.resolve();

            } catch (error) {
                console.error('Android permissions error: ', error);
            }
        }
        else {
            Promise.resolve();
        }
    }

    async function connectPeripheral(peripheral: Peripheral) {
        const peripheralId = peripheral.id;


        // if "Pair and Bond" is true we should connect with bond.
        if (Platform.OS == 'android' && testParameters.current.pair_and_bond) {
            increaseRound(steps.current, StepsIDs.pairAndBond);
            increaseProgress(steps.current, StepsIDs.pairAndBond, 0.2);
            let isBonded = await isPeripheralBonded(peripheralInfo.current!!.id);
            if (!isBonded) {
                try {
                    addLog('Trying to bond peripheral ' + peripheralId, LogLevel.INFO);
                    increaseProgress(steps.current, StepsIDs.pairAndBond, 0.4);

                    await createBond(peripheralInfo.current!!.id);
                    increaseProgress(steps.current, StepsIDs.pairAndBond, 1);

                    testResult.current!.bonded = true;

                } catch (error: any) {
                    increaseProgress(steps.current, StepsIDs.pairAndBond, 1);
                    testResult.current!.bonded = false;
                    testResult.current!.test_pass = false;
                    testResult.current!.error_message = error;
                    testData.current?.results.push(testResult.current!);
                    if (currentMainLoopNumber.current >= 3) {
                        // if this is the 3rd attept, move to the next device,
                        addLog('Failed create bond after 3 attepts, Move to the next device', LogLevel.ERROR);

                        currentMainLoopNumber.current = 0;

                        // Trigger next device
                        nextDevice();
                    }

                    setLoopFinished(true);
                    return;
                }
            }
            else {
                increaseProgress(steps.current, StepsIDs.pairAndBond, 1)
                addLog('Peripheral already bond.', LogLevel.INFO)
            }

        }

        addLog('Trying connect to peripheral ' + peripheralId, LogLevel.INFO);

        increaseRound(steps.current, StepsIDs.connect);

        // Setting connection timeout
        connectTimeout.current = setTimeout(() => {
            BleManager.isPeripheralConnected(peripheral.id, []).then((isConnected: any) => {
                if (isConnected) {
                    console.log('Peripheral is connected!');
                } else {
                    addLog('Peripheral connection timeout', LogLevel.ERROR);
                    bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');

                    testResult.current!.test_pass = false;
                    testResult.current!.connection = false;
                    testResult.current!.error_message = 'Peripheral connection timeout';

                    testData.current?.results.push(testResult.current!);

                    clearTimeout(connectTimeout.current);
                    increaseProgress(steps.current, StepsIDs.connect, 1);
                    // Move to the next loop
                    setLoopFinished(true);

                }
            });
        }, 5000);
        increaseProgress(steps.current, StepsIDs.connect, 0.10)

        // Check if there are any pending connection promises
        // if (connectionPromises.length > 0) {
        //     console.log('Another connection is already in progress');
        //     return;
        // }

        // Create a new promise for the connection
        const connectionPromise: Promise<void> = new Promise((resolve, reject) => {
            let options = Platform.OS === 'android' ? { phy: testParameters.current.connection_phy } : undefined
            BleManager.connect(peripheralId, options)
                .then(() => {
                    increaseProgress(steps.current, StepsIDs.connect, 0.30);
                    addLog('Device Connected', LogLevel.SUCCESS);
                    clearTimeout(connectTimeout.current);
                    testResult.current!.connection = true;

                    resolve();

                })
                .catch((error: any) => {
                    addLog('Connection Failed: ' + error.toString(), LogLevel.ERROR);

                    testResult.current!.connection = false;
                    testResult.current!.test_pass = false;
                    testResult.current!.error_message = error.toString();
                    testData.current?.results.push(testResult.current!);

                    setLoopFinished(true);
                    increaseProgress(steps.current, StepsIDs.connect, 1)
                    clearTimeout(connectTimeout.current);
                    reject(error); // Reject the promise on connection error
                });
        });

        // Add the promise to the global array
        connectionPromises.push(connectionPromise);

        // Execute the connection promise
        connectionPromise
            .then(async () => {
                // Start timer for connection duration
                startConnectionTime.current = performance.now();

                testResult.current!.connection = true;
                increaseProgress(steps.current, StepsIDs.connect, 1)

                // Connection resolved, remove it from the array
                const index = connectionPromises.indexOf(connectionPromise);
                if (index !== -1) {
                    connectionPromises.splice(index, 1);
                }
                startGattTesting();

            })
            .catch((error) => {
                // Connection rejected, remove it from the array
                const index = connectionPromises.indexOf(connectionPromise);
                if (index !== -1) {
                    connectionPromises.splice(index, 1);
                }
                testResult.current!.connection = false;
                setLoopFinished(true)
            });

    }

    function createBond(peripheralId: string) {
        return new Promise(async (resolve, reject) => {

            try {
                await BleManager.createBond(peripheralId);
                addLog('Device Bonded', LogLevel.SUCCESS);
                resolve(null);

            } catch (error: any) {
                addLog('Bonded Failed: ' + error, LogLevel.ERROR);
                reject(error);
            }
        });
    }

    function removeBond(peripheralId: string) {
        return new Promise(async (resolve, reject) => {

            try {
                await BleManager.removeBond(peripheralId).then(() => {
                    addLog('Bond Removed from ' + peripheralId, LogLevel.SUCCESS);
                    resolve(null);
                });
            } catch (error: any) {
                addLog('Remove Bonded Failed: ' + error, LogLevel.ERROR);
                reject(error);
            }
        });
    }

    function handleDiscoverPeripheral(peripheral: Peripheral) {
        console.log(peripheral.id)
        return new Promise((resolve, reject) => {
            // Founded the requested peripheral
            if (peripheral.name?.toLocaleLowerCase() === currentDevice.value.toLocaleLowerCase() || peripheral.advertising.localName?.toLocaleLowerCase() === currentDevice.value.toLocaleLowerCase()) {
                addLog('Found requested peripheral!', LogLevel.SUCCESS);
                increaseProgress(steps.current, StepsIDs.scan, 1);

                peripheralInfo.current = peripheral;
                clearTimeout(peripheralDiscoveredTimeout.current)
                bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
                addLog('Stop Scanning', LogLevel.INFO);
                bleManagerEmitter.removeAllListeners('BleManagerStopScan');
                scan(false);
                connectPeripheral(peripheral);
                resolve(peripheral);
            }
        });
    }

    function handleStopScan(): void {
        // Continue Scanning if stopped
        scan(true);
    }

    async function scan(enabled: boolean): Promise<void> {
        if (enabled) {
            BleManager.scan([], 5, true)
                .then(() => {
                    addLog('Scanning... search for peripheral ' + currentDevice.value, LogLevel.INFO)
                })
                .catch((error: any) => {
                    addLog('Failed Scanning' + error.toString(), LogLevel.ERROR);

                    testResult.current!.test_pass = false;
                    testResult.current!.connection = false;
                    testResult.current!.error_message = 'Scanning Failed: ' + error.toString();

                    setLoopFinished(true);
                });
        }

        else {
            await BleManager.stopScan();
        }
    }

    function addLog(message: string, severity: string) {
        console.log(message)
        setLogs((prevLogs) => [...prevLogs, { message: `[${new Date().toTimeString().split(' ')[0]}] ${message}`, severity: severity }]);
        if (severity !== LogLevel.INFO) {
            setStatus(message);
        }
    }

    function isPeripheralBonded(peripheralId: string) {
        return new Promise<boolean>(async (resolve, reject) => {
            // Check if the peripheral is bonded, if so, remove the bond
            let bondedPeripherals = await BleManager.getBondedPeripherals();
            resolve((bondedPeripherals.find((p: Peripheral) => p.id === peripheralId)) ? true : false);
        })
    }

    function disconnectPeripheral(peripheralId: string): Promise<{ success: boolean, message: string }> {
        return new Promise(async (resolve, reject) => {

            BleManager.disconnect(peripheralId)
                .then(() => {
                    addLog('Peripheral disconnected!', LogLevel.SUCCESS);
                    increaseProgress(steps.current, StepsIDs.disconnect, 1);
                    resolve({ success: true, message: "" });
                })
                .catch((error: any) => {
                    addLog('Error while disconnecting periheral: ' + error, LogLevel.ERROR);
                    reject({ success: false, message: error })
                });
        })
    };

    function initiateTestValues() {
        currentGattLoopNumber.current = 0;
        currentMainLoopNumber.current = 0;
        currentAddressIndex.current = 0;
        testData.current = null;
        testResult.current = {
            main_loop_number: currentMainLoopNumber.current,
            device_name: currentDevice.value,
            test_pass: true
        }
    }

    async function stopTest() {

        bleManagerEmitter.removeAllListeners('BleManagerStopScan');
        bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
        bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
        bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');

        clearTimeout(connectTimeout.current);
        clearTimeout(peripheralDiscoveredTimeout.current);
        clearTimeout(notifTimeout.current);
        clearTimeout(firstNotifTimeout.current);

        // stop scanning and disconnect
        await stopScanAndDisconnect(peripheralInfo.current!.id);

        let endTime = performance.now();
        testData.current!.info.total_execution_time_ms = endTime - startTime.current;

        addLog('Test stopped!', LogLevel.INFO);

        lastResults.current = testData.current;
        lastLogs.current = logs;

        initiateTestValues();

        updateRunning(false);

    }

    async function stopScanAndDisconnect(peripheralId: string) {
        return new Promise(async (resolve, reject) => {
            await BleManager.stopScan();
            addLog('Stopped scanning', LogLevel.INFO);

            let isConnected = await BleManager.isPeripheralConnected(peripheralId, [])

            if (isConnected) {
                addLog('Peripheral is connected, trying to disconnect', LogLevel.WARNING);
                await disconnectPeripheral(peripheralId)
            }
            else {
                addLog('Peripheral is disconnected', LogLevel.INFO);
            }
            resolve(null);
        })
    }

    async function triggerNextMainLoop() {

        // End Main Loop
        if (currentMainLoopNumber.current >= testParameters.current.main_loop_number) {
            addLog('Finished Main Loops for ' + currentDevice.value, LogLevel.SUCCESS);
            if (currentAddressIndex.current < testParameters.current.devices_name_list.length) {
                currentMainLoopNumber.current = 0;
            }

            // Trigger next device
            nextDevice();
        }

        // Trigger Next Loop
        else {

            if (currentMainLoopNumber.current >= 1) {
                addLog('Sleeping before next iteration for ' + testParameters.current.delay_between_main_loops + ' ms', LogLevel.WARNING)
                await hold(testParameters.current.delay_between_main_loops)
                resetProgresses();
            }

            currentMainLoopNumber.current += 1;

            // Create new result object
            testResult.current = {
                main_loop_number: currentMainLoopNumber.current,
                device_name: currentDevice.value,
                test_pass: true
            }

            addLog('Main Loop ' + currentMainLoopNumber.current + ' From ' + testParameters.current.main_loop_number + ' Loops ', LogLevel.ERROR);
            EventRegister.emit('ExecuteMainLoop', currentMainLoopNumber.current)
        }
    }

    function executeMainLoop(loopNum: number) {

        if (loopNum === 0) { return }

        setLoopFinished(false);
        addLog('Loop number: ' + loopNum, LogLevel.INFO);

        bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
        bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);

        // Set timeout for discovering the peripheral
        peripheralDiscoveredTimeout.current = setTimeout(async () => {
            addLog('Scanning Timeout after 12000 ms', LogLevel.ERROR);
            bleManagerEmitter.removeAllListeners('BleManagerStopScan');
            bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');

            // stop scanning and disconnect
            await BleManager.stopScan();
            addLog('Stopped scanning', LogLevel.INFO);

            testResult.current!.test_pass = false;
            testResult.current!.connection = false;
            testResult.current!.error_message = "Scanning timed out after 12000 ms, device not found";

            // Save results
            testData.current?.results.push(testResult.current!);

            // Move to the next loop
            setLoopFinished(true);
        }, 12000);
        increaseProgress(steps.current, StepsIDs.scan, 0.15);
        increaseRound(steps.current, StepsIDs.scan);
        // Scan for input bd device
        scan(true);

    }

    function nextDevice() {
        // Test is finished
        if (currentAddressIndex.current >= testParameters.current.devices_name_list.length) {
            EventRegister.removeAllListeners();

            let endTime = performance.now();
            testData.current!.info.total_execution_time_ms = endTime - startTime.current;
            addLog(JSON.stringify(testData.current, null, 2), LogLevel.INFO);

            addLog('Test Finished!', LogLevel.SUCCESS);

            lastResults.current = testData.current;
            lastLogs.current = logs;

            updateRunning(false);

        }

        // Trigger test with next bd device
        else {
            let nextDevice = testParameters.current.devices_name_list[currentAddressIndex.current];
            setCurrentDevice({ value: nextDevice, timestamp: Date.now() });
            currentAddressIndex.current += 1;
        }
    }

    async function runTestScenario() {

        startTime.current = performance.now();
        setLogs([]);

        try {

            // Clean all bonding data 
            if (Platform.OS === 'android') {
                let bondedPeripherals = await BleManager.getBondedPeripherals();
                for (const bp of bondedPeripherals) {
                    if (bp.name && testParameters.current.devices_name_list.includes(bp.name)) {
                        addLog('Trying to remove ' + bp.id + ' bond', LogLevel.INFO)
                        await removeBond(bp.id);
                    }
                }
            }


            EventRegister.removeEventListener('ExecuteMainLoop');

            // Initialize Test Data and Results
            testData.current = {
                info: {
                    date: getCurrentDateTimeString(),
                    platform: Platform.OS,
                    device_model: DeviceInfo.getModel(),
                    os_version: DeviceInfo.getSystemVersion(),
                    app_version: DeviceInfo.getVersion(),
                    total_execution_time_ms: 0
                },
                test_parameters: {
                    devices_list: testParameters.current.devices_name_list,
                    num_of_devices: testParameters.current.devices_name_list.length,
                    num_of_main_loops: testParameters.current.main_loop_number,
                    gatt_testing_selected: testParameters.current.gatt_data_testing,
                    test_case: testParameters.current.test_case,
                    num_of_gatt_loops: testParameters.current.num_loops_gatt_test,
                    supported_profile: testParameters.current.supported_service,
                    pair_and_bond: testParameters.current.pair_and_bond
                },
                results: []
            }

            if (testParameters.current.devices_name_list.length == 0) {
                addLog('Your Device List is empty, please add a device', LogLevel.WARNING)
            }

            updateRunning(true);
            nextDevice();

        } catch (error: any) {
            addLog('Error Running Test' + error, LogLevel.ERROR)
            updateRunning(false);
        }
    };

    async function executeWriteNotifSimpleGatt(gattLoopNum: number, serviceUuid: string, notifChar: string, writeChar: string) {

        if (gattLoopNum === 0) { return };
        setGattLoopFinished(false);

        const randomBytes = generateRandomBytes(testParameters.current.write_data_size);
        // Write to characteristic
        try {
            // start timeout for notification
            notifTimeout.current = setTimeout(() => {
                addLog('Notification timeout after 20 seconds', LogLevel.ERROR);
                testResult.current.got_expected_notification = false;
                testResult.current.test_pass = false;
                testResult.current.error_message = 'Notification timeout after 20 seconds';

                setGattLoopFinished(true);
            }, NOTIFICATION_TIMEOUT);

            await write(writeChar, serviceUuid, randomBytes, testParameters.current.write_data_size, addLog, peripheralInfo.current?.id, testResult.current);


        } catch (e) {
            setGattLoopFinished(true);
            return
        }

    }

    async function executeWriteReadSimpleGatt(gattLoopNum: number, serviceUuid: string, readWriteChar: string) {

        if (gattLoopNum === 0) { return };

        setGattLoopFinished(false);


        // Write to characteristic
        increaseProgress(steps.current, StepsIDs.gattTesting, 0.20);

        const randomBytes = generateRandomBytes(testParameters.current.write_data_size);
        let readenData;
        try {
            await write(readWriteChar, serviceUuid, randomBytes, testParameters.current.write_data_size, addLog, peripheralInfo.current?.id!, testResult.current!);
            increaseProgress(steps.current, StepsIDs.gattTesting, 0.40);
            readenData = await read(readWriteChar, serviceUuid, peripheralInfo.current?.id!, addLog, testResult.current!);
            increaseProgress(steps.current, StepsIDs.gattTesting, 1);

        } catch (e) {
            increaseProgress(steps.current, StepsIDs.gattTesting, 1);
            setGattLoopFinished(true);
            return
        }

        // check if readen data equal to writen data
        if (readenData == randomBytes) {
            testResult.current!.read_expected_value = true;
            testResult.current!.test_pass = true;
            testResult.current!.error_message = "";
            setGattLoopFinished(true);
        }
        else {
            testResult.current!.read_expected_value = false;
            testResult.current!.test_pass = false;
            testResult.current!.error_message = "Read value does not macth to the write value";
            setGattLoopFinished(true);
        }

    }

    async function triggerNextGattLoop() {

        // Save previous results
        if (currentGattLoopNumber.current > 0 && testResult.current) {
            // testResult.current!.testPass = true;
            testData.current!.results.push(testResult.current)
        }

        // End Main Loop
        if (currentGattLoopNumber.current >= testParameters.current.num_loops_gatt_test) {
            addLog('Finished GATT loops for ' + currentDevice.value, LogLevel.SUCCESS);
            currentGattLoopNumber.current = 0;
            bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
            if (testParameters.current.test_case === TEST_CASE.WRITE_NOTIFY) { // Disable Notifications if needed
                console.log("Disable Notification")
                BleManager.stopNotification(peripheralInfo.current!.id, serviceUUID.current, notifChar.current);
            }
            setLoopFinished(true);
        }

        // Trigger Next Loop
        else {

            if (currentGattLoopNumber.current >= 1) {
                addLog('Sleeping before next gatt test for ' + testParameters.current.delay_between_gatt_tests + ' ms', LogLevel.WARNING)
                await hold(testParameters.current.delay_between_gatt_tests);
                // Initiate execute gatt loop step progress
                let s = steps.current.find(step => step.id == StepsIDs.gattTesting);
                if (s) s.progress = 0;
            }

            currentGattLoopNumber.current += 1;

            // Create new result object
            testResult.current = {
                main_loop_number: currentMainLoopNumber.current,
                device_name: currentDevice.value,
                gatt_test_loop_number: currentGattLoopNumber.current,
                connection: true,
                test_pass: true,
            }

            testParameters.current.pair_and_bond ? testResult.current!.bonded = true : null;
            notificationSize.current = 0;
            addLog('GATT Loop ' + currentGattLoopNumber.current + ' From ' + testParameters.current.num_loops_gatt_test, LogLevel.ERROR);
            EventRegister.emit('ExecuteGattLoop', currentGattLoopNumber.current)
        }
    }

    async function startGattTesting() {
        if (testParameters.current.gatt_data_testing) {
            increaseProgress(steps.current, StepsIDs.gattTesting, 0.10);

            let s = await BleManager.retrieveServices(peripheralInfo.current?.id!);

            // Update MTU value - Android only API 21+, iOS initiates an MTU exchange automatically upon connection
            if (Platform.OS === 'android') {
                increaseProgress(steps.current, StepsIDs.gattTesting, 0.20);

                await setMTUSize(peripheralInfo.current?.id!, testParameters.current.mtu_size, addLog)
            }

            // Enable notifications
            if (testParameters.current.test_case === TEST_CASE.WRITE_NOTIFY) {
                addLog('Enabling Notifications', LogLevel.INFO)
                try {

                    // In TI simple peripheral service a notification should be received when enabling notifications.
                    if (testParameters.current.supported_service == simple_peripheral && currentGattLoopNumber.current == 0) {
                        await new Promise<void>((resolve, reject) => {
                            // Step 1: Add the listener for notifications
                            const notificationListener = bleManagerEmitter.addListener(
                                'BleManagerDidUpdateValueForCharacteristic',
                                ({ value, peripheral, characteristic, service }) => {
                                    if (characteristic.toLocaleLowerCase().includes(notifChar.current.toLocaleLowerCase())) {
                                        let hexString = Buffer.from(value).toString('hex');
                                        addLog(`First Notification Received: ${hexString}`, LogLevel.SUCCESS);

                                        // Clean up the listener and timeout
                                        notificationListener.remove();
                                        clearTimeout(firstNotifTimeout.current);

                                        triggerNextGattLoop();

                                        // Resolve the promise to allow the process to continue
                                        resolve();
                                    }
                                }
                            );

                            // Step 2: Start notifications after the listener is added
                            addLog('Enable notification', LogLevel.SUCCESS);
                            BleManager.startNotification(peripheralInfo.current!.id, serviceUUID.current, notifChar.current)
                                .then(() => {
                                    console.log('Notification started, waiting for the first notification...');
                                })
                                .catch((error) => {
                                    addLog(`Failed to start notifications: ${error}`, LogLevel.ERROR);
                                    notificationListener.remove();
                                    reject(error);
                                });

                            // Step 3: Set up a timeout in case no notification is received
                            firstNotifTimeout.current = setTimeout(() => {
                                addLog(`Timeout waiting for the first notification`, LogLevel.ERROR);
                                notificationListener.remove();
                                reject(new Error('Timeout waiting for the first notification'));
                            }, NOTIFICATION_TIMEOUT);
                        });

                    }
                    else if (testParameters.current.supported_service != simple_peripheral) {
                        await BleManager.startNotification(peripheralInfo.current!.id, serviceUUID.current, notifChar.current);

                    }

                    increaseProgress(steps.current, StepsIDs.gattTesting, 0.40);

                } catch (error: any) {
                    addLog('Error starting notifications: ' + error, LogLevel.ERROR);
                    testResult.current!.write = false;
                    testResult.current!.test_pass = false;
                    if (error) testResult.current!.error_message = error;
                    testData.current?.results.push(testResult.current!);
                    setLoopFinished(true)
                    return;
                }

                // Register to notifications
                bleManagerEmitter.addListener(
                    'BleManagerDidUpdateValueForCharacteristic',
                    ({ value, peripheral, characteristic, service }) => {

                        // Got the relevant notification
                        if (characteristic.toLocaleLowerCase().includes(notifChar.current.toLocaleLowerCase())) {
                            // Clear the notification timeout
                            clearTimeout(notifTimeout.current);

                            let hexString = ''
                            hexString = Buffer.from(value).toString('hex');
                            addLog(`Got Notification ${value} with size: ` + value.length, LogLevel.SUCCESS);

                            notificationSize.current += value.length;
                            // Check the notification is in the expected size
                            if (notificationSize.current == testParameters.current.expected_notifications_size) {
                                testResult.current.got_expected_notification = true;
                                increaseProgress(steps.current, StepsIDs.gattTesting, 1);
                                setGattLoopFinished(true);
                            }

                            // Got bigger notification
                            else if (notificationSize.current > testParameters.current.expected_notifications_size) {
                                testResult.current.got_expected_notification = false;
                                testResult.current!.test_pass = false;
                                testResult.current!.error_message = "Notification size does not macth to expected size";
                                increaseProgress(steps.current, StepsIDs.gattTesting, 1);
                                setGattLoopFinished(true);

                            }

                            else { // else - need to wait for another notification
                                increaseProgress(steps.current, StepsIDs.gattTesting, notificationSize.current / testParameters.current.expected_notifications_size);
                                addLog(`Waiting for notification size ${testParameters.current.expected_notifications_size - notificationSize.current}`, LogLevel.INFO)
                                // start new timeout for notification
                                notifTimeout.current = setTimeout(() => {
                                    addLog(`Notification timeout after ${NOTIFICATION_TIMEOUT} ms`, LogLevel.ERROR);
                                    testResult.current!.got_expected_notification = false;
                                    testResult.current!.test_pass = false;
                                    testResult.current!.error_message = `Notification timeout after ${NOTIFICATION_TIMEOUT} ms`;

                                    setGattLoopFinished(true);
                                }, NOTIFICATION_TIMEOUT);
                            }




                        }
                    }
                );
            }

            // Execute gatt test for testParameters.current.num_loops_gatt_test
            if (testParameters.current.test_case === TEST_CASE.WRITE_NOTIFY) {
                if (testParameters.current.supported_service != simple_peripheral) {
                    triggerNextGattLoop();
                }
            }
            else {
                triggerNextGattLoop();
            }
        }
        else {
            // Wait before disconnect
            addLog('Sleeping before disconnect for ' + testParameters.current.connection_duration + ' ms', LogLevel.WARNING);
            await hold(testParameters.current.connection_duration);

            // Test finished
            testResult.current!.test_pass = true;

            testData.current!.results.push(testResult.current!);

            setLoopFinished(true);
        }
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', }]}>
                <Text style={{ fontWeight: 'bold', fontSize: 20 }}>
                    {testParameters.current.supported_service} Test
                </Text>
            </View>

            {currentDevice.value && (
                <View style={[styles.box, { marginTop: 3 }]}>
                    <View style={[styles.textContainer]}>
                        <Text style={[styles.title]}>
                            Execution Status
                        </Text>

                        <Text style={[styles.desc]}>
                            Current Device: {currentDevice.value} ({currentAddressIndex.current}/{testParameters.current.devices_name_list.length})
                        </Text>
                        <Text style={[styles.desc]}>
                            Current Main Loop: {currentMainLoopNumber.current}/{testParameters.current.main_loop_number}
                        </Text>
                    </View>
                </View>
            )
            }
            <View style={[styles.stepsContainer]}>
                <ScrollView>

                    {
                        steps.current.map(step => {
                            return (
                                <TestStep
                                    key={step.id}
                                    stepName={step.title}
                                    desc={step.desc}
                                    progress={step.progress}
                                    totalRounds={step.totalRounds}
                                    currentRound={step.currentRound} />
                            )

                        })
                    }
                </ScrollView>

                {
                    !isRunning && testData.current?.results && (
                        <View style={[{ ...styles.stateContainer, paddingTop: 5 }]}>
                            <Text numberOfLines={1}>
                                <Text style={[styles.stateText]}>Total: </Text> {getNumOfPassed(testData.current!)} passed, {testData.current!.results.length - getNumOfPassed(testData.current!)} failed!
                            </Text>
                        </View>
                    )
                }
                {
                    isRunning && status && (
                        <View style={[{ ...styles.stateContainer, paddingTop: 5 }]}>
                            <Text numberOfLines={1}>
                                <Text style={[styles.stateText]}>Status: </Text>{status}
                            </Text>
                        </View>
                    )
                }
            </View>
            <ActionButtons runAgain={() => { initiateTestValues(); runTestScenario(); }} isRunning={isRunning} stopTest={stopTest} handleExportLogs={() => handleExportLogs(lastLogs.current)} handleExportResults={() => handleExportResults(lastResults.current!)} />

        </View >
    );
};

const styles = StyleSheet.create({
    stepsContainer: {
        padding: 10,
        flex: 1,
        maxHeight: '80%'
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: 4,
    },
    stateContainer: {
        paddingLeft: 15,
        paddingTop: 10,
    },
    stateText: {
        fontWeight: 'bold',
    },
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
    },
    header: {
        backgroundColor: Colors.lightGray,
        padding: 10,
        alignItems: 'center',
    },
    box: {
        borderRadius: 22,
        minHeight: 60,
        paddingHorizontal: 16,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    textContainer: {
        maxWidth: '80%'
    },
    title: {
        fontSize: 15,
        lineHeight: 25,
        fontWeight: 'bold',
        letterSpacing: 0.25,
    },
    desc: {
        fontSize: 13,
        letterSpacing: 0.25,
    },
});

export default StressTestScenario;