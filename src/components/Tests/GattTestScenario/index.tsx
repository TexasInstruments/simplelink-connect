import { StyleSheet, NativeEventEmitter, NativeModules, Platform, View } from 'react-native';
import { Text } from '../../Themed';
import React, { useEffect, useRef, useState } from 'react';
import Colors from '../../../constants/Colors';
import { TI_SIMPLE_PERIPHERAL_SERVICE, TI_DATA_STREAM_SERVICE } from '../../../constants/uuids';
import { useTestParamsContext } from '../../../context/TestParamsContext';
import { hold, getCurrentDateTimeString, generateRandomBytes, NOTIFICATION_TIMEOUT } from '../testsUtils';
import { Buffer } from 'buffer';
import BleManager, { Peripheral } from 'react-native-ble-manager';
import { EventRegister } from 'react-native-event-listeners'
import DeviceInfo from 'react-native-device-info';
import { LogLevel, DeviceName, Step, StepsIDs, TestResult, TestData, increaseProgress, increaseRound, setMTUSize, write, read, handleExportLogs, handleExportResults, getNumOfPassed, TestParams, data_stream, TEST_CASE, simple_peripheral } from '../testsUtils';
import TestStep from '../TestStep';
import ActionButtons from '../ActionButtons';
import LoaderKit from 'react-native-loader-kit'
import IdleTimerManager from 'react-native-idle-timer';
import { ScrollView } from 'react-native-gesture-handler';

interface Props {
    testService: string | null,
    peripheralId: string | null,
    peripheralName: string | null
}

const GattTestScenario: React.FC<Props> = ({ testService, peripheralId, peripheralName }: Props) => {

    const { testParametersContext } = useTestParamsContext();
    if (!testParametersContext || !peripheralName || !peripheralId || !testService) {
        return null;
    }
    const [logs, setLogs] = useState<{ message: string, sevirity: string }[]>([{ message: 'Click on the button to start testing', sevirity: LogLevel.INFO }]);
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [currentDevice, setCurrentDevice] = useState<DeviceName>({ value: "", timestamp: 0 });

    const [isRunning, updateRunning] = useState<boolean>(false);
    const [gattLoopFinished, setGattLoopFinished] = useState<boolean>(false);

    const steps = useRef<Step[]>([]);

    const currentMainLoopNumber = useRef<number>(0);
    const currentGattLoopNumber = useRef<number>(0);

    const testData = useRef<TestData | null>(null);
    const testResult = useRef<TestResult | null>(null);
    const notifChar = useRef<string>('');
    const serviceUUID = useRef<string>('');
    const periphralfInfo = useRef<Peripheral | null>(null);
    const startTime = useRef<number>(0);
    const testParameters = useRef<TestParams>(testParametersContext);

    const notificationSize = useRef<number>(0);
    const notifTimeout = useRef<any>(null);
    const firstNotifTimeout = useRef<any>(null);

    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);


    useEffect(() => {
        /* component mounting, disable lock screen sleep */
        IdleTimerManager.setIdleTimerDisabled(true, 'gatt-test-screen');

        setLoading(true);
        setStatus('Fetching test parameters...')

        return () => {
            /* component unmounting, enable lock screen sleep */
            IdleTimerManager.setIdleTimerDisabled(false, 'gatt-test-screen');

            finishTest();
        };
    }, []);

    useEffect(() => {
        testParameters.current = testParametersContext;
        console.log("Test Parametrts:", JSON.stringify(testParameters.current, null, 2));
        runTestScenario();
    }, [testParametersContext,]);

    // Trigger next loop when the loop finished
    useEffect(() => {
        if (gattLoopFinished && currentGattLoopNumber.current > 0) {
            triggerNextGattLoop();
        }

    }, [gattLoopFinished]);

    function resetProgresses() {
        let progressesToReset = [StepsIDs.read, StepsIDs.write, StepsIDs.receiveNotification]
        steps.current.map(s => {
            if (progressesToReset.includes(s.id)) {
                s.progress = 0;
            }
        })
    }

    function addLog(message: string, sevirity: string) {
        console.log(message)
        setLogs((prevLogs) => [...prevLogs, { message: `[${new Date().toTimeString().split(' ')[0]}] ${message}`, sevirity: sevirity }]);
        if (sevirity !== LogLevel.INFO) {
            setStatus(message);
        }
    }

    function finishTest() {
        bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
        EventRegister.removeAllListeners();
        clearTimeout(notifTimeout.current);

        let endTime = performance.now();
        testData.current!.info.total_execution_time_ms = endTime - startTime.current;
        addLog(JSON.stringify(testData.current, null, 2), LogLevel.INFO);
        addLog('Test Finished!', LogLevel.SUCCESS);

        updateRunning(false);
    }

    const initiateSteps = () => {

        let newSteps: Step[] = Platform.OS === 'android' ?
            [
                {
                    id: StepsIDs.exchangeMtu,
                    title: "Excahnge MTU",
                    desc: `Set MTU for GATT data packets size, requesting ${testParameters.current.mtu_size} size`,
                    progress: 0,
                    totalRounds: 1,
                    currentRound: 0
                },

            ] : []

        let writeChar;
        if (testService == data_stream) {
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

        if (testParameters.current.test_case == TEST_CASE.WRITE_NOTIFY) {
            newSteps = [...newSteps,
            {
                id: StepsIDs.enableNotif,
                title: "Enable Notifications",
                desc: `Enable notifications on characteristic ${notifChar.current}`,
                progress: 0,
                totalRounds: 1,
                currentRound: 0
            }]
        }
        newSteps = [...newSteps,
        {
            id: StepsIDs.write,
            title: 'Write',
            desc: `Write ${testParameters.current.write_data_size} random bytes to ${writeChar}`,
            progress: 0,
            totalRounds: testParameters.current.num_loops_gatt_test,
            currentRound: 0
        }]

        if (testParameters.current.test_case == TEST_CASE.WRITE_NOTIFY) {
            newSteps = [...newSteps,
            {
                id: StepsIDs.receiveNotification,
                title: "Receive Notification",
                desc: `Receive notification with size ${testParameters.current.expected_notifications_size}`,
                progress: 0,
                totalRounds: testParameters.current.num_loops_gatt_test,
                currentRound: 0
            }]
        }

        else { // Read
            newSteps = [...newSteps,
            {
                id: StepsIDs.read,
                title: "Read",
                desc: `Read characteristic ${writeChar}`,
                progress: 0,
                totalRounds: testParameters.current.num_loops_gatt_test,
                currentRound: 0
            }]
        }

        steps.current = newSteps;

    }

    async function runTestScenario() {
        EventRegister.removeAllListeners();
        clearTimeout(notifTimeout.current);

        startTime.current = performance.now();
        setLogs([]);

        try {

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
                    devices_list: [peripheralName!],
                    num_of_devices: 1,
                    gatt_testing_selected: true,
                    test_case: testParameters.current.test_case,
                    num_of_gatt_loops: testParameters.current.num_loops_gatt_test,
                    supported_profile: testService!,
                },
                results: []
            }

            updateRunning(true);

            // update peripheral info:
            setStatus('Getting peripheral info...')
            periphralfInfo.current = await BleManager.retrieveServices(peripheralId!);
            setCurrentDevice({ value: peripheralId!, timestamp: Date.now() });

            // Define writeChar, readWriteChar depends on testService and testCase
            let writeChar: string;
            let readWriteChar: string;

            if (testParameters.current.test_case === TEST_CASE.WRITE_NOTIFY) {
                if (testService == simple_peripheral) {
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
                if (testService == simple_peripheral) {
                    serviceUUID.current = TI_SIMPLE_PERIPHERAL_SERVICE.uuid;
                    readWriteChar = TI_SIMPLE_PERIPHERAL_SERVICE.simpleprofile_char1;
                    const gattLoopListener = EventRegister.addEventListener('ExecuteGattLoop', (gattLoopNum: number) => {
                        executeWriteReadSimpleGatt(gattLoopNum, serviceUUID.current, readWriteChar)
                    })
                }
            }

            initiateSteps();

            setLoading(false);

            addLog('Start Running Test Scenario on ' + currentDevice.value + ' Peripheral ' + testParameters.current.main_loop_number + ' Times', LogLevel.INFO);
            // Create new result object
            testResult.current = {
                main_loop_number: currentMainLoopNumber.current,
                device_name: currentDevice.value,
                test_pass: true
            }

            startGattTesting();

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
            increaseProgress(steps.current, StepsIDs.write, 0.10);
            // start timeout for notification
            notifTimeout.current = setTimeout(() => {
                addLog('Notification timeout after 20 seconds', LogLevel.ERROR);
                testResult.current!.got_expected_notification = false;
                testResult.current!.test_pass = false;
                testResult.current!.error_message = 'Notification timeout after 20 seconds';

                setGattLoopFinished(true);
            }, NOTIFICATION_TIMEOUT);


            await write(writeChar, serviceUuid, randomBytes, testParameters.current.write_data_size, addLog, periphralfInfo.current?.id, testResult.current);

            increaseProgress(steps.current, StepsIDs.write, 1);
            increaseRound(steps.current, StepsIDs.write);

        } catch (e) {
            increaseProgress(steps.current, StepsIDs.write, 1);
            increaseRound(steps.current, StepsIDs.write);
            setGattLoopFinished(true);
            return
        }

    }

    async function executeWriteReadSimpleGatt(gattLoopNum: number, serviceUuid: string, readWriteChar: string) {
        if (gattLoopNum === 0) { return };

        setGattLoopFinished(false);

        // Write to characteristic
        const randomBytes = generateRandomBytes(testParameters.current.write_data_size);

        let readenData;

        increaseProgress(steps.current, StepsIDs.write, 0.5);

        try {
            await write(readWriteChar, serviceUuid, randomBytes, testParameters.current.write_data_size, addLog, periphralfInfo.current?.id!, testResult.current!);
            increaseProgress(steps.current, StepsIDs.write, 1);
            increaseRound(steps.current, StepsIDs.write);
            increaseProgress(steps.current, StepsIDs.read, 0.5);

            readenData = await read(readWriteChar, serviceUuid, periphralfInfo.current?.id!, addLog, testResult.current!);
            increaseProgress(steps.current, StepsIDs.read, 1);
            increaseRound(steps.current, StepsIDs.read);

        }
        catch (e) {
            increaseProgress(steps.current, StepsIDs.write, 1);
            increaseRound(steps.current, StepsIDs.write);
            increaseProgress(steps.current, StepsIDs.read, 1);
            increaseRound(steps.current, StepsIDs.read);
            setGattLoopFinished(true);
            return
        }

        // check if readen data equal to writen data
        if (readenData == randomBytes) {
            testResult.current!.read_expected_value = true;
            testResult.current!.test_pass = true;
            testResult.current!.error_message = "";
        }
        else {
            testResult.current!.read_expected_value = false;
            testResult.current!.test_pass = false;
            testResult.current!.error_message = "Read value does not macth to the write value";
        }
        setGattLoopFinished(true);

    }

    async function triggerNextGattLoop() {

        // Save previous results
        if (currentGattLoopNumber.current > 0 && testResult.current) {
            testData.current!.results.push(testResult.current)
        }

        // End GATT Loops - finish the test
        if (currentGattLoopNumber.current >= testParameters.current.num_loops_gatt_test) {
            addLog('Finished GATT loops for ' + currentDevice.value, LogLevel.SUCCESS);
            if (testParameters.current.test_case === TEST_CASE.WRITE_NOTIFY) {
                BleManager.stopNotification(periphralfInfo.current!.id, serviceUUID.current, notifChar.current);
            }
            finishTest();
        }

        // Trigger Next Loop
        else {

            if (currentGattLoopNumber.current >= 1) {
                addLog('Sleeping before next gatt test for ' + testParameters.current.delay_between_gatt_tests + ' ms', LogLevel.WARNING)
                await hold(testParameters.current.delay_between_gatt_tests);
                // Initiate execute gatt loop step progress
                resetProgresses();
            }

            currentGattLoopNumber.current += 1;

            // Create new result object
            testResult.current = {
                device_name: peripheralName!,
                gatt_test_loop_number: currentGattLoopNumber.current,
                connection: true,
                test_pass: true,
            }
            notificationSize.current = 0;
            addLog('GATT Loop ' + currentGattLoopNumber.current + ' From ' + testParameters.current.num_loops_gatt_test, LogLevel.ERROR);
            EventRegister.emit('ExecuteGattLoop', currentGattLoopNumber.current)
        }
    }

    async function startGattTesting() {
        await BleManager.retrieveServices(periphralfInfo.current?.id!);

        // Update MTU value - Android only API 21+, iOS initiates an MTU exchange automatically upon connection
        if (Platform.OS === 'android') {
            increaseProgress(steps.current, StepsIDs.exchangeMtu, 0.50);
            await setMTUSize(periphralfInfo.current?.id!, testParameters.current.mtu_size, addLog);
            increaseProgress(steps.current, StepsIDs.exchangeMtu, 1);
            increaseRound(steps.current, StepsIDs.exchangeMtu);
        }

        // Enable notifications
        if (testParameters.current.test_case === TEST_CASE.WRITE_NOTIFY) {
            addLog('Enabling Notifications', LogLevel.INFO)
            increaseProgress(steps.current, StepsIDs.enableNotif, 0.50);

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
                        BleManager.startNotification(periphralfInfo.current!.id, serviceUUID.current, notifChar.current)
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
                    await BleManager.startNotification(periphralfInfo.current!.id, serviceUUID.current, notifChar.current);

                }
                increaseProgress(steps.current, StepsIDs.enableNotif, 1);
                increaseRound(steps.current, StepsIDs.enableNotif);

            } catch (error: any) {
                addLog('Error starting notifications: ' + error, LogLevel.ERROR);
                testResult.current!.write = false;
                testResult.current!.test_pass = false;
                if (error) testResult.current!.error_message = error;
                testData.current?.results.push(testResult.current!);
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
                        addLog('Got Notification with size: ' + value.length, LogLevel.SUCCESS);

                        notificationSize.current += value.length;
                        // Check the notification is in the expected size
                        if (notificationSize.current == testParameters.current.expected_notifications_size) {
                            testResult.current!.got_expected_notification = true;
                            increaseProgress(steps.current, StepsIDs.receiveNotification, 1);
                            increaseRound(steps.current, StepsIDs.receiveNotification);
                            setGattLoopFinished(true);
                        }

                        // Got bigger notification
                        else if (notificationSize.current > testParameters.current.expected_notifications_size) {
                            testResult.current!.got_expected_notification = false;
                            testResult.current!.test_pass = false;
                            testResult.current!.error_message = "Notification size does not macth to expected size";
                            increaseProgress(steps.current, StepsIDs.receiveNotification, 1);
                            increaseRound(steps.current, StepsIDs.receiveNotification);
                            setGattLoopFinished(true);

                        }

                        else {  // need to wait for another notification
                            increaseProgress(steps.current, StepsIDs.receiveNotification, notificationSize.current / testParameters.current.expected_notifications_size);
                            addLog(`Waiting for notification size ${testParameters.current.expected_notifications_size - notificationSize.current}`, LogLevel.INFO)

                            // start new timeout for notification
                            notifTimeout.current = setTimeout(() => {
                                addLog('Notification timeout after 45 seconds', LogLevel.ERROR);
                                testResult.current!.got_expected_notification = false;
                                testResult.current!.test_pass = false;
                                testResult.current!.error_message = 'Notification timeout after 45 seconds';

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

    function initiateTestValues() {
        notificationSize.current = 0;
        currentGattLoopNumber.current = 0;
        currentMainLoopNumber.current = 0;
        testData.current = null;
        testResult.current = {
            main_loop_number: currentMainLoopNumber.current,
            device_name: currentDevice.value,
            test_pass: true
        }
    }

    return (

        <View style={styles.container}>
            <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', }]}>
                <Text style={{ fontWeight: 'bold', fontSize: 20 }}>
                    {testService} Test
                </Text>
            </View>
            {currentDevice.value && (
                <View style={[styles.box, { marginTop: 3 }]}>
                    <View style={[styles.textContainer]}>
                        <Text style={[styles.title]}>
                            Execution Status
                        </Text>
                        <Text style={[styles.desc]}>
                            Current GATT Loop: {currentGattLoopNumber.current}/{testParameters.current.num_loops_gatt_test}
                        </Text>
                    </View>
                </View>
            )
            }

            <View style={[styles.stepsContainer]}>
                {loading && (
                    <View style={{ alignSelf: 'center', marginTop: 30 }}>
                        <LoaderKit
                            style={{ width: 50, height: 50 }}
                            name={'BallBeat'}
                            color={'black'}
                        />
                    </View>
                )}
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

            <ActionButtons
                runAgain={() => { initiateTestValues(); runTestScenario(); }}
                isRunning={isRunning}
                stopTest={finishTest}
                handleExportLogs={() => handleExportLogs(logs)}
                handleExportResults={() => handleExportResults(testData.current!)} />

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
    text: {
        fontSize: 18,
        lineHeight: 21,
        color: Colors.blue,
    },
    stateContainer: {
        paddingLeft: 15,
        paddingTop: 15,
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
    item: {
        color: 'black',
        fontSize: 16,
        padding: 2
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

export default GattTestScenario;