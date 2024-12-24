import { KeyboardAvoidingView, Platform, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, } from 'react-native';
import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text } from '../../Themed';
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Dropdown } from 'react-native-element-dropdown';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { Switch } from 'react-native-paper';
import { ProgressSteps, ProgressStep } from 'react-native-progress-steps';
import TextInputFeild from '../../TextInputFeild';
import { useTestParamsContext } from '../../../context/TestParamsContext';
import { downloadDataToLocalStorage, getCurrentDateTimeString, TestParams, GATT_SERVICES, PHY_OPTIONS, TEST_CASE, TEST_CASES_OPTIONS, data_stream } from '../testsUtils';

interface Props {
    testService: string | null;
    peripheralId: string | null;
    peripheralName: string | null;
}

const TestForm: React.FC<Props> = (
    { testService, peripheralId, peripheralName }: Props
) => {
    const { testParametersContext, updateTestParams } = useTestParamsContext();

    const [devicesNameList, setDevicesNameList] = useState<string[]>([]);
    const [pairAndBond, setPairAndBond] = useState<boolean | undefined>(false);
    const [connectionPhy, setConnectionPhy] = useState<number | undefined>();
    const [gattDataTesting, setGattDataTesting] = useState<boolean>(true);
    const [mtuSize, setMtuSize] = useState<number | undefined>();
    const [supportedService, setSupportedService] = useState<string | undefined>();
    const [testCase, setTestCase] = useState<string | undefined>()
    const [numLoopsGattTest, setNumLoopsGattTest] = useState<number | undefined>();
    const [holdBetweenGattTests, setHoldTime] = useState<number | undefined>()
    const [writeDataSize, setWriteDataSize] = useState<number | undefined>();
    const [expectedNotificationsSize, setExpectedNotificationsSize] = useState<number | undefined>();
    const [mainLoopNumber, setNumberMainLoop] = useState<number | undefined>();
    const [holdAfterConnection, setHoldAfterConnection] = useState<number | undefined>();
    const [holdBetweenMainLoops, setHoldBetweenMainLoops] = useState<number | undefined>();

    const [changed, setChanged] = useState<boolean>(false);
    const [newDevice, setNewDevice] = useState<string>('');

    const [isPhyFocus, setIsPhyFocus] = useState<boolean>(false);
    const [isGattServiceFocus, setIsGattServiceFocus] = useState<boolean>(false);
    const [isTestCaseFocus, setIsTestCaseFocus] = useState<boolean>(false);

    let navigation = useNavigation();
    const { fontScale } = useWindowDimensions();
    const styles = makeStyles(fontScale);

    useEffect(() => {
        initiateDataForm(testParametersContext)
    }, [testParametersContext]);


    // Update the form when the screen is focused
    useFocusEffect(
        React.useCallback(() => {
            initiateDataForm(testParametersContext);
        }, [testParametersContext])
    );

    function initiateDataForm(data: TestParams | null) {
        setNewDevice('');
        setMtuSize(data?.mtu_size);
        setTestCase(data?.test_case);
        setNumLoopsGattTest(data?.num_loops_gatt_test);
        setHoldTime(data?.delay_between_gatt_tests);
        setWriteDataSize(data?.write_data_size);
        setExpectedNotificationsSize(data?.expected_notifications_size);
        setHoldAfterConnection(data?.connection_duration);
        if (testService) {
            setConnectionPhy(undefined);
            setDevicesNameList([]);
            setGattDataTesting(true);
            setSupportedService(testService);
            setNumberMainLoop(1);
            setPairAndBond(undefined);
            setHoldBetweenMainLoops(undefined);
        }

        else {
            setHoldBetweenMainLoops(data?.delay_between_main_loops);
            setPairAndBond(data?.pair_and_bond == undefined || null ? false : data.pair_and_bond);
            setConnectionPhy(data?.connection_phy);
            setDevicesNameList(data?.devices_name_list ? data.devices_name_list : []);
            setGattDataTesting(data?.gatt_data_testing == undefined || null ? false : data.gatt_data_testing);
            setSupportedService(data?.supported_service);
            setNumberMainLoop(data?.main_loop_number);
        }
    }

    function handleSaveDevice() {
        const updatedList = [...devicesNameList, newDevice];

        setDevicesNameList(updatedList)
        setNewDevice('');
        setChanged(true);

    };

    function handleDeleteDevice(index: number) {
        const updatedDevices = devicesNameList.filter((_, i) => i !== index);
        setChanged(true);
        setDevicesNameList(updatedDevices);
    };

    async function handleImportParams() {
        try {
            const result = await DocumentPicker.pickSingle({
                type: DocumentPicker.types.allFiles,
            });

            if (result.uri) {
                const content = await RNFS.readFile(result.uri, 'utf8');
                const jsonData = JSON.parse(content);

                try {
                    if (testService && !jsonData.gatt_data_testing) { jsonData.gatt_data_testing = true }
                    initiateDataForm(jsonData);
                    setChanged(true);
                }
                catch (e) {
                    alert('Invalid Json File ' + e)
                    initiateDataForm(testParametersContext);
                }

            }

        } catch (error) {
            alert('Error Loading Json File ' + error)
            initiateDataForm(testParametersContext);
        }
    }

    function handleExportParams() {
        const testParams: TestParams = {
            devices_name_list: devicesNameList!,
            connection_phy: connectionPhy,
            pair_and_bond: pairAndBond!,
            gatt_data_testing: gattDataTesting,
            mtu_size: mtuSize,
            supported_service: supportedService,
            test_case: testCase,
            delay_between_gatt_tests: holdBetweenGattTests,
            num_loops_gatt_test: numLoopsGattTest,
            write_data_size: writeDataSize,
            expected_notifications_size: expectedNotificationsSize,
            main_loop_number: testService ? 1 : mainLoopNumber,
            connection_duration: holdAfterConnection,
            delay_between_main_loops: holdBetweenMainLoops
        };

        const fileName = `test_params_${getCurrentDateTimeString()}.json`;
        const data = JSON.stringify(testParams, null, 4);
        downloadDataToLocalStorage(data, fileName, 'application/json');
    }

    const renderLabel = (type: 'phy' | 'gattService' | 'gattTest') => {

        switch (type) {
            case 'phy':
                if (connectionPhy != undefined || isPhyFocus) {
                    return (
                        <Text style={[styles.label, isPhyFocus && { color: Colors.active }]}>
                            Connection Phy
                        </Text>
                    );
                }
                return null;
            case 'gattService':
                if (supportedService != undefined || isGattServiceFocus) {
                    return (
                        <Text style={[styles.label, isGattServiceFocus && { color: Colors.active }]}>
                            GATT Supported Service
                        </Text>
                    );
                }
                return null;
            case 'gattTest':
                if (testCase != undefined || isTestCaseFocus) {
                    return (
                        <Text style={[styles.label, isTestCaseFocus && { color: Colors.active }]}>
                            GATT Test Type
                        </Text>
                    );
                }
                return null;

        }
    };

    function runTest() {
        if ((!testService && testCase == TEST_CASE.WRITE_READ && supportedService == data_stream) || (testService == data_stream && testCase == TEST_CASE.WRITE_READ)) {
            alert('No write & read test with data_stream service!');
            return
        }

        if (mtuSize && (mtuSize > 251 || mtuSize < 27)) {
            alert('MTU size must be between 27 and 251');
            return
        }

        if (testService) {
            setDevicesNameList([]);
            setGattDataTesting(true);
            setSupportedService(testService);
            setNumberMainLoop(1);
        }

        const testParams: TestParams = {
            devices_name_list: devicesNameList!,
            connection_phy: connectionPhy,
            pair_and_bond: pairAndBond!,
            gatt_data_testing: gattDataTesting,
            mtu_size: mtuSize,
            supported_service: supportedService,
            test_case: testCase,
            delay_between_gatt_tests: holdBetweenGattTests,
            num_loops_gatt_test: numLoopsGattTest,
            write_data_size: writeDataSize,
            expected_notifications_size: expectedNotificationsSize,
            main_loop_number: testService ? 1 : mainLoopNumber,
            connection_duration: holdAfterConnection,
            delay_between_main_loops: holdBetweenMainLoops
        };

        updateTestParams(testParams);

        if (peripheralId) {
            navigation.navigate('GattTesting', { testService: testService, peripheralId: peripheralId, peripheralName: peripheralName });
        }
        else {
            navigation.navigate('IopTest',);
        }
    }

    const GattParametersForm = () => {
        return (
            <ScrollView style={[styles.progressStepView]}>
                {/* GATT Data Testing */}
                {!testService && (
                    <View style={[styles.container]}>
                        <Text
                            adjustsFontSizeToFit
                            numberOfLines={1}
                            allowFontScaling
                            style={[styles.text]}
                        >
                            Perform GATT Data Testing
                        </Text>
                        <Switch
                            onValueChange={(value: boolean) => {
                                setGattDataTesting(value); setChanged(true);
                            }}
                            value={gattDataTesting}
                            color={Colors.active}
                            testID='gettTestSwitch'
                            accessibilityLabel='gettTestSwitch'
                        />
                    </View>
                )}

                {!gattDataTesting && (
                    // Hold After Connection
                    <TextInputFeild
                        keyboardType="numeric"
                        value={holdAfterConnection ? holdAfterConnection.toString() : ""}
                        onChangeText={(ms: any) => {
                            setHoldAfterConnection(Number(ms)); setChanged(true);
                        }}
                        label="Connection Duration (ms)"
                    />

                )}

                {gattDataTesting && (
                    <>
                        {/* Number of Loops to run GATT Test */}
                        <TextInputFeild
                            label="Number of GATT Iterations"
                            keyboardType="numeric"
                            value={numLoopsGattTest ? numLoopsGattTest.toString() : ""}
                            onChangeText={(num: any) => {
                                setNumLoopsGattTest(Number(num));
                                setChanged(true);
                            }}
                        />

                        {/* Hold Between Gatt Loops  */}
                        <TextInputFeild
                            label="Delay Between GATT Iterations (ms)"
                            keyboardType="numeric"
                            value={holdBetweenGattTests ? holdBetweenGattTests.toString() : ""}
                            onChangeText={(num: any) => {
                                setHoldTime(Number(num));
                                setChanged(true);
                            }}
                        />

                        {/* MTU */}
                        {Platform.OS === 'android' && (
                            <TextInputFeild
                                keyboardType="numeric"
                                value={mtuSize ? mtuSize.toString() : ""}
                                onChangeText={(size: any) => {
                                    setMtuSize(Number(size));
                                    setChanged(true);
                                }}
                                label="MTU Size (27-251)"
                            />
                        )}

                        {/* GATT Service to test */}
                        {!testService && (
                            <View >
                                {renderLabel('gattService')}
                                <Dropdown
                                    style={[styles.dropdown, isGattServiceFocus && { borderColor: Colors.active }]}
                                    placeholderStyle={styles.placeholderStyle}
                                    selectedTextStyle={styles.selectedTextStyle}
                                    itemTextStyle={styles.item}
                                    data={GATT_SERVICES}
                                    placeholder={!isGattServiceFocus ? 'Select GATT Supported Service' : '...'}
                                    value={supportedService}
                                    onChange={(v: any) => {
                                        setSupportedService(v.value);
                                        setChanged(true);
                                        setIsGattServiceFocus(false);
                                    }}
                                    labelField="label"
                                    valueField="value"
                                    onFocus={() => setIsGattServiceFocus(true)}
                                    onBlur={() => setIsGattServiceFocus(false)}
                                    testID='serviceDropdown'
                                    accessibilityLabel='serviceDropdown'
                                    itemAccessibilityLabelField='value'
                                    itemTestIDField='value'
                                />
                            </View>
                        )}

                        {/* GATT Test to Run */}
                        <View>
                            {renderLabel('gattTest')}
                            <Dropdown
                                style={[styles.dropdown, isTestCaseFocus && { borderColor: Colors.active }]}
                                placeholderStyle={styles.placeholderStyle}
                                selectedTextStyle={styles.selectedTextStyle}
                                itemTextStyle={styles.item}
                                data={TEST_CASES_OPTIONS}
                                placeholder={!isTestCaseFocus ? 'Select GATT Test' : '...'}
                                value={testCase}
                                onChange={(v: any) => {
                                    setTestCase(v.value);
                                    setChanged(true);
                                    setIsTestCaseFocus(false);
                                }}
                                labelField="label"
                                valueField="value"
                                onFocus={() => setIsTestCaseFocus(true)}
                                onBlur={() => setIsTestCaseFocus(false)}
                                testID='testCaseDropdown'
                                accessibilityLabel='testCaseDropdown'
                                itemAccessibilityLabelField='value'
                                itemTestIDField='value'
                            />
                        </View>

                        {/* Data size */}
                        <TextInputFeild
                            label="Write Data Size (bytes)"
                            keyboardType="numeric"
                            value={writeDataSize ? writeDataSize.toString() : ""}
                            onChangeText={(num: any) => {
                                setWriteDataSize(Number(num));
                                setChanged(true);
                            }}
                        />

                        {/* Notification Size */}
                        {testCase == TEST_CASE.WRITE_NOTIFY && (
                            <TextInputFeild
                                label="Expected Notification Size (bytes)"
                                keyboardType="numeric"
                                value={expectedNotificationsSize ? expectedNotificationsSize.toString() : ""}
                                onChangeText={(num: any) => {
                                    setExpectedNotificationsSize(Number(num));
                                    setChanged(true);
                                }}
                            />
                        )}
                    </>
                )}

            </ScrollView>
        )
    }

    function isStepValid(stepId: number): boolean {
        let valid = false;
        switch (stepId) {
            case 0:
                valid = devicesNameList.length == 0;
                break;
            case 1:
                if (Platform.OS == 'android') {
                    valid = connectionPhy && mainLoopNumber && holdBetweenMainLoops ? false : true;
                }
                else {
                    valid = mainLoopNumber && holdBetweenMainLoops ? false : true;
                }
                break;
            case 2:
                if (!gattDataTesting) {
                    valid = holdAfterConnection ? false : true;
                    break;
                }
                else {
                    if (Platform.OS == 'android') {
                        valid = numLoopsGattTest && holdBetweenGattTests && mtuSize && supportedService && testCase ? false : true;
                    }
                    else {
                        valid = numLoopsGattTest && holdBetweenGattTests && supportedService && testCase ? false : true;
                    }
                    break;
                }
        }

        return valid;
    }

    if (testService) {

        return (
            <KeyboardAvoidingView style={{ height: "100%" }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} >
                <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between' }]}>
                    <Text style={{ fontWeight: 'bold', fontSize: 20 }}>
                        Fill Test Parameters
                    </Text>
                    <View style={{ flexDirection: 'row', backgroundColor: Colors.lightGray }}>
                        <TouchableOpacity onPress={handleImportParams} style={{ width: 30, marginRight: 15 }}>
                            <AntDesign name="upload" size={20} color="black" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleExportParams} style={{ width: 50 }}>
                            <AntDesign name="download" size={20} color="black" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ paddingTop: 40, flex: 1 }}>
                    {GattParametersForm()}
                </View>
                <TouchableOpacity onPress={runTest}
                    style={[{
                        ...styles.button,
                        // marginHorizontal: 30,
                        height: 40,
                        marginBottom: 40,
                    }]}
                >
                    <Text style={[{ ...styles.text, color: Colors.blue }]}>Run Test</Text>
                </TouchableOpacity>

            </KeyboardAvoidingView >
        )
    }

    return (
        <KeyboardAvoidingView style={{ height: "100%" }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between' }]}>
                <Text style={{ fontWeight: 'bold', fontSize: 20 }}>
                    Fill Test Parameters
                </Text>
                <View style={{ flexDirection: 'row', backgroundColor: Colors.lightGray }}>
                    <TouchableOpacity onPress={handleImportParams} style={{ width: 30, marginRight: 15 }}>
                        <AntDesign name="upload" size={20} color="black" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleExportParams} style={{ width: 50 }}>
                        <AntDesign name="download" size={20} color="black" />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={{ flex: 1 }}>
                <ProgressSteps
                    activeLabelColor={Colors.active}
                    activeStepIconBorderColor={Colors.active}
                    completedProgressBarColor={Colors.active}
                    completedStepIconColor={Colors.active}
                    labelFontSize={14 / fontScale}
                >
                    <ProgressStep label="Devices Info" nextBtnDisabled={isStepValid(0)} >
                        <View style={[styles.progressStepView]}>
                            <Text style={[{ ...styles.text, fontWeight: 'bold' }]}>Add the devices you want to test</Text>
                            <View style={{ paddingVertical: 20, }} >
                                <ScrollView style={{ maxHeight: 300 }}>
                                    {
                                        devicesNameList && devicesNameList.map((item, index) => {
                                            return (
                                                <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text style={[styles.text]}>{item}</Text>
                                                    <TouchableOpacity
                                                        onPress={() => handleDeleteDevice(index)}
                                                        style={[{
                                                            ...styles.button,
                                                            borderColor: Colors.lightGray,
                                                            paddingHorizontal: 10,
                                                        }]}>
                                                        <Ionicons name="trash-outline" size={20} color='gray' />
                                                    </TouchableOpacity>
                                                </View>
                                            )
                                        })
                                    }
                                </ScrollView>
                                <View style={{ justifyContent: 'center', width: '100%', flexGrow: 1 }}>
                                    <TextInputFeild
                                        label="Enter device name"
                                        value={newDevice}
                                        onChangeText={(text: any) => setNewDevice(text)}
                                        onSubmitEditing={handleSaveDevice}
                                    />
                                    <MaterialCommunityIcons
                                        name={'plus-circle-outline'}
                                        size={24}
                                        color="gray"
                                        style={{
                                            position: 'absolute',
                                            right: 10,
                                            top: 20
                                        }}
                                        onPress={handleSaveDevice}
                                    />
                                </View>
                            </View>
                        </View>
                    </ProgressStep>
                    <ProgressStep label="Main Loop Parameters" nextBtnDisabled={isStepValid(1)}>
                        <View style={[styles.progressStepView]}>
                            {/* Pair and Bond */}
                            {Platform.OS === 'android' && (
                                <View style={[styles.container]}>
                                    <Text style={[styles.text]}>Pair and Bond</Text>
                                    <Switch
                                        onValueChange={(value: boolean) => {
                                            setPairAndBond(value); setChanged(true);
                                        }}
                                        value={pairAndBond}
                                        color={Colors.active}
                                        testID='bondSwitch'
                                        accessibilityLabel='bondSwitch'
                                    />
                                </View>
                            )}
                            {/* Phy */}
                            {Platform.OS === 'android' && (
                                <View testID='phyDropdown' accessibilityLabel='phyDropdown'>
                                    {renderLabel('phy')}
                                    <Dropdown
                                        style={[styles.dropdown, isPhyFocus && { borderColor: Colors.active }]}
                                        placeholderStyle={styles.placeholderStyle}
                                        selectedTextStyle={styles.selectedTextStyle}
                                        itemTextStyle={styles.item}
                                        data={Object.values(PHY_OPTIONS)}
                                        placeholder={!isPhyFocus ? 'Select Phy Connection' : '...'}
                                        value={connectionPhy}
                                        onChange={(v: any) => {
                                            setConnectionPhy(v.value);
                                            setChanged(true);
                                            setIsPhyFocus(false);
                                        }}
                                        labelField='label'
                                        itemTestIDField='id'
                                        itemAccessibilityLabelField='id'
                                        valueField='value'
                                        onFocus={() => setIsPhyFocus(true)}
                                        onBlur={() => setIsPhyFocus(false)}
                                    />
                                </View>
                            )}
                            {/* Main Loop Number */}
                            <TextInputFeild
                                keyboardType="numeric"
                                value={mainLoopNumber ? mainLoopNumber.toString() : ""}
                                onChangeText={(loops: any) => {
                                    setNumberMainLoop(Number(loops)); setChanged(true);
                                }}

                                label="Number of Connections Iterations"
                            />
                            {/* Hold Between Main Loops */}
                            <TextInputFeild
                                keyboardType="numeric"
                                value={holdBetweenMainLoops ? holdBetweenMainLoops.toString() : ""}
                                onChangeText={(ms: any) => {
                                    setHoldBetweenMainLoops(Number(ms)); setChanged(true);
                                }}
                                label="Delay Between Iterations (ms)"
                            />
                        </View>
                    </ProgressStep>
                    <ProgressStep label="GATT Parameters" nextBtnDisabled={isStepValid(2)} finishBtnText="Run Test" onSubmit={runTest}>
                        {GattParametersForm()}
                    </ProgressStep>
                </ProgressSteps>
            </View>
        </KeyboardAvoidingView >
    );
};

const makeStyles = (fontScale: number) => StyleSheet.create({
    progressStepView: {
        paddingHorizontal: 30
    },
    buttonWrapper: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        height: 40,
    },
    text: {
        fontSize: 16 / fontScale,
        lineHeight: 21,
        letterSpacing: 0.25,
    },
    textInput: {
        borderColor: 'gray',
        borderRadius: 0,
        backgroundColor: 'white',
        marginBottom: 15
    },
    container: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    dropdown: {
        marginBottom: 15,
        paddingHorizontal: 16,
        width: '100%',
        height: 50,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 4,
    },
    placeholderStyle: {
        fontSize: 14,
    },
    selectedTextStyle: {
        fontSize: 18 / fontScale,
        lineHeight: 21 / fontScale,
        letterSpacing: 0.25,
    },
    item: {
        color: 'black',
        fontSize: 14,
    },
    label: {
        color: Colors.darkGray,
        position: 'absolute',
        backgroundColor: 'white',
        left: 0,
        top: -7,
        zIndex: 999,
        marginHorizontal: 15,
        paddingHorizontal: 3,
        fontSize: 12,
    },
    header: {
        backgroundColor: Colors.lightGray,
        padding: 10,
        alignItems: 'center',
        shadowColor: 'rgba(0,0,0,0.4)',
        shadowOffset: {
            height: 1,
            width: 0,
        },
        shadowOpacity: 1,
        shadowRadius: 3,
        elevation: 5,

    }
});


export default TestForm;