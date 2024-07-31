import { InteractionManager, NativeEventEmitter, Platform, StatusBar, Switch, View, processColor } from 'react-native';
import { Text, TouchableOpacity } from '../Themed';
import { StyleSheet, NativeModules } from 'react-native';
import Colors from '../../constants/Colors';
import { useCallback, useEffect, useRef, useState } from 'react';
import BleManager from 'react-native-ble-manager';
import { Divider, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { GLUCOSE_PROFILE } from '../../constants/uuids';
import { ScrollView } from 'react-native-gesture-handler';
import { OP_CODES_ACCESS_CONTROL, RecordAccessControlDialog } from '../ContiniousGlucoseMonitoring/RecordAccessControlDialog';
import { Buffer } from 'buffer';
import { Icon } from '@rneui/base';
import { CustomSnackBar } from '../ContiniousGlucoseMonitoring/CustomSnackBar';
import { downloadDataToLocalStorage } from '../Tests/testsUtils';
import { LineChart } from 'react-native-charts-wrapper';
import { AntDesign } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import Tooltip from 'react-native-walkthrough-tooltip';

interface Props {
    peripheralId: string;
}

interface CollapsedSections {
    glucoseMeaurment: boolean;
    glucoseFeatures: boolean;
    recordAccessControlPoint: boolean;
}

interface Record {
    data: string;
    time: string
}

const GlucoseProfile: React.FC<Props> = ({ peripheralId }) => {

    const [notificationSwitch, setNotificationSwitch] = useState<boolean>(false);
    const [recordAcceessIndicationSwitch, setRecordAcceessIndicationSwitch] = useState<boolean>(false);

    const [measurementsList, setMeasurementsList] = useState<Record[]>([]);
    const [recordAccessControlIndicationsList, setRecordAccessControlIndicationsList] = useState<Record[]>([]);

    const [isRecordAccessDialogVisible, setRecordAccessDialogVisible] = useState<boolean>(false);

    const [featuresList, setFeatureList] = useState<any[]>([]);

    const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>({ glucoseMeaurment: false, glucoseFeatures: false, recordAccessControlPoint: false });
    const [sectionsTooltip, setSectionsTooltip] = useState<CollapsedSections>({ glucoseMeaurment: false, glucoseFeatures: false, recordAccessControlPoint: false });

    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

    const [visibleSnackBar, setVisibleSnackBar] = useState(false);
    const [snackBarData, setSnackBarData] = useState<{ message: string, success: boolean }>({ message: '', success: false });

    const [measurmentsDataSet, setMeasurmentsDataSet] = useState<{ data: number, label: string }[]>([]);
    const [dataFormatting, setDataFormatting] = useState<string>('Chart');

    const isLoading = useRef<boolean>(false);

    useFocusEffect(
        useCallback(() => {
            const task = InteractionManager.runAfterInteractions(() => {
                bleManagerEmitter.addListener(
                    'BleManagerDidUpdateValueForCharacteristic', handleNotifications);

                setNotificationSwitch(true);
                setRecordAcceessIndicationSwitch(true);
                getFeaturesData();

            });

            return () => {
                task.cancel();
                bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');

                // Stop notifications
                BleManager.stopNotification(peripheralId, GLUCOSE_PROFILE.uuid, GLUCOSE_PROFILE.glucose_measurement);
                BleManager.stopNotification(peripheralId, GLUCOSE_PROFILE.uuid, GLUCOSE_PROFILE.record_access_cp);
            };
        }, [])
    );

    useEffect(() => {
        if (notificationSwitch) {
            // Start polling interval if indicationsSwitch is enabled
            console.log('Enable Notifications');
            BleManager.startNotification(peripheralId, GLUCOSE_PROFILE.uuid, GLUCOSE_PROFILE.glucose_measurement);
        } else {
            BleManager.stopNotification(peripheralId, GLUCOSE_PROFILE.uuid, GLUCOSE_PROFILE.glucose_measurement); // Stop notifications
        }
    }, [notificationSwitch]);

    useEffect(() => {
        if (recordAcceessIndicationSwitch) {
            // Start polling interval if indicationsSwitch is enabled
            console.log('Enable RAC Indication');
            BleManager.startNotification(peripheralId, GLUCOSE_PROFILE.uuid, GLUCOSE_PROFILE.record_access_cp);
        } else {
            BleManager.stopNotification(peripheralId, GLUCOSE_PROFILE.uuid, GLUCOSE_PROFILE.record_access_cp); // Stop notifications
        }
    }, [recordAcceessIndicationSwitch]);

    const handleNotificationSwitch = useCallback(async () => {
        setNotificationSwitch((prev) => !prev);
    }, [notificationSwitch]);

    const handleRecordAcceessIndicationSwitch = useCallback(async () => {
        setRecordAcceessIndicationSwitch((prev) => !prev);
    }, [recordAcceessIndicationSwitch]);

    function responseCodeToMessage(response: number): string {
        switch (response) {
            case 0x01:
                return 'Success';
            case 0x02:
                return 'Op Code not supported';
            case 0x03:
                return 'Invalid Operator';
            case 0x04:
                return 'Operator not supported';
            case 0x05:
                return 'Invalid Operand';
            case 0x06:
                return 'No records found';
            case 0x07:
                return 'Abort unsuccessful';
            case 0x08:
                return 'Procedure not completed';
            case 0x09:
                return 'Operand not supported';
            default:
                return '';
        }
    }

    function opCodeToString(opCodeList: { desc: string, value: number }[], opCode: number): string {
        let list = opCodeList.filter(op => op.value === opCode);
        if (list.length > 0) {
            return list[0].desc;
        }
        return '';

    }

    const handleNotifications =
        ({ value, peripheral, characteristic, service }: any) => {
            console.log(`notification: ${value}, characteristic: ${characteristic}`);
            if (characteristic.toLowerCase().includes(GLUCOSE_PROFILE.glucose_measurement.toLowerCase()) && value) {
                isLoading.current = true;
                let newNotification = {
                    data: parseMeasurement(value),
                    time: new Date().toTimeString().split(' ')[0]
                }

                setMeasurementsList(prevData => [...prevData, newNotification]);
            }

            else if (characteristic.toLowerCase().includes(GLUCOSE_PROFILE.record_access_cp.toLowerCase()) && value) {
                isLoading.current = false;
                const opCode = value[0];
                if (opCode == OP_CODES_ACCESS_CONTROL.numberStoredRecordsResponse.value) {
                    let numberOfRecords = value[2] + value[3] * 256;
                    let OpCodeString = opCodeToString(Object.values(OP_CODES_ACCESS_CONTROL), opCode)
                    let newNotification = {
                        data: OpCodeString + ': ' + numberOfRecords + '\n',
                        time: new Date().toTimeString().split(' ')[0]
                    }
                    setRecordAccessControlIndicationsList((prev: any) => [...prev, newNotification])
                    showSnackBar(true, OpCodeString + ': ' + numberOfRecords);
                }
                else if (opCode == OP_CODES_ACCESS_CONTROL.responseCode.value) {
                    let requestOpCode = value[2];
                    let responseCodeValue = value[3];
                    let OpCodeString = opCodeToString(Object.values(OP_CODES_ACCESS_CONTROL), requestOpCode)
                    let message = responseCodeToMessage(responseCodeValue);
                    let newNotification = {
                        data: OpCodeString + ': ' + message + '\n',
                        time: new Date().toTimeString().split(' ')[0]
                    }
                    setRecordAccessControlIndicationsList((prev: any) => [...prev, newNotification])
                    if (responseCodeValue == 0x01) {
                        showSnackBar(true, OpCodeString + ': ' + message);
                    } else {
                        showSnackBar(false, OpCodeString + ': ' + message);
                    }
                }
            }

        }

    function parseMeasurement(data: any) {
        let str = '';

        const valueArray = new Uint8Array(data);
        // console.log('DATA:', data)

        // str += `Record Size: ${valueArray.length} \n`;

        // Parse flags
        const flags = valueArray[0];
        const timeOffsetFlag = !!(flags & 0b00000001);
        const glucoseConcentrationandTypeSampleLocationFlag = !!(flags & 0b00000010);
        const glucoseConcentrationbaseunitsFlag = !!(flags & 0b00000100);
        const sensorStatusAnnunciationFlag = !!(flags & 0b00001000);
        const contextInformationFlag = !!(flags & 0b00010000);

        // Sequence Number
        let sequenceNumber = valueArray[1] + valueArray[2] * 256;
        str += `Sequence Number: ${sequenceNumber} \n`;

        // Base Time 
        const year = valueArray[3] + valueArray[4] * 256;
        const month = valueArray[5];
        const day = valueArray[6];
        const hour = valueArray[7];
        const minutes = valueArray[8];
        const seconds = valueArray[9];
        let time = new Date(year, month - 1, day, hour, minutes, seconds);

        str += `Base Time: ${time.toLocaleString()}\n`;

        // Time Offset 
        const timeOffset = valueArray[10] + valueArray[11] * 256;
        str += `Time Offset: ${timeOffset} \n`;

        // Glucose Concentration
        let glucoseConcentration = 0;
        if (glucoseConcentrationandTypeSampleLocationFlag) {
            glucoseConcentration = valueArray[12] + valueArray[13] * 256;
            if (glucoseConcentrationbaseunitsFlag) {
                // mol/L
                str += `Glucose Concentration: ${glucoseConcentration} mol/L\n`;
            }
            else {
                // kg/L
                str += `Glucose Concentration: ${glucoseConcentration} kg/L\n`;
            }

            // Type-Sample Location
            const typeSampleLocationBytes = valueArray[14];
            const type = typeSampleLocationBytes >> 4;
            const sampleLocation = typeSampleLocationBytes & 0x0F;
            str += `Sample Type: ${bytesToSampleType(type)}\n`;
            str += `Sample Location: ${bytesToSampleLocation(sampleLocation)} \n`;
            console.log(str)
        }
        setMeasurmentsDataSet(prev => [...prev, { data: glucoseConcentration, label: sequenceNumber.toString() }]);
        return str + '\n';
    }

    const bytesToSampleType = (bytes: any) => {
        switch (bytes) {
            case (0x1):
                return 'Capillary Whole blood';
            case (0x2):
                return 'Capillary Plasma';
            case (0x3):
                return 'Venous Whole blood';
            case (0x4):
                return 'Venous Plasma';
            case (0x5):
                return 'Arterial Whole blood';
            case (0x6):
                return 'Arterial Plasma';
            case (0x7):
                return 'Undetermined Whole blood';
            case (0x8):
                return 'Undetermined Plasma';
            case (0x9):
                return 'Interstitial Fluid (ISF)';
            case (0xA):
                return 'Control Solution';
            default:
                return 'Unidentified';
        }
    }

    const bytesToSampleLocation = (bytes: any) => {
        switch (bytes) {
            case (0x1):
                return 'Finger';
            case (0x2):
                return 'Alternate Site Test (AST)';
            case (0x3):
                return 'Earlobe';
            case (0x4):
                return 'Control solution';
            case (0xF):
                return 'Sample Location value not available';
            default:
                return 'Unidentified';
        }
    }

    function parseGlucoseFeatureCharacteristic(data: any) {
        let features: any[] = [];
        const buffer = Buffer.from(data);

        // Ensure the buffer has at least 2 bytes (16 bits)
        if (buffer.length < 2) {
            throw new Error('Invalid Glucose Feature characteristic length');
        }

        const featureBits = buffer.readUInt16LE(0); // First 2 bytes is the feature listlittle-endian

        if (featureBits & 0x0001) features = [...features, 'Low Battery Detection'];
        if (featureBits & 0x0002) features = [...features, 'Sensor Malfunction Detection'];
        if (featureBits & 0x0004) features = [...features, 'Sensor Sample Size'];
        if (featureBits & 0x0008) features = [...features, 'Sensor Strip Insertion Error Detection'];
        if (featureBits & 0x0010) features = [...features, 'Sensor Strip Type Error Detection'];
        if (featureBits & 0x0020) features = [...features, 'Sensor Result High-Low Detection'];
        if (featureBits & 0x0040) features = [...features, 'Sensor Temperature High-Low Detection'];
        if (featureBits & 0x0080) features = [...features, 'Sensor Read Interrupt Detection'];
        if (featureBits & 0x0100) features = [...features, 'General Device Fault'];
        if (featureBits & 0x0200) features = [...features, 'Time Fault'];
        if (featureBits & 0x0400) features = [...features, 'Multiple Bond'];

        return features;
    };

    async function getFeaturesData() {
        let response;

        try {
            response = await BleManager.read(peripheralId, GLUCOSE_PROFILE.uuid, GLUCOSE_PROFILE.glucose_feature);
        } catch (e) {
            console.error('getFeatures error:', e)
        }
        const featureList = parseGlucoseFeatureCharacteristic(response);

        setFeatureList(featureList)
    }

    const showFetchDataDialog = () => {
        closeSnackBar();
        setRecordAccessDialogVisible(true);
    };

    const hideFetchDataDialog = () => setRecordAccessDialogVisible(false);

    const showSnackBar = (success: boolean, message: string) => {
        setVisibleSnackBar(true);
        setSnackBarData({
            message: message,
            success: success
        })
    };

    const closeSnackBar = () => setVisibleSnackBar(false);

    function toggleCollapse(sectionId: number) {
        let current = collapsedSections;
        let updated = current;

        switch (sectionId) {
            case (0):
                updated = { ...collapsedSections, glucoseMeaurment: !current.glucoseMeaurment }
                break;
            case (1):
                updated = { ...collapsedSections, glucoseFeatures: !current.glucoseFeatures }
                break;
            case (2):
                updated = { ...collapsedSections, recordAccessControlPoint: !current.recordAccessControlPoint }
                break;
        }
        setCollapsedSections(updated)
    }

    const refreshData = (gettingDataFunc: any) => {
        return (
            <TouchableOpacity style={[styles.button]} onPress={gettingDataFunc}>
                <Text style={[styles.textButton]}>Refresh</Text>
                <Icon solid={true} name={'refresh'} size={16} color={Colors.blue} type="font-awesome" style={{ alignSelf: 'center' }} />
            </TouchableOpacity >
        )
    }

    function exportRecords(data: Record[]) {
        let dataArray = data.map((record) => `[${record.time}]\n${record.data}`)
        downloadDataToLocalStorage(dataArray.join('\n'), 'records.txt', 'text/plain')
    }

    const DataList = (list: Record[], clearFunc: any) => {
        return (
            <View style={[styles.boxContainer, styles.shadow, { marginTop: 10 }]}>
                <View style={[styles.itemColumn]}>

                    <ScrollView nestedScrollEnabled style={styles.dataScrolling}>
                        {list.map((readData, i) => (
                            <View key={i}>
                                <Text style={{ fontSize: 12, color: Colors.gray }}>{readData.time}</Text>
                                <Text style={{ fontSize: 12 }}>{readData.data}</Text>
                            </View>
                        ))}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, marginTop: 10 }}>
                        <TouchableOpacity onPress={() => exportRecords(list)} >
                            <AntDesign name="download" size={20} color={Colors.blue} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => clearFunc([])}>
                            <FontAwesome5 name="trash-alt" size={20} color={Colors.blue} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        )
    }

    const data = {
        dataSets: [
            {
                values: measurmentsDataSet.map(m => ({ y: m.data, x: Number(m.label) })),
                label: 'Glucose Concentration',
                strokeWidth: 2,
                config: {
                    color: processColor(Colors.blue),
                    circleColor: processColor(Colors.blue),
                    drawCircles: true,
                    circleRadius: 3,
                    circleHoleColor: processColor('white'),
                    drawCircleHole: true,
                },
            }
        ],
        legend: ["Glucose Concentration"]
    };

    function resetChart() {
        setMeasurmentsDataSet([]);
        setMeasurementsList([]);
    }

    const xAxis = {
        granularityEnabled: true,
        granularity: 1,
        position: 'BOTTOM',
        valueFormatter: measurmentsDataSet.map(m => m.label),
    };

    const yAxis = {
        left: {
            drawGridLines: true,
        },
        right: {
            enabled: false,
        },
    };

    const zoommableChartConfig = {
        pinchZoom: true,
        doubleTapToZoomEnabled: true,
        dragEnabled: true,
        scaleEnabled: true,
        scaleXEnabled: true,
        scaleYEnabled: true,
    };

    function toolTip(visible: boolean, setVisible: any, text: string) {
        return (<Tooltip
            isVisible={visible}
            content={<Text>{text}</Text>}
            // placement="bottom"
            onClose={() => setVisible(false)}
            showChildInTooltip={false}
            topAdjustment={Platform.OS === 'android' ? -StatusBar.currentHeight : 0}
            arrowSize={{ height: 0, width: 0 }}
            displayInsets={{ top: 40, bottom: 40, left: 24, right: 24 }}
        >
            <TouchableOpacity onPress={() => setVisible(true)}>
                <Icon style={{ alignSelf: 'center' }} name='help-outline' type="MaterialIcons" size={20} />
            </TouchableOpacity >
        </Tooltip>)

    }

    return (
        <>
            <View style={{ height: "100%", }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 150 }} style={[styles.container]}>
                    {/* Glucose measurment */}
                    <View style={[styles.boxContainer]}>
                        <View style={[{ width: '100%', flexDirection: 'row', alignItems: 'center' }]}>
                            {toolTip(sectionsTooltip.glucoseMeaurment, (isVisible: boolean) => { setSectionsTooltip({ ...sectionsTooltip, glucoseMeaurment: isVisible }) }, 'The Glucose Measurement characteristic is a variable length structure containing Glucose Measurement records')}
                            <TouchableOpacity style={[{ ...styles.subjectRaw, ...styles.itemRaw, flex: 1 }]} onPress={() => toggleCollapse(0)}>
                                <Text style={[styles.subject]}>Glucose Measurement</Text>
                                <Icon style={{ alignSelf: 'center' }} name={collapsedSections.glucoseMeaurment ? 'chevron-down' : 'chevron-up'} type='font-awesome-5' size={18} />
                            </TouchableOpacity>
                        </View>
                        {!collapsedSections.glucoseMeaurment && (
                            <>
                                <View style={[styles.itemRaw]}>
                                    <Text adjustsFontSizeToFit style={[styles.title]}>Notifications</Text>
                                    <Switch
                                        value={notificationSwitch}
                                        onChange={handleNotificationSwitch}
                                    />
                                </View>

                                {measurementsList.length > 0 && (
                                    <>

                                        {dataFormatting == 'List' && DataList(measurementsList, setMeasurementsList)}
                                        {dataFormatting == 'Chart' &&
                                            <LineChart
                                                style={styles.chart}
                                                data={data}
                                                xAxis={xAxis}
                                                yAxis={yAxis}
                                                chartDescription={{ text: '' }}
                                                legend={{ enabled: true }}
                                                {...zoommableChartConfig}
                                            />
                                        }

                                        <SegmentedButtons
                                            value={dataFormatting}
                                            onValueChange={setDataFormatting}
                                            style={{ width: '70%', alignSelf: 'center', marginBottom: 10 }}
                                            density='high'
                                            buttons={[
                                                {
                                                    value: 'List', label: 'List', disabled: isLoading.current, style: { borderColor: 'gray', backgroundColor: dataFormatting === 'List' ? 'rgba(0,128,128, .1)' : 'white' }
                                                },
                                                {
                                                    value: 'Chart', label: 'Chart', disabled: isLoading.current, style: { borderColor: 'gray', backgroundColor: dataFormatting === 'Chart' ? 'rgba(0,128,128, .1)' : 'white' }
                                                }
                                            ]} />
                                    </>
                                )}
                            </>
                        )}

                    </View>
                    {/* Glucose feature */}
                    <View style={[styles.boxContainer]}>
                        <View style={[{ width: '100%', flexDirection: 'row', alignItems: 'center' }]}>
                            {toolTip(sectionsTooltip.glucoseFeatures, (isVisible: boolean) => { setSectionsTooltip({ ...sectionsTooltip, glucoseFeatures: isVisible }) }, 'The Glucose Feature characteristic is used to describe the supported features of the server.')}

                            <TouchableOpacity style={[{ ...styles.subjectRaw, ...styles.itemRaw, flex: 1 }]} onPress={() => toggleCollapse(1)}>
                                <Text style={[styles.subject]}>Glucose Feature</Text>
                                <Icon style={{ alignSelf: 'center' }} name={collapsedSections.glucoseFeatures ? 'chevron-down' : 'chevron-up'} type='font-awesome-5' size={18} />
                            </TouchableOpacity>
                        </View>
                        {!collapsedSections.glucoseFeatures && (
                            <>
                                <View style={[styles.itemRaw]}>
                                    <Text style={[styles.title]}>Glucose Feature List</Text>
                                    {featuresList.length == 0 && (
                                        <Text style={[styles.data]}>None</Text>
                                    )}
                                </View>
                                {featuresList.length > 0 && (
                                    <View style={{ paddingHorizontal: 10, height: styles.itemRaw.height, marginBottom: 5 }}>

                                        <Text style={[styles.data]}>{featuresList.join('\n')}</Text>
                                    </View>
                                )}
                                <View style={[{ ...styles.itemRaw, justifyContent: 'center' }]}>
                                    {refreshData(getFeaturesData)}
                                </View>

                            </>
                        )}

                    </View>
                    {/* Record Access Control Point */}
                    <View style={[styles.boxContainer]}>
                        <View style={[{ width: '100%', flexDirection: 'row', alignItems: 'center' }]}>
                            {toolTip(sectionsTooltip.recordAccessControlPoint, (isVisible: boolean) => { setSectionsTooltip({ ...sectionsTooltip, recordAccessControlPoint: isVisible }) }, 'The Record Access Control Point is used to enable device-specific procedures for basic management of a set of data records.')}

                            <TouchableOpacity style={[{ ...styles.itemRaw, ...styles.subjectRaw, flex: 1 }]} onPress={() => toggleCollapse(2)}>
                                <Text style={[styles.subject]} adjustsFontSizeToFit numberOfLines={1} allowFontScaling >Record Access Control Point</Text>
                                <Icon style={{ alignSelf: 'center' }} name={collapsedSections.recordAccessControlPoint ? 'chevron-down' : 'chevron-up'} type='font-awesome-5' size={18} />
                            </TouchableOpacity>
                        </View>
                        {!collapsedSections.recordAccessControlPoint && (
                            <>

                                <View style={[styles.itemRaw]}>
                                    <Text adjustsFontSizeToFit style={[styles.title]}>Indications</Text>
                                    <Switch
                                        value={recordAcceessIndicationSwitch}
                                        onChange={handleRecordAcceessIndicationSwitch}
                                    />
                                </View>
                                <View style={[{ ...styles.itemRaw, justifyContent: 'center' }]}>
                                    <TouchableOpacity onPress={showFetchDataDialog} style={[styles.button]} >
                                        <Text style={[styles.textButton]}>Send Command </Text>
                                        <Icon solid={true} name={'send-o'} size={16} color={Colors.blue} type="font-awesome" />
                                    </TouchableOpacity>
                                </View>
                                {recordAccessControlIndicationsList.length > 0 && (
                                    DataList(recordAccessControlIndicationsList, setRecordAccessControlIndicationsList)
                                )}

                            </>
                        )}

                    </View>


                </ScrollView>
            </View>

            <RecordAccessControlDialog visible={isRecordAccessDialogVisible} hideDialog={hideFetchDataDialog} peripheralId={peripheralId} resetChart={resetChart} serviceUuid={GLUCOSE_PROFILE.uuid} writeChar={GLUCOSE_PROFILE.record_access_cp}></RecordAccessControlDialog>

            <CustomSnackBar isVisible={visibleSnackBar} close={closeSnackBar} success={snackBarData.success} message={snackBarData.message} />
        </>
    );

};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingTop: 20,
        alignContent: 'center',
        // height: '100%',
        backgroundColor: Colors.lightGray,
        flex: 1,
        // paddingBottom: 100
    },
    itemRaw: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 5,
        minHeight: 40,
        maxHeight: 300
    },
    itemColumn: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 5,
        // maxHeight: 300,
        minHeight: 40,
    },
    boxContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 18,
        paddingHorizontal: 10,
    },
    title: {
        fontSize: 14,
        fontWeight: "500",
        flex: 1,
    },
    subject: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1
    },
    subjectRaw: {
        height: 50
    },
    data: {
        fontSize: 14,
    },
    textButton: {
        color: Colors.blue,
        marginRight: 10,
        fontSize: 16,
    },
    shadow: {
        shadowColor: 'rgba(0,0,0,0.4)',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 5,
    },
    dataScrolling: {
        maxHeight: 250,
        borderColor: Colors.lightGray,

    },
    button: {
        flexDirection: 'row',
        height: 30,
        justifyContent: 'center',
        // borderRadius: 5,
        // borderWidth: 0.5,
        // borderColor: Colors.blue,
        alignItems: 'center',
        paddingHorizontal: 15,
        minWidth: 200
    },
    chart: {
        // width: screenWidth - 100,
        height: 300,
        paddingHorizontal: 10,
        marginBottom: 18,
        marginTop: 10,
        paddingVertical: 10

    },
})
export default GlucoseProfile;
