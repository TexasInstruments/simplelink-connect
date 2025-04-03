import { InteractionManager, NativeEventEmitter, Platform, StatusBar, Switch, TouchableHighlight, View, processColor } from 'react-native';
import { Text, TouchableOpacity } from '../Themed';
import { StyleSheet, NativeModules } from 'react-native';
import Colors from '../../constants/Colors';
import { useCallback, useEffect, useState } from 'react';
import BleManager from 'react-native-ble-manager';
import { Divider, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { CGM_PROFILE } from '../../constants/uuids';
import { ScrollView } from 'react-native-gesture-handler';
import { OP_CODES_ACCESS_CONTROL, RecordAccessControlDialog } from './RecordAccessControlDialog';
import { CONTROL_POINT_RESP, OP_CODES_CONTROL_POINT, SpecificOpsControlPointDialog } from './SpecificOpsControlPointDialog';
import { Buffer } from 'buffer';
import { Icon } from '@rneui/base';
import { CustomSnackBar } from './CustomSnackBar';
import { LineChart } from 'react-native-charts-wrapper';
import { AntDesign } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import Tooltip from 'react-native-walkthrough-tooltip';
import { downloadDataToLocalStorage } from '../../services/DownloadFileUtils';

interface Props {
    peripheralId: string;
}

interface CollapsedSections {
    cgmMeaurment: boolean;
    cgmFeatures: boolean;
    cgmStatus: boolean;
    cgmSessionStartTime: boolean;
    cgmSessionRunTime: boolean;
    recordAccessControlPoint: boolean;
    cgmSpecificOpsControlPoint: boolean;
}

interface Record {
    data: string;
    time: string
}

const CGM: React.FC<Props> = ({ peripheralId }) => {

    const [notificationSwitch, setNotificationSwitch] = useState<boolean>(false);
    const [recordAcceessIndicationSwitch, setRecordAcceessIndicationSwitch] = useState<boolean>(false);
    const [opControlIndicationSwitch, setOpControlIndicationSwitch] = useState<boolean>(false);

    const [measurementsList, setMeasurementsList] = useState<Record[]>([]);
    const [recordAccessControlIndicationsList, setRecordAccessControlIndicationsList] = useState<Record[]>([]);
    const [specificOpsControlIndicationsList, setSpecificOpsControlIndicationsList] = useState<Record[]>([]);

    const [isRecordAccessDialogVisible, setRecordAccessDialogVisible] = useState<boolean>(false);
    const [isSpecificOpControlDialogVisible, setSpecificOpControlDialogVisible] = useState<boolean>(false);

    const [cgmFeature, setCgmFeature] = useState<{ supportedFeature: any[], type: string, location: string }>({ supportedFeature: [], type: '', location: '' });
    const [timeOffset, setTimeOffset] = useState<string>('');
    const [cgmStatus, setCgmStatus] = useState<string>('');
    const [sessionRunTime, setSessionRunTime] = useState<string>('');
    const [sessionStartTime, setSessionStartTime] = useState<{ time: string, date: string, timeZone: string, DSTofsset: string }>({ time: '', date: '', timeZone: '', DSTofsset: '' });

    const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>({ cgmMeaurment: true, cgmFeatures: true, cgmStatus: true, cgmSessionStartTime: true, cgmSessionRunTime: true, recordAccessControlPoint: true, cgmSpecificOpsControlPoint: true });
    const [sectionsTooltip, setSectionsTooltip] = useState<CollapsedSections>({ cgmMeaurment: false, cgmFeatures: false, cgmStatus: false, cgmSessionStartTime: false, cgmSessionRunTime: false, recordAccessControlPoint: false, cgmSpecificOpsControlPoint: false });

    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

    const [visibleSnackBar, setVisibleSnackBar] = useState(false);
    const [snackBarData, setSnackBarData] = useState<{ message: string, success: boolean }>({ message: '', success: false });

    const [measurmentsDataSet, setMeasurmentsDataSet] = useState<{ data: number, label: string }[]>([]);
    const [dataFormatting, setDataFormatting] = useState<string>('Chart');

    useFocusEffect(
        useCallback(() => {
            const task = InteractionManager.runAfterInteractions(() => {
                bleManagerEmitter.addListener(
                    'BleManagerDidUpdateValueForCharacteristic', handleNotifications);

                // BleManager.startNotification(peripheralId, CGM_PROFILE.uuid, CGM_PROFILE.record_access_cp);
                setOpControlIndicationSwitch(true);
                setNotificationSwitch(true);
                setRecordAcceessIndicationSwitch(true);

                getFeaturesData();
                getStatusData();
                getSessionStartTimeData();
                getSessionRunTime();
            });

            return () => {
                task.cancel();
                bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');

                // Stop notifications
                BleManager.stopNotification(peripheralId, CGM_PROFILE.uuid, CGM_PROFILE.cgm_measurement);
                BleManager.stopNotification(peripheralId, CGM_PROFILE.uuid, CGM_PROFILE.record_access_cp);
                BleManager.stopNotification(peripheralId, CGM_PROFILE.uuid, CGM_PROFILE.cgm_specific_op_cp);
            };
        }, [])
    );

    useEffect(() => {
        if (notificationSwitch) {
            // Start polling interval if indicationsSwitch is enabled
            console.log('Enable Notifications');
            BleManager.startNotification(peripheralId, CGM_PROFILE.uuid, CGM_PROFILE.cgm_measurement);
        } else {
            BleManager.stopNotification(peripheralId, CGM_PROFILE.uuid, CGM_PROFILE.cgm_measurement); // Stop notifications
        }
    }, [notificationSwitch]);

    useEffect(() => {
        if (recordAcceessIndicationSwitch) {
            // Start polling interval if indicationsSwitch is enabled
            console.log('Enable RAC Indication');
            BleManager.startNotification(peripheralId, CGM_PROFILE.uuid, CGM_PROFILE.record_access_cp);
        } else {
            BleManager.stopNotification(peripheralId, CGM_PROFILE.uuid, CGM_PROFILE.record_access_cp); // Stop notifications
        }
    }, [recordAcceessIndicationSwitch]);

    useEffect(() => {
        if (opControlIndicationSwitch) {
            // Start polling interval if indicationsSwitch is enabled
            console.log('Enable OpControl Indication');
            BleManager.startNotification(peripheralId, CGM_PROFILE.uuid, CGM_PROFILE.cgm_specific_op_cp);
        } else {
            console.log('disable OpControl Indication');

            BleManager.stopNotification(peripheralId, CGM_PROFILE.uuid, CGM_PROFILE.cgm_specific_op_cp); // Stop notifications
        }
    }, [opControlIndicationSwitch]);

    const handleNotificationSwitch = useCallback(async () => {
        setNotificationSwitch((prev) => !prev);
    }, [notificationSwitch]);

    const handleOpControlIndicationSwitch = useCallback(async () => {
        setOpControlIndicationSwitch((prev) => !prev);
    }, [opControlIndicationSwitch]);

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

    function bytesToStatusString(statusBits: any, calTempBits: any, warningBits: any,): string {
        let str = '';

        if (statusBits) {
            if (!!(statusBits & 0b00000001)) {
                str += `Status: Session stopped \n`;
            }
            if (!!(statusBits & 0b00000010)) {
                str += `Status: Device battery low \n`;
            }
            if (!!(statusBits & 0b00000100)) {
                str += `Status: Sensor type incorrect for device \n`;
            }
            if (!!(statusBits & 0b00001000)) {
                str += `Status: Sensor malfunction \n`;
            }
            if (!!(statusBits & 0b00010000)) {
                str += `Status: Device Specific Alert \n`;
            }
            if (!!(statusBits & 0b00100000)) {
                str += `Status: General device fault has occurred in the sensor \n`;
            }
        }
        if (calTempBits) {
            if (!!(calTempBits & 0b00000001)) {
                str += `Cal/Temp: Time synchronization between sensor and collector required \n`;
            }
            if (!!(calTempBits & 0b00000010)) {
                str += `Cal/Temp: Calibration not allowed \n`;
            }
            if (!!(calTempBits & 0b00000100)) {
                str += `Cal/Temp: Calibration recommended \n`;
            }
            if (!!(calTempBits & 0b00001000)) {
                str += `Cal/Temp: Calibration required \n`;
            }
            if (!!(calTempBits & 0b00010000)) {
                str += `Cal/Temp: Sensor temperature too high for valid test/result at time of measurement \n`;
            }
            if (!!(calTempBits & 0b00100000)) {
                str += `Cal/Temp: Sensor temperature too low for valid test/result at time of measurement	\n`;
            }
            if (!!(calTempBits & 0b01000000)) {
                str += `Cal/Temp: Calibration Process Pending	\n`;
            }
        }
        if (warningBits) {
            if (!!(warningBits & 0b00000001)) {
                str += `Warning: Sensor result lower than the Patient Low level \n`;
            }
            if (!!(warningBits & 0b00000010)) {
                str += `Warning: Sensor result higher than the Patient High level \n`;
            }
            if (!!(warningBits & 0b00000100)) {
                str += `Warning: Sensor result lower than the Hypo level \n`;
            }
            if (!!(warningBits & 0b00001000)) {
                str += `Warning: Sensor result higher than the Hyper level \n`;
            }
            if (!!(warningBits & 0b00010000)) {
                str += `Warning: Sensor Rate of Decrease exceeded \n`;
            }
            if (!!(warningBits & 0b00100000)) {
                str += `Warning: Sensor Rate of Increase exceeded \n`;
            }
            if (!!(warningBits & 0b01000000)) {
                str += `Warning: Sensor result lower than the device can process \n`;
            }
            if (!!(warningBits & 0b10000000)) {
                str += `Warning: Sensor result higher than the device can process \n`;
            }
        }

        return str.substring(0, str.length - 2);
    }

    const handleNotifications =
        ({ value, peripheral, characteristic, service }: any) => {
            console.log(`notification: ${value}, characteristic: ${characteristic}`);
            if (characteristic.toLowerCase().includes(CGM_PROFILE.cgm_measurement.toLowerCase()) && value) {
                let newNotification = {
                    data: parseMeasurement(value),
                    time: new Date().toTimeString().split(' ')[0]
                }

                setMeasurementsList(prevData => [...prevData, newNotification]);
                setCollapsedSections((prev) => ({ ...prev, cgmMeaurment: false }))
            }

            else if (characteristic.toLowerCase().includes(CGM_PROFILE.record_access_cp.toLowerCase()) && value) {
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

            else if (characteristic.toLowerCase().includes(CGM_PROFILE.cgm_specific_op_cp.toLowerCase()) && value) {
                let message = '';
                const opCode = value[0];
                if (opCode == CONTROL_POINT_RESP.communicationInterval.value) {
                    let commInterval = value[1];
                    message = 'Communication Interval in minutes: ' + commInterval;
                }
                else if (opCode == CONTROL_POINT_RESP.patientHighAlertLevel.value ||
                    // opCode == CONTROL_POINT_RESP.calibrationValue.value ||
                    opCode == CONTROL_POINT_RESP.patientLowAlertLevelResponse.value ||
                    opCode == CONTROL_POINT_RESP.hypoAlertLevelResponse.value ||
                    opCode == CONTROL_POINT_RESP.hyperAlertLevelResponse.value ||
                    opCode == CONTROL_POINT_RESP.rateofDecreaseAlertLevelResponse.value ||
                    opCode == CONTROL_POINT_RESP.rateofIncreaseAlertLevelResponse.value
                ) {
                    let respVal = value[1] + value[2] * 256;
                    let respDesc = Object.values(CONTROL_POINT_RESP).find(o => o.value === opCode)?.desc
                    message = respDesc + ': ' + respVal;
                }

                else if (opCode == CONTROL_POINT_RESP.responseCode.value) {
                    let reqOpCode = value[1];
                    let responseCodeValue = value[2];
                    let OpCodeString = opCodeToString(Object.values(OP_CODES_CONTROL_POINT), reqOpCode)
                    message = OpCodeString + ': ' + responseCodeToMessage(responseCodeValue);
                    if (responseCodeValue = !0x01) {
                        showSnackBar(false, message);
                        return;
                    }
                }
                let newNotification = {
                    data: message + '\n',
                    time: new Date().toTimeString().split(' ')[0]
                }

                setSpecificOpsControlIndicationsList((prev: any) => [...prev, newNotification])
                showSnackBar(true, message);
            }

        }

    function parseMeasurement(data: any) {
        let str = '';

        const valueArray = new Uint8Array(data);
        const size = valueArray[0];
        // str += `Record Size: ${size} \n`;

        // Parse flags
        const flags = valueArray[1];
        const trendInformationPresent = !!(flags & 0b00000001);
        const qualityPresent = !!(flags & 0b00000010);
        const warningOctetPresent = !!(flags & 0b00100000);
        const calTempOctetPresent = !!(flags & 0b01000000);
        const statusOctetPresent = !!(flags & 0b10000000);

        // Glucose Concentration
        const buffer = new ArrayBuffer(2);
        const view = new DataView(buffer);
        view.setUint8(0, valueArray[2]);
        view.setUint8(1, valueArray[3]);
        const rawValue = view.getUint16(0, true); // Read as little-endian

        let exponent = (rawValue & 0xF000) >> 12; // Extract the exponent
        let mantissa = rawValue & 0x0FFF; // Extract the mantissa
        // Convert exponent to signed integer (4-bit)
        if (exponent >= 0x8) {
            exponent = -((~exponent & 0xF) + 1);
        }

        // Convert mantissa to signed integer (12-bit)
        if (mantissa >= 0x800) {
            mantissa = -((~mantissa & 0xFFF) + 1);
        }

        const glucoseConcentration = mantissa * Math.pow(10, exponent);
        str += `Glucose Concentration: ${glucoseConcentration} \n`


        // Time Offset 
        const timeOffset = valueArray[4] + valueArray[5] * 256;
        str += `Time Offset: ${timeOffset} \n`;

        setMeasurmentsDataSet(prev => [...prev, { data: glucoseConcentration, label: timeOffset.toString() }]);

        let index = 6;
        let status = undefined;
        let calTemp = undefined;
        let warning = undefined;
        // Sensor Status Annunciation (optional)
        if (statusOctetPresent) {
            status = valueArray[index];
            index++;
        }
        if (calTempOctetPresent) {
            calTemp = valueArray[index];
            index++;
        }
        if (warningOctetPresent) {
            warning = valueArray[index];
            index++;
        }
        str += bytesToStatusString(status, calTemp, warning);

        //CGM Trend Information (optional)
        if (trendInformationPresent) {
            const trendRate = valueArray[index] + valueArray[index + 1] * 256;
            str += `CGM Trend Information: ${trendRate} \n`;
            index += 2;
        }
        // CGM Quality (optional)
        if (qualityPresent) {
            const quality = valueArray[index] + valueArray[index + 1] * 256;
            str += `CGM Quality: ${quality} \n`;
            index += 2;
        }
        return str + '\n';
    }

    function parseCgmFeatureCharacteristic(data: any) {
        let features: any[] = [];
        let typeDescription = '';
        let sampleLocationDescription = '';

        const buffer = Buffer.from(data);

        // Ensure the buffer has at least 2 bytes (16 bits)
        if (buffer.length < 2) {
            throw new Error('Invalid CGM Feature characteristic length');
        }

        const featureBits = buffer.readUInt16LE(0); // First 2 bytes is the feature listlittle-endian
        const typeSampleLocationByte = buffer.readUInt8(3);

        if (featureBits & 0x0001) features = [...features, 'Calibration supported'];
        if (featureBits & 0x0002) features = [...features, 'Patient High/Low Alert supported'];
        if (featureBits & 0x0004) features = [...features, 'Hypo Alert supported'];
        if (featureBits & 0x0008) features = [...features, 'Hyper Alert supported'];
        if (featureBits & 0x0010) features = [...features, 'Rate of Increase/Decrease Alert supported'];
        if (featureBits & 0x0020) features = [...features, 'Device Specific Alert supported'];
        if (featureBits & 0x0040) features = [...features, 'Sensor Malfunction Detection supported'];
        if (featureBits & 0x0080) features = [...features, 'Sensor Temperature High-Low Detection supported'];
        if (featureBits & 0x0100) features = [...features, 'Sensor Result High-Low Detection supported'];
        if (featureBits & 0x0200) features = [...features, 'Low Battery Detection supported'];
        if (featureBits & 0x0400) features = [...features, 'Sensor Type Error Detection supported'];
        if (featureBits & 0x0800) features = [...features, 'General Device Fault supported'];
        if (featureBits & 0x1000) features = [...features, 'E2E-CRC supported'];
        if (featureBits & 0x2000) features = [...features, 'Multiple Bond supported'];
        if (featureBits & 0x4000) features = [...features, 'Multiple Sessions supported'];
        if (featureBits & 0x8000) features = [...features, 'CGM Trend Information supported'];
        if (featureBits & 0x10000) features = [...features, 'CGM Quality supported'];

        const type = typeSampleLocationByte & 0x0F; // Least significant nibble
        const sampleLocation = (typeSampleLocationByte >> 4) & 0x0F; // Most significant nibble

        switch (type) {
            case 0x0:
                typeDescription = 'Reserved';
                break;
            case 0x1:
                typeDescription = 'Capillary Whole blood';
                break;
            case 0x2:
                typeDescription = 'Capillary Plasma';
                break;
            case 0x3:
                typeDescription = 'Venous Whole blood';
                break;
            case 0x4:
                typeDescription = 'Venous Plasma';
                break;
            case 0x5:
                typeDescription = 'Arterial Whole blood';
                break;
            case 0x6:
                typeDescription = 'Arterial Plasma';
                break;
            case 0x7:
                typeDescription = 'Undetermined Whole blood';
                break;
            case 0x8:
                typeDescription = 'Undetermined Plasma';
                break;
            case 0x9:
                typeDescription = 'Interstitial Fluid (ISF)';
                break;
            case 0xA:
                typeDescription = 'Control Solution';
                break;
            default:
                typeDescription = 'Unknown';
        }

        switch (sampleLocation) {
            case 0x0:
                sampleLocationDescription = 'Reserved';
                break;
            case 0x1:
                sampleLocationDescription = 'Finger';
                break;
            case 0x2:
                sampleLocationDescription = 'Alternate Site Test (AST)';
                break;
            case 0x3:
                sampleLocationDescription = 'Earlobe';
                break;
            case 0x4:
                sampleLocationDescription = 'Control solution';
                break;
            case 0x5:
                sampleLocationDescription = 'Subcutaneous';
                break;
            default:
                sampleLocationDescription = 'Unknown';
        }

        return {
            features: features,
            type: typeDescription,
            sampleLocation: sampleLocationDescription,
        };
    };

    function parseCgmStatus(data: any) {
        if (data.length < 2) {
            throw new Error('Invalid CGM Status characteristic length');
        }
        const valueArray = new Uint8Array(data);
        const timeOffset = valueArray[0] + valueArray[1] * 256;

        return {
            status: bytesToStatusString(valueArray[2], valueArray[3], valueArray[4]),
            timeOffset: timeOffset
        };
    }

    function parseSessionStartTime(data: any): { time: string, date: string, timeZoneOffset: string, DSToffset: string } {
        const valueArray = new Uint8Array(data);
        const year = valueArray[0] + valueArray[1] * 256;
        const month = valueArray[2];
        const day = valueArray[3];
        const hour = valueArray[4];
        const minutes = valueArray[5];
        const seconds = valueArray[6];
        let time = new Date(year, month, day, hour, minutes, seconds);

        const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const timeZoneOffset = valueArray[7];

        const DSToffset = valueArray[8];
        let DTSstring = '';
        switch (DSToffset) {
            case (0):
                DTSstring = 'Standard Time'
                break;
            case (2):
                DTSstring = 'Half an hour Daylight Time (+ 0.5h)'
                break;
            case (4):
                DTSstring = 'Daylight Time (+ 1h)'
                break;
            case (8):
                DTSstring = 'Double Daylight Time (+ 2h)'
                break;
            case (255):
                DTSstring = 'DST offset unknown'
                break;
        }

        return {
            time: timeString,
            date: time.toDateString(),
            timeZoneOffset: 'UTC+' + timeZoneOffset,
            DSToffset: DTSstring
        }
    }

    async function getFeaturesData() {
        let response = await BleManager.read(peripheralId, CGM_PROFILE.uuid, CGM_PROFILE.cgm_feature);
        const featureCharData = parseCgmFeatureCharacteristic(response);

        setCgmFeature(
            {
                supportedFeature: featureCharData.features,
                location: featureCharData.sampleLocation,
                type: featureCharData.type,
            }
        )
    }

    async function getStatusData() {
        let response = await BleManager.read(peripheralId, CGM_PROFILE.uuid, CGM_PROFILE.cgm_status);
        const statusCharData = parseCgmStatus(response);

        setCgmStatus(statusCharData.status);
        setTimeOffset(statusCharData.timeOffset.toString());

    }

    async function getSessionStartTimeData() {
        let response = await BleManager.read(peripheralId, CGM_PROFILE.uuid, CGM_PROFILE.cgm_session_start_time);
        const sessionCharData = parseSessionStartTime(response);
        setSessionStartTime({ time: sessionCharData.time, date: sessionCharData.date, timeZone: sessionCharData.timeZoneOffset, DSTofsset: sessionCharData.DSToffset });
    }

    async function getSessionRunTime() {
        let response = await BleManager.read(peripheralId, CGM_PROFILE.uuid, CGM_PROFILE.cgm_session_run_time);
        const valueArray = new Uint8Array(response);
        const time = valueArray[0] + valueArray[1] * 256;
        setSessionRunTime(time.toString() + ' Hours');
    }

    const showFetchDataDialog = () => {
        closeSnackBar();
        setRecordAccessDialogVisible(true);
    };

    const showSendCommandDialog = () => {
        closeSnackBar();
        setSpecificOpControlDialogVisible(true)
    };

    const hideFetchDataDialog = () => setRecordAccessDialogVisible(false);
    const hideSendCommandDialog = () => setSpecificOpControlDialogVisible(false);

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
            case (0):       // cgmMeasurements
                updated = { ...collapsedSections, cgmMeaurment: !current.cgmMeaurment }
                break;
            case (1):       // cgmFeatures
                updated = { ...collapsedSections, cgmFeatures: !current.cgmFeatures }
                break;
            case (2):       // cgmStatus
                updated = { ...collapsedSections, cgmStatus: !current.cgmStatus }
                break;
            case (3):       // cgmSessionStartTime
                updated = { ...collapsedSections, cgmSessionStartTime: !current.cgmSessionStartTime }
                break;
            case (4):       // cgmSessionRunTime
                updated = { ...collapsedSections, cgmSessionRunTime: !current.cgmSessionRunTime }
                break;
            case (5):       // record access control point
                updated = { ...collapsedSections, recordAccessControlPoint: !current.recordAccessControlPoint }
                break;
            case (6):       // record access control point
                updated = { ...collapsedSections, cgmSpecificOpsControlPoint: !current.cgmSpecificOpsControlPoint }
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
                    {/* cgm measurment */}
                    <View style={[styles.boxContainer]}>
                        <View style={[{ width: '100%', flexDirection: 'row', alignItems: 'center' }]}>
                            {toolTip(sectionsTooltip.cgmMeaurment, (isVisible: boolean) => { setSectionsTooltip({ ...sectionsTooltip, cgmMeaurment: isVisible }) }, 'The CGM Measurement characteristic is a variable length structure containing one or more CGM Measurement records')}
                            <TouchableOpacity style={[{ ...styles.subjectRaw, ...styles.itemRaw, flex: 1 }]} onPress={() => toggleCollapse(0)}>
                                <Text style={[styles.subject]}>CGM Measurement</Text>
                                <Icon style={{ alignSelf: 'center' }} name={collapsedSections.cgmMeaurment ? 'chevron-down' : 'chevron-up'} type='font-awesome-5' size={18} />
                            </TouchableOpacity>
                        </View>
                        {!collapsedSections.cgmMeaurment && (
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
                                            buttons={[{
                                                value: 'List', label: 'List', style: { borderColor: 'gray', backgroundColor: dataFormatting === 'List' ? 'rgba(0,128,128, .1)' : 'white' }
                                            }, { value: 'Chart', label: 'Chart', style: { borderColor: 'gray', backgroundColor: dataFormatting === 'Chart' ? 'rgba(0,128,128, .1)' : 'white' } }]} />
                                    </>
                                )}
                            </>
                        )}

                    </View>
                    {/* cgm feature */}
                    <View style={[styles.boxContainer]}>
                        <View style={[{ width: '100%', flexDirection: 'row', alignItems: 'center' }]}>
                            {toolTip(sectionsTooltip.cgmFeatures, (isVisible: boolean) => { setSectionsTooltip({ ...sectionsTooltip, cgmFeatures: isVisible }) }, 'The CGM Feature characteristic is used to describe the supported features of the server.')}

                            <TouchableOpacity style={[{ ...styles.subjectRaw, ...styles.itemRaw, flex: 1 }]} onPress={() => toggleCollapse(1)}>
                                <Text style={[styles.subject]}>CGM Feature</Text>
                                <Icon style={{ alignSelf: 'center' }} name={collapsedSections.cgmFeatures ? 'chevron-down' : 'chevron-up'} type='font-awesome-5' size={18} />
                            </TouchableOpacity>
                        </View>
                        {!collapsedSections.cgmFeatures && (
                            <>
                                <View style={[styles.itemRaw]}>
                                    <Text style={[styles.title]}>CGM Feature List</Text>
                                    {cgmFeature.supportedFeature.length == 0 && (
                                        <Text style={[styles.data]}>None</Text>
                                    )}
                                </View>
                                {cgmFeature.supportedFeature.length > 0 && (
                                    <View style={{ paddingHorizontal: 10, height: styles.itemRaw.height }}>

                                        <Text style={[styles.data]}>{cgmFeature.supportedFeature.join('\n')}</Text>
                                    </View>
                                )}
                                <Divider />
                                <View style={[styles.itemRaw]}>
                                    <Text style={[styles.title]}>Type</Text>
                                    <Text style={[styles.data]}>{cgmFeature.type}</Text>
                                </View>
                                <Divider />
                                <View style={[styles.itemRaw]}>
                                    <Text style={[styles.title]}>Sample Location</Text>
                                    <Text style={[styles.data]}>{cgmFeature.location}</Text>
                                </View>
                                <View style={[{ ...styles.itemRaw, justifyContent: 'center' }]}>
                                    {refreshData(getFeaturesData)}
                                </View>

                            </>
                        )}

                    </View>
                    {/* cgm status */}
                    <View style={[styles.boxContainer]}>
                        <View style={[{ width: '100%', flexDirection: 'row', alignItems: 'center' }]}>
                            {toolTip(sectionsTooltip.cgmStatus, (isVisible: boolean) => { setSectionsTooltip({ ...sectionsTooltip, cgmStatus: isVisible }) }, 'The CGM Status characteristic is used to represent the current status of a continuous glucose monitor (CGM) sensor.')}

                            <TouchableOpacity style={[{ ...styles.itemRaw, ...styles.subjectRaw, flex: 1 }]} onPress={() => toggleCollapse(2)}>
                                <Text style={[styles.subject]}>CGM Status</Text>
                                <Icon style={{ alignSelf: 'center' }} name={collapsedSections.cgmStatus ? 'chevron-down' : 'chevron-up'} type='font-awesome-5' size={18} />
                            </TouchableOpacity>
                        </View>
                        {!collapsedSections.cgmStatus && (
                            <>
                                <View style={[styles.itemRaw]}>
                                    <Text style={[styles.title]}>Time Offset</Text>
                                    <Text style={[styles.data]}>{timeOffset}</Text>
                                </View>
                                <Divider />
                                <View style={[{ ...styles.itemColumn }]}>
                                    <Text style={[styles.title]}>CGM Status</Text>
                                    <Text style={[styles.data]}>{cgmStatus}</Text>
                                </View>
                                <View style={[{ ...styles.itemRaw, justifyContent: 'center' }]}>
                                    {refreshData(getStatusData)}
                                </View>
                            </>
                        )}
                    </View>
                    {/* cgm session start time */}
                    <View style={[styles.boxContainer]}>
                        <View style={[{ width: '100%', flexDirection: 'row', alignItems: 'center' }]}>
                            {toolTip(sectionsTooltip.cgmSessionStartTime, (isVisible: boolean) => { setSectionsTooltip({ ...sectionsTooltip, cgmSessionStartTime: isVisible }) }, 'The CGM Session Start Time characteristic is used to represent the time the continuous glucose monitor (CGM) session is started.')}

                            <TouchableOpacity style={[{ ...styles.itemRaw, ...styles.subjectRaw, flex: 1 }]} onPress={() => toggleCollapse(3)}>
                                <Text allowFontScaling adjustsFontSizeToFit numberOfLines={1} style={[styles.subject]}>CGM Session Start Time</Text>
                                <Icon style={{ alignSelf: 'center' }} name={collapsedSections.cgmSessionStartTime ? 'chevron-down' : 'chevron-up'} type='font-awesome-5' size={18} />
                            </TouchableOpacity>
                        </View>
                        {(!collapsedSections.cgmSessionStartTime && (
                            <>
                                <View style={[styles.itemRaw]}>
                                    <Text style={[styles.title]}>Start Time</Text>
                                    <Text style={[styles.data]}>{sessionStartTime.time}</Text>
                                </View>
                                <Divider />
                                <View style={[styles.itemRaw]}>
                                    <Text style={[styles.title]}>Start Date</Text>
                                    <Text style={[styles.data]}>{sessionStartTime.date}</Text>
                                </View>
                                <Divider />
                                <View style={[{ ...styles.itemRaw }]}>
                                    <Text style={[styles.title]}>Time Zone</Text>
                                    <Text style={[styles.data]}>{sessionStartTime.timeZone}</Text>
                                </View>
                                <Divider />
                                <View style={[{ ...styles.itemRaw }]}>
                                    <Text style={[styles.title]}>DST Offset</Text>
                                    <Text style={[styles.data]}>{sessionStartTime.DSTofsset}</Text>
                                </View>
                                <View style={[{ ...styles.itemRaw, justifyContent: 'center' }]}>
                                    {refreshData(getSessionStartTimeData)}
                                </View>
                            </>
                        ))}

                    </View>
                    {/* cgm session run time */}
                    <View style={[styles.boxContainer]}>
                        <View style={[{ width: '100%', flexDirection: 'row', alignItems: 'center' }]}>
                            {toolTip(sectionsTooltip.cgmSessionRunTime, (isVisible: boolean) => { setSectionsTooltip({ ...sectionsTooltip, cgmSessionRunTime: isVisible }) }, 'The CGM Session Run Time characteristic is used to represent the expected run time of the continuous glucose monitor (CGM) session.')}

                            <TouchableOpacity style={[{ ...styles.itemRaw, ...styles.subjectRaw, flex: 1 }]} onPress={() => toggleCollapse(4)}>
                                <Text allowFontScaling adjustsFontSizeToFit numberOfLines={1} style={[styles.subject]}>CGM Session Run Time</Text>
                                <Icon style={{ alignSelf: 'center' }} name={collapsedSections.cgmSessionRunTime ? 'chevron-down' : 'chevron-up'} type='font-awesome-5' size={18} />
                            </TouchableOpacity>
                        </View>
                        {!collapsedSections.cgmSessionRunTime && (
                            <>
                                <View style={[styles.itemRaw]}>
                                    <Text style={[styles.title]}>Run Time</Text>
                                    <Text style={[styles.data]}>{sessionRunTime}</Text>
                                </View>
                                <View style={[{ ...styles.itemRaw, justifyContent: 'center' }]}>
                                    {refreshData(getSessionRunTime)}
                                </View>
                            </>
                        )}

                    </View>
                    {/* Record Access Control Point */}
                    <View style={[styles.boxContainer]}>
                        <View style={[{ width: '100%', flexDirection: 'row', alignItems: 'center' }]}>
                            {toolTip(sectionsTooltip.recordAccessControlPoint, (isVisible: boolean) => { setSectionsTooltip({ ...sectionsTooltip, recordAccessControlPoint: isVisible }) }, 'The Record Access Control Point is used to enable device-specific procedures for basic management of a set of data records. The record list will be available in the CGM Measurments section. ')}

                            <TouchableOpacity style={[{ ...styles.itemRaw, ...styles.subjectRaw, flex: 1 }]} onPress={() => toggleCollapse(5)}>
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
                    {/* CGM Specific Ops Control Point */}
                    <View style={[styles.boxContainer]}>
                        <View style={[{ width: '100%', flexDirection: 'row', alignItems: 'center' }]}>
                            {toolTip(sectionsTooltip.cgmSpecificOpsControlPoint, (isVisible: boolean) => { setSectionsTooltip({ ...sectionsTooltip, cgmSpecificOpsControlPoint: isVisible }) }, 'The CGM Specific Ops Control Point characteristic is used to enable procedures related to a continuous glucose monitor (CGM).')}

                            <TouchableOpacity style={[{ ...styles.itemRaw, ...styles.subjectRaw, flex: 1 }]} onPress={() => toggleCollapse(6)}>
                                <Text style={[styles.subject]} adjustsFontSizeToFit numberOfLines={1} allowFontScaling >CGM Specific Ops Control Point</Text>
                                <Icon style={{ alignSelf: 'center' }} name={collapsedSections.cgmSpecificOpsControlPoint ? 'chevron-down' : 'chevron-up'} type='font-awesome-5' size={18} />
                            </TouchableOpacity>
                        </View>
                        {!collapsedSections.cgmSpecificOpsControlPoint && (
                            <>
                                <View style={[styles.itemRaw]}>
                                    <Text style={[styles.title]}>Indications</Text>
                                    <Switch
                                        value={opControlIndicationSwitch}
                                        onChange={handleOpControlIndicationSwitch}
                                    />
                                </View>
                                {specificOpsControlIndicationsList.length > 0 && (
                                    DataList(specificOpsControlIndicationsList, setSpecificOpsControlIndicationsList)
                                )}
                                <View style={[{ ...styles.itemRaw, justifyContent: 'center' }]}>
                                    <TouchableOpacity onPress={showSendCommandDialog} style={[styles.button]}>
                                        <Text style={[styles.textButton]}>Send Command </Text>
                                        <Icon solid={true} name={'send-o'} size={16} color={Colors.blue} type="font-awesome" />
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                    </View>


                </ScrollView>
            </View>

            <RecordAccessControlDialog visible={isRecordAccessDialogVisible} hideDialog={hideFetchDataDialog} peripheralId={peripheralId} resetChart={resetChart} serviceUuid={CGM_PROFILE.uuid} writeChar={CGM_PROFILE.record_access_cp}></RecordAccessControlDialog>
            <SpecificOpsControlPointDialog visible={isSpecificOpControlDialogVisible} hideDialog={hideSendCommandDialog} peripheralId={peripheralId}></SpecificOpsControlPointDialog>

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
export default CGM;
