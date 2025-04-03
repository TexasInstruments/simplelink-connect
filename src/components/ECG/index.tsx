import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
    InteractionManager,
    KeyboardAvoidingView,
    NativeEventEmitter,
    NativeModules,
    Platform,
    ScrollView,
    StatusBar,
    TouchableOpacity,
    View,
    processColor,
    useWindowDimensions
} from 'react-native';
import { Text } from '../Themed';
import { StyleSheet } from 'react-native';
import Colors from '../../constants/Colors';
import BleManager from 'react-native-ble-manager';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-charts-wrapper';
import { Icon } from '@rneui/base';
import { useSpecificScreenConfigContext } from '../../context/SpecificScreenOptionsContext';
import { downloadDataToLocalStorage } from '../../services/DownloadFileUtils';
import Tooltip from 'react-native-walkthrough-tooltip';


interface Props {
    peripheralId: string;
}

interface CollapsedSections {
    ecg: boolean;
    pace: boolean;
    respiration: boolean;
    ecgCh1: boolean,
    ecgCh2: boolean,
    ecgCh3: boolean,
    ecgCh4: boolean,
}

interface DataChart {
    x: string;
    y: number;
    time: string;
}

const SectionsIDs = {
    ecg: 0,
    pace: 1,
    respiration: 2,
    ecgCh1: 3,
    ecgCh2: 4,
    ecgCh3: 5,
    ecgCh4: 6,
}

const NormalIndicator = {
    value: 1,
    title: 'Normal',
    text: 'NSR:      Normal sinus rhythm'
}

const NoIndicator = {
    value: 7,
    title: 'no_indicator',
    text: ''
}

const MildIndicator = {
    value: 2,
    title: 'Mild',
    text: `APB:             Atrial premature beat \nFusion:         Fusion of paced and normal beat \nBigeminy:    Ventricular bigeminy \nTrigeminy:   Ventricular trigeminy \nAFL:              Atrial flutter \nSVTA:           Supraventricular tachyarrhythmia \nPVC:             Premature ventricular contraction \nLBBBB:         Left bundle branch block beat \nRBBBB:        Right bundle branch block beat`
}

const SevereIndicator = {
    value: 3,
    title: 'Severe',
    text: `AFIB:      Atrial fibrillation \nWPW:     Pre-excitation (PREX) \nIVR:         Idioventricular rhythm \nSDHB:    Second-degree heart block (BII)`
}

const EmergencyIndicator = {
    value: 4,
    title: 'Emergency',
    text: `VFL:   Ventricular flutter \nVT:     Ventricular tachycardia`
}

const Indicators = [NoIndicator, NormalIndicator, MildIndicator, SevereIndicator, EmergencyIndicator]

function median(values: DataChart[]): DataChart {

    if (values.length === 0) {
        throw new Error('Input array is empty');
    }

    values = [...values].sort((a, b) => a.y - b.y);

    const half = Math.floor(values.length / 2);

    return (values.length % 2
        ? values[half]
        : { x: values[half].x, time: values[half].time, y: (values[half - 1].y + values[half].y) / 2 }
    );

}

const ECG: React.FC<Props> = ({ peripheralId }) => {

    const SERVICE_UUID = 'f000bb00-0451-4000-b000-000000000000';
    const ECG_PATCH_UUID = 'f000bb01-0451-4000-b000-000000000000';
    const ECG_HOLTER_UUID = 'f000bb02-0451-4000-b000-000000000000';

    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

    const { fontScale } = useWindowDimensions();
    const { specificScreenConfig } = useSpecificScreenConfigContext();

    const notificationSwitch = useRef<boolean>(false);
    const isProcessing = useRef<boolean>(false);
    const displayEcgDataAmount = useRef(specificScreenConfig.pointsNumberToDisplay);
    const applyFilter = useRef(specificScreenConfig.applyRespFilter);
    const medianOn = useRef(specificScreenConfig.medianOn);
    const medianEvery = useRef(specificScreenConfig.medianEvery);
    const recordTimeout = useRef<any>();
    const [recordDuration, setRecordDuration] = useState<number | 'no limit'>(specificScreenConfig.recordDuration);
    const [recordStarted, setRecordStarted] = useState<boolean>(false);

    // Patch
    const [ecgPatchData, setEcgPatchData] = useState<DataChart[]>([]);
    const [pacePatchData, setPacePatchData] = useState<DataChart[]>([]);
    const ecgPatchRef = useRef<DataChart[]>([]);
    const pacePatchRef = useRef<DataChart[]>([]);

    // Holter
    const [ecgHolterData, setEcgHolterData] = useState<{ channel1: DataChart[], channel2: DataChart[], channel3: DataChart[], channel4: DataChart[] }>({ channel1: [], channel2: [], channel3: [], channel4: [] })
    const [filteredPcgData, setFilteredPcgData] = useState<DataChart[]>([]);
    const [pcgData, setPcgData] = useState<DataChart[]>([]);
    const [paceHolterData, setPaceHolterData] = useState<{ amp: DataChart[], width: DataChart[], pol: DataChart[] }>({ amp: [], width: [], pol: [] });
    const lastPaceHolterData = useRef<{ amp: number, width: number, pol: number }>();
    const ecgHolterDataRef = useRef<{ channel1: DataChart[], channel2: DataChart[], channel3: DataChart[], channel4: DataChart[] }>({ channel1: [], channel2: [], channel3: [], channel4: [] });
    const pcgRawDataRef = useRef<DataChart[]>([]);
    const filteredPcgRef = useRef<DataChart[]>([]);
    const paceHolterRef = useRef<{ amp: DataChart[], width: DataChart[], pol: DataChart[] }>({ amp: [], width: [], pol: [] });

    //Indicator
    const indicatorRef = useRef<number>(NoIndicator.value);
    const [labelsTooltip, setLabelsTooltip] = useState({ normal: false, mild: false, severe: false, emergency: false });
    const indicatorDataRef = useRef<{ time: string, formattedTime: string, value: string }[]>([]);

    const [baselineflag, setBaselineflag] = useState<number>(0);
    const [baseline, setBaseline] = useState<number>(0);

    const timeEcg = useRef<Date | null>(null);
    const timePcg = useRef<Date | null>(null);
    const timeIndicator = useRef<Date | null>(null);

    const collapsedSections = useRef<CollapsedSections>({ ecg: true, ecgCh1: true, ecgCh2: true, ecgCh3: true, ecgCh4: true, pace: true, respiration: true });
    const [collapsedSectionsState, setCollapsedSectionsState] = useState<CollapsedSections>({ ecg: true, ecgCh1: true, ecgCh2: true, ecgCh3: true, ecgCh4: true, pace: true, respiration: true });
    const [expandedGraph, setExpandedGraph] = useState<null | number>(null);

    useFocusEffect(
        useCallback(() => {
            const task = InteractionManager.runAfterInteractions(async () => {
                /* Set the MTU Size - Android only API 21+, iOS initiates an MTU exchange automatically upon connection */
                if (Platform.OS === 'android') {
                    await BleManager.requestConnectionPriority(peripheralId, 1);
                    let mtu = await BleManager.requestMTU(peripheralId, 255);
                    console.log('MTU:', mtu)
                }
                bleManagerEmitter.addListener(
                    'BleManagerDidUpdateValueForCharacteristic', handleNotifications);
            });

            return () => {
                task.cancel();
                bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
                try {
                    BleManager.stopNotification(peripheralId, SERVICE_UUID, ECG_PATCH_UUID);
                    BleManager.stopNotification(peripheralId, SERVICE_UUID, ECG_HOLTER_UUID);
                } catch (e) {
                    console.log(e)
                }
                isProcessing.current = false;
                console.log('notification stopped')
            };
        }, [])
    );

    useEffect(() => {

        displayEcgDataAmount.current = specificScreenConfig.pointsNumberToDisplay;
        setRecordDuration(specificScreenConfig.recordDuration);
        medianOn.current = specificScreenConfig.medianOn;
        medianEvery.current = specificScreenConfig.medianEvery;
        applyFilter.current = specificScreenConfig.applyRespFilter;

    }, [specificScreenConfig]);

    useEffect(() => {
        setCollapsedSectionsState(collapsedSections.current);
    }, [collapsedSections.current]);

    const handleStartRecord = () => {
        // reset graphs data
        setEcgPatchData([]);
        setPacePatchData([]);
        setEcgHolterData({ channel1: [], channel2: [], channel3: [], channel4: [] })
        setPaceHolterData({ amp: [], width: [], pol: [] })
        lastPaceHolterData.current = undefined;
        setFilteredPcgData([])
        setPcgData([])
        timeEcg.current = null;
        timePcg.current = null;
        timeIndicator.current = null;

        ecgHolterDataRef.current = { channel1: [], channel2: [], channel3: [], channel4: [] };
        paceHolterRef.current = { amp: [], width: [], pol: [] };
        pcgRawDataRef.current = [];
        filteredPcgRef.current = [];
        ecgPatchRef.current = [];
        pacePatchRef.current = [];
        indicatorDataRef.current = []

        notificationSwitch.current = true;
        let needToExpand = Object.values(collapsedSections.current).filter(value => value === false).length < 2;
        if (!recordStarted || needToExpand) {
            setCollapsedSectionsState({ ecg: false, ecgCh1: false, ecgCh2: true, ecgCh3: true, ecgCh4: true, pace: true, respiration: true })
            collapsedSections.current = { ecg: false, ecgCh1: false, ecgCh2: true, ecgCh3: true, ecgCh4: true, pace: true, respiration: true }
            setRecordStarted(true);
        }
        isProcessing.current = true;

        BleManager.startNotification(peripheralId, SERVICE_UUID, ECG_PATCH_UUID).catch((e) => console.log(e));
        BleManager.startNotification(peripheralId, SERVICE_UUID, ECG_HOLTER_UUID).catch((e) => console.log(e));

        console.log('notification started');

        if (recordDuration !== 'no limit') {
            recordTimeout.current = setTimeout(() => {
                console.log('timeout after', recordDuration * 1000)
                handleStopRecord();
            }, recordDuration * 1000)
        }
    }

    const handleStopRecord = () => {
        clearTimeout(recordTimeout.current);
        notificationSwitch.current = false;
        isProcessing.current = false;

        BleManager.stopNotification(peripheralId, SERVICE_UUID, ECG_PATCH_UUID).catch((e) => console.log(e));
        BleManager.stopNotification(peripheralId, SERVICE_UUID, ECG_HOLTER_UUID).catch((e) => console.log(e));

        console.log('notification stopped');

        setEcgHolterData(ecgHolterDataRef.current);
        setPaceHolterData(paceHolterRef.current);
        setFilteredPcgData(filteredPcgRef.current);
        setPcgData(pcgRawDataRef.current)
        setEcgPatchData(ecgPatchRef.current);
        setPacePatchData(pacePatchRef.current);

    }

    function getDateTimeStr(dataType: 'ecg' | 'pcg' | 'pace' | 'indication'): { x: string, time: string } {
        let nowTime = new Date();

        let timeDiffMs;
        if (dataType === 'ecg') {
            if (!timeEcg.current) {
                timeEcg.current = new Date();
            }
            timeDiffMs = nowTime.getTime() - timeEcg.current.getTime();
        }

        else if (dataType === 'pcg') {
            if (!timePcg.current) {
                timePcg.current = new Date();
            }
            timeDiffMs = nowTime.getTime() - timePcg.current.getTime();
        }
        else if (dataType == 'indication') {
            if (!timeIndicator.current) {
                timeIndicator.current = new Date();
            }
            timeDiffMs = nowTime.getTime() - timeIndicator.current.getTime();
        }
        else {
            return '';
        }

        let totalSeconds = Math.floor(timeDiffMs / 1000);
        let h = Math.floor(totalSeconds / 3600)
        let m = Math.floor((totalSeconds % 3600) / 60)
        let s = Math.floor(totalSeconds % 60)
        let ms = Math.floor((timeDiffMs % 1000) / 10);

        let time = String(h).padStart(2, '0') + ":" + String(m).padStart(2, '0') + ":" + String(s).padStart(2, '0') + ":" + String(ms).padStart(2, '0')

        return { x: `${String(totalSeconds).padStart(2, '0')}.${String(ms).padStart(2, '0')}`, time: time };

    }

    function parseEcgPatchData(hexVal: string) {
        if (!notificationSwitch.current) {
            return;
        }

        let Idata = 0, pacetag = 0;

        const newEcgData: DataChart[] = [];
        const newPaceData: DataChart[] = [];
        const newPcgData: DataChart[] = [];

        for (let i = 0; i < hexVal.length / 8; i++) {
            let ydata = parseInt(hexVal.substring(i * 8, i * 8 + 8), 16);
            // let xdata = new Date(nowTime + 2);
            // check the pace pulse data
            pacetag = ydata % 2;
            if (ydata > 8388608) {
                ydata = (16777215 - ydata) * (-1.1) * 0.0004786;
            } else {
                ydata = ydata * 1.1 * 0.0004786;
            }
            //if the data is ECG data
            if (i !== 16 && i !== 17 && i !== 34 && i !== 35 && i !== 52 && i !== 53) {
                ydata = ydata / 10;
                let xDataStr = getDateTimeStr('ecg');
                newEcgData.push({ x: xDataStr.x, time: xDataStr.time, y: ydata });
                newPaceData.push({ x: xDataStr.x, time: xDataStr.time, y: pacetag + 0.074 });
            }
            // if the data is pace data
            else if (i == 16 || i == 34 || i == 52) {
                Idata = ydata;
            }
            else if (i == 17 || i == 35 || i == 53) {

                let Qdata = ydata;
                let Respdata = Math.sqrt(Idata * Idata + Qdata * Qdata);

                if (baselineflag == 1) {
                    setBaseline(Respdata);
                    setBaselineflag(0);
                }
                let RespdataRemd = (Respdata - baseline);
                //console.log('', RespdataRemd)
                let xDataStr = getDateTimeStr('pcg');

                newPcgData.push({
                    x: xDataStr.x,
                    time: xDataStr.time,
                    y: RespdataRemd
                });
            }
        }

        const updatedEcg = [...ecgPatchRef.current, ...newEcgData];
        ecgPatchRef.current = updatedEcg.length > displayEcgDataAmount.current ? updatedEcg.slice(-displayEcgDataAmount.current) : updatedEcg;
        if (!collapsedSections.current.ecg) {
            setEcgPatchData(ecgPatchRef.current);
        }

        const updatedPace = [...pacePatchRef.current, ...newPaceData];
        pacePatchRef.current = updatedPace.length > displayEcgDataAmount.current ? updatedPace.slice(-displayEcgDataAmount.current) : updatedPace;
        if (!collapsedSections.current.pace) {
            setPacePatchData(pacePatchRef.current);
        }

        if (applyFilter.current) {
            updatePcgGraph(newPcgData);
        }
        else {
            const updatedPcg = [...pcgRawDataRef.current, ...newPcgData];
            pcgRawDataRef.current = updatedPcg.length > displayEcgDataAmount.current ? updatedPcg.slice(-displayEcgDataAmount.current) : updatedPcg;
            if (!collapsedSections.current.respiration) {
                setPcgData(pcgRawDataRef.current);
            }
        }
    }

    function parseEcgHolterData(hexVal: string) {
        if (!notificationSwitch.current) {
            return;
        }

        const indicatorByte = parseInt(hexVal.slice(-2), 16);
        console.log('Indicator:', indicatorByte)
        indicatorRef.current = indicatorByte;
        let label = Indicators.find(e => e.value === indicatorByte)?.title ?? 'Unknown Indicator'
        let date = getDateTimeStr('indication')
        indicatorDataRef.current = [...indicatorDataRef.current, { time: date.x, formattedTime: date.time, value: label }]

        hexVal = hexVal.slice(0, -2);

        const newEcg1Data: DataChart[] = [];
        const newEcg2Data: DataChart[] = [];
        const newEcg3Data: DataChart[] = [];
        const newEcg4Data: DataChart[] = [];
        const newPaceData: { amp: DataChart[], width: DataChart[], pol: DataChart[] } = { amp: [], width: [], pol: [] };
        const newPcgData: DataChart[] = [];

        let xdataStr = getDateTimeStr('ecg');

        for (let i = 0; i < hexVal.length / 8; i++) {
            let ydata = parseInt(hexVal.substring(i * 8, i * 8 + 8), 16);
            if (i % 6 !== 4) {
                if (ydata > 8388608) {
                    ydata = (16777215 - ydata) * 0.000000313;
                }
                else {
                    ydata = ydata * (-0.000000313);
                }
                if (i % 6 == 0) {
                    newEcg1Data.push({ x: xdataStr.x, time: xdataStr.time, y: ydata * 1000 });
                }
                else if (i % 6 == 1) {
                    newEcg2Data.push({ x: xdataStr.x, time: xdataStr.time, y: ydata * 1000 });
                }
                else if (i % 6 == 2) {
                    newEcg3Data.push({ x: xdataStr.x, time: xdataStr.time, y: ydata * 1000 });
                }
                else if (i % 6 == 3) {
                    newEcg4Data.push({ x: xdataStr.x, time: xdataStr.time, y: ydata * 1000 });
                }
                else if (i % 6 == 5) {
                    // if (ydata > 0.08) {
                    newPcgData.push({ x: xdataStr.x, time: xdataStr.time, y: ydata * 1000 });
                    // }
                }
            }
            else if (i % 6 == 4) {
                let paceAmp = parseInt(hexVal.substring(i * 8 + 4, i * 8 + 8), 16);
                paceAmp = paceAmp * 0.021536;
                let pacePol;
                let paceWidth = parseInt(hexVal.substring(i * 8 + 2, i * 8 + 4), 16);
                if (paceWidth < 128) {
                    paceWidth = paceWidth * 28.73;
                    pacePol = 0;
                }
                else {
                    paceWidth = (paceWidth - 128) * 28.73;
                    pacePol = 1;
                }
                newPaceData.amp.push({ x: xdataStr.x, time: xdataStr.time, y: paceAmp });
                newPaceData.pol.push({ x: xdataStr.x, time: xdataStr.time, y: pacePol });
                newPaceData.width.push({ x: xdataStr.x, time: xdataStr.time, y: paceWidth });
            }
        }

        const updatedData1 = [...ecgHolterDataRef.current.channel1, ...newEcg1Data];
        const updatedData2 = [...ecgHolterDataRef.current.channel2, ...newEcg2Data];
        const updatedData3 = [...ecgHolterDataRef.current.channel3, ...newEcg3Data];
        const updatedData4 = [...ecgHolterDataRef.current.channel4, ...newEcg4Data];
        const updatedEcgData = {
            channel1: updatedData1,
            channel2: updatedData2,
            channel3: updatedData3,
            channel4: updatedData4,
        }

        if (updatedEcgData.channel1.length > displayEcgDataAmount.current) {
            ecgHolterDataRef.current = {
                channel1: updatedEcgData.channel1.slice(-displayEcgDataAmount.current),
                channel2: updatedEcgData.channel2.slice(-displayEcgDataAmount.current),
                channel3: updatedEcgData.channel3.slice(-displayEcgDataAmount.current),
                channel4: updatedEcgData.channel4.slice(-displayEcgDataAmount.current),
            }
        }
        else {
            ecgHolterDataRef.current = updatedEcgData;
        }
        if (!collapsedSections.current.ecgCh1 || !collapsedSections.current.ecgCh2 || !collapsedSections.current.ecgCh3 || !collapsedSections.current.ecgCh4) {
            setEcgHolterData(ecgHolterDataRef.current);
        }

        const updatedAmp = [...paceHolterRef.current.amp, ...newPaceData.amp];
        const updatedPol = [...paceHolterRef.current.pol, ...newPaceData.pol];
        const updatedWidth = [...paceHolterRef.current.width, ...newPaceData.width];
        const updatedDataPace = { amp: updatedAmp, pol: updatedPol, width: updatedWidth };

        if (updatedDataPace.amp.length > displayEcgDataAmount.current) {
            paceHolterRef.current = {
                amp: updatedDataPace.amp.slice(-displayEcgDataAmount.current),
                pol: updatedDataPace.pol.slice(-displayEcgDataAmount.current),
                width: updatedDataPace.width.slice(-displayEcgDataAmount.current)
            }
        }
        else {
            paceHolterRef.current = updatedDataPace;
        }

        let newLen = newPaceData.amp.length
        let lastAmp = newPaceData.amp[newLen - 1].y
        let lastPol = newPaceData.pol[newLen - 1].y
        let lastWidth = newPaceData.width[newLen - 1].y

        if ((lastAmp != 0 && lastWidth != 0) || !lastPaceHolterData.current) {
            lastPaceHolterData.current = { amp: lastAmp, pol: lastPol, width: lastWidth }
        }

        if (!collapsedSections.current.pace || expandedGraph === SectionsIDs.pace) {
            setPaceHolterData(paceHolterRef.current);
        }

        if (applyFilter.current) {
            updatePcgGraph(newPcgData);
        }
        else {
            const updatedDataPcg = [...pcgRawDataRef.current, ...newPcgData];
            if (updatedDataPcg.length > displayEcgDataAmount.current) {
                pcgRawDataRef.current = updatedDataPcg.slice(-displayEcgDataAmount.current)
            }
            else {
                pcgRawDataRef.current = updatedDataPcg;
            }
            if (!collapsedSections.current.respiration) {
                setPcgData(pcgRawDataRef.current);
            }

        }

    }

    const updatePcgGraph = (newPcgData: DataChart[]) => {

        const updatedDataPcg = [...pcgRawDataRef.current, ...newPcgData];
        let updatedDataPcgTemp = pcgRawDataRef.current
        pcgRawDataRef.current = updatedDataPcg;
        let updatedFiltered = filteredPcgRef.current
        // Add new sample to the rawData array
        for (let i = 0; i < newPcgData.length; i++) {

            let newPoint = newPcgData[i]
            updatedDataPcgTemp = [...updatedDataPcgTemp, newPoint];

            // check if the length is a multiple of MedianEvery
            if (updatedDataPcgTemp.length % medianEvery.current == 0) {

                // apply median on the last MedianOn samples
                let median_samples = updatedDataPcgTemp.slice(-medianOn.current);
                // Add median to the filtered array
                let median_result = median(median_samples);
                updatedFiltered = [...updatedFiltered, median_result]
            }
        }
        filteredPcgRef.current = updatedFiltered.length > displayEcgDataAmount.current ? updatedFiltered.slice(-displayEcgDataAmount.current) : updatedFiltered;
        if (!collapsedSections.current.respiration || expandedGraph === SectionsIDs.respiration) {
            setFilteredPcgData(filteredPcgRef.current);
        }

    }

    const handleNotifications = ({ value, characteristic }: any) => {
        if (characteristic.toLowerCase().includes(ECG_PATCH_UUID.toLowerCase()) && value) {
            if (!notificationSwitch.current) {
                return;
            }
            const notificationData = new Uint8Array(value);
            if (notificationData.length == 216) {
                const hexString = Array.from(notificationData)
                    .map(byte => byte.toString(16).padStart(2, '0'))
                    .join('');

                parseEcgPatchData(hexString);
            }
        }
        else if (characteristic.toLowerCase().includes(ECG_HOLTER_UUID.toLowerCase()) && value) {
            if (!notificationSwitch.current) {
                return;
            }
            const notificationData = new Uint8Array(value);
            if (notificationData.length == 217) {
                const hexString = Array.from(notificationData)
                    .map(byte => byte.toString(16).padStart(2, '0'))
                    .join('');
                parseEcgHolterData(hexString);
            }
        }
    };

    function toggleCollapse(sectionId: number) {
        let current = collapsedSections.current;
        let updated = current;

        switch (sectionId) {
            case (SectionsIDs.ecg):
                updated = { ...collapsedSections.current, ecg: !current.ecg };
                break;
            case (SectionsIDs.ecgCh1):
                updated = { ...collapsedSections.current, ecgCh1: !current.ecgCh1 };
                if (!updated.ecgCh1) {
                    setEcgHolterData(ecgHolterDataRef.current);
                    updated = { ...updated, ecgCh2: true, ecgCh3: true, ecgCh4: true }
                }
                break;
            case (SectionsIDs.ecgCh2):
                updated = { ...collapsedSections.current, ecgCh2: !current.ecgCh2 };
                if (!updated.ecgCh2) {
                    setEcgHolterData(ecgHolterDataRef.current);
                    updated = { ...updated, ecgCh1: true, ecgCh3: true, ecgCh4: true }
                }
                break;
            case (SectionsIDs.ecgCh3):
                updated = { ...collapsedSections.current, ecgCh3: !current.ecgCh3 };
                if (!updated.ecgCh3) {
                    setEcgHolterData(ecgHolterDataRef.current);
                    updated = { ...updated, ecgCh2: true, ecgCh1: true, ecgCh4: true }
                }
                break;
            case (SectionsIDs.ecgCh4):
                updated = { ...collapsedSections.current, ecgCh4: !current.ecgCh4 };
                if (!updated.ecgCh4) {
                    setEcgHolterData(ecgHolterDataRef.current);
                    updated = { ...updated, ecgCh2: true, ecgCh3: true, ecgCh1: true }
                }
                break;
            case (SectionsIDs.pace):
                updated = { ...collapsedSections.current, pace: !current.pace };
                if (!updated.pace) {
                    setPaceHolterData(paceHolterRef.current);
                    setPacePatchData(pacePatchRef.current);
                }
                break;
            case (SectionsIDs.respiration):
                updated = { ...collapsedSections.current, respiration: !current.respiration };
                if (!updated.respiration) {
                    setFilteredPcgData(filteredPcgRef.current);
                    setPcgData(pcgRawDataRef.current);
                }
                break;
        }
        collapsedSections.current = updated
        setCollapsedSectionsState(updated)
    };

    function getChartData(data: DataChart[]) {
        const formattedData = data.map((data, index) => ({
            x: index,
            y: data.y,
        }));
        return {
            dataSets: [{
                values: formattedData,
                config: {
                    color: processColor(Colors.blue),
                    drawCircles: false,
                    lineWidth: 1,
                    drawValues: false
                }
            }],
        }
    };

    function getLabelsXAxis(data: DataChart[]) {
        return {
            position: 'BOTTOM',
            valueFormatter: data.map(item => item.x),
            granularityEnabled: false,
            granularity: 1,
            drawLabels: true,
        }
    };

    const chartConfig = {
        yAxis: {
            left: {
                drawGridLines: true,
                drawLabels: true,
            },
            right: {
                enabled: false,
            },
        },
        legend: {
            enabled: false,
        },
        config: {
            touchEnabled: true,
            dragEnabled: true,
            scaleEnabled: true,
            doubleTapToZoomEnabled: true
        },
        markerConfig: {
            enabled: true,
            markerColor: processColor(Colors.lightGray),
            textColor: processColor('black'),
            digits: 3,
        }
    };

    const Chart = (data: DataChart[], yAxisConfig: any, units = 'mV') => {
        return (
            <View style={[styles.chartWrapper]}>
                <View style={styles.chartHeader}>
                    <Text style={{ fontSize: 12 / fontScale, fontWeight: 'bold' }}>{units}</Text>
                    <View style={{ flex: 1 }} />
                </View>
                <View style={[{ width: '100%' }, expandedGraph !== null && styles.landscapeChartContainer]}>
                    <LineChart
                        style={styles.chart}
                        data={getChartData(data)}
                        chartDescription={{ text: '' }}
                        xAxis={getLabelsXAxis(data)}
                        yAxis={yAxisConfig}
                        legend={chartConfig.legend}
                        marker={chartConfig.markerConfig}
                        {...chartConfig.config}
                        scaleXEnabled={true}
                        scaleYEnabled={false}
                    />
                    <Text style={{ alignSelf: 'center', fontSize: 12 / fontScale, fontWeight: 'bold' }}>Time</Text>
                </View>
            </View >
        )
    };

    const handleCollapse = () => {
        setExpandedGraph(null);
    };

    const handleExpand = (sectionId: number) => {
        setExpandedGraph(sectionId);
    };

    const ExpandedChart = () => {
        let title;
        let chartParameters = {
            xAxisLabel: 'Time', yAxisLabel: 'mV', lineDescription: '', data: [], yAxisConfig: chartConfig.yAxis
        }
        if (expandedGraph === SectionsIDs.ecg) {
            chartParameters.lineDescription = 'ECG Data';
            chartParameters.data = ecgPatchRef.current;
            title = 'ECG Graph';
        }
        else if (expandedGraph === SectionsIDs.ecgCh1) {
            chartParameters.lineDescription = 'ECG Channel 1 Data';
            chartParameters.data = ecgHolterDataRef.current.channel1;
            title = 'ECG Channel 1 Graph';
        }
        else if (expandedGraph === SectionsIDs.ecgCh2) {
            chartParameters.lineDescription = 'ECG Channel 2 Data';
            chartParameters.data = ecgHolterDataRef.current.channel2;
            title = 'ECG Channel 2 Graph';
        }
        else if (expandedGraph === SectionsIDs.ecgCh3) {
            chartParameters.lineDescription = 'ECG Channel 3 Data';
            chartParameters.data = ecgHolterDataRef.current.channel3;
            title = 'ECG Channel 3 Graph';
        }
        else if (expandedGraph === SectionsIDs.ecgCh4) {
            chartParameters.lineDescription = 'ECG Channel 4 Data';
            chartParameters.data = ecgHolterDataRef.current.channel4;
            title = 'ECG Channel 4 Graph';
        }
        else if (expandedGraph === SectionsIDs.pace) {
            chartParameters.yAxisLabel = '';
            chartParameters.lineDescription = 'Pace Data';
            chartParameters.data = pacePatchRef.current.length > 0 ? pacePatchRef.current : paceHolterRef.current.amp;
            title = pacePatchRef.current.length > 0 ? 'Patch Pace Graph' : 'Holter Pace Graph';

        }
        else if (expandedGraph === SectionsIDs.respiration) {
            chartParameters.lineDescription = 'Respiration';

            if (applyFilter.current) {
                chartParameters.data = filteredPcgRef.current
            }
            else {
                chartParameters.data = pcgData
            }

            chartParameters.yAxisConfig = chartConfig.yAxis
            title = pcgRawDataRef.current.length > 0 ? 'Patch Respiration' : 'Holter Respiration';
        }
        else {
            return;
        }
        return (
            <View style={styles.lanscapeContainer}>
                <View style={styles.landscapeChartWrapper}>
                    <View style={[{ flexDirection: 'row', height: '10%', alignItems: 'flex-start' }]}>
                        <TouchableOpacity onPress={handleCollapse} style={{ alignSelf: 'flex-start', paddingRight: 15, }}>
                            <Icon name={'compress-arrows-alt'} type='font-awesome-5' size={23} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { fontSize: 18 }]}>{title}</Text>
                    </View>
                    <View style={{ height: '90%', }}>
                        {Chart(chartParameters.data, chartParameters.yAxisConfig,)}
                    </View >
                </View >
            </View>
        )
    }

    const downloadData = () => {
        const convertToCSV = (objArray) => {
            const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
            let str = '';

            for (let i = 0; i < array.length; i++) {
                let line = '';
                for (let index in array[i]) {
                    if (line !== '') line += ',';
                    line += array[i][index];
                }
                str += line + '\r\n';
            }
            return str.trim().split('\r\n');  // Split into lines for easier manipulation
        };

        if (ecgPatchRef.current.length > 0) {
            const mergedEcgPace = ecgPatchRef.current.map((data, index) => {
                return {
                    x: data.x,
                    time: data.time,
                    ecg: data.y,
                    pace: pacePatchRef.current[index].y,
                };
            });

            let csvEcgPaceArray = convertToCSV(mergedEcgPace);
            let csvRespirationArray = convertToCSV(pcgRawDataRef.current);

            // Ensure both arrays have the same length by filling the shorter one with empty values
            const maxLength = Math.max(csvEcgPaceArray.length, csvRespirationArray.length);
            while (csvEcgPaceArray.length < maxLength) {
                csvEcgPaceArray.push(",,,,,,,,"); // 8 empty cells for ECG/Pace table
            }
            while (csvRespirationArray.length < maxLength) {
                csvRespirationArray.push(",,,"); // 3 empty cells for Respiration table
            }

            // Add a margin (empty columns) between the tables
            let margin = ",,,"; // Adjust the number of commas to create the desired margin

            // Merge both arrays side by side with margin
            let csvCombined = 'Time,Formatted Time,Patch ECG,Patch Pace' + margin + 'Time,Formatted Time,Respiration\r\n';
            for (let i = 0; i < maxLength; i++) {
                csvCombined += csvEcgPaceArray[i] + margin + csvRespirationArray[i] + '\r\n';
            }

            if (applyFilter.current) {
                let sortedFilteredPcg = filteredPcgRef.current.sort((a, b) => parseFloat(a.x) - parseFloat(b.x));

                let csvRespirationFilteredArray = convertToCSV(sortedFilteredPcg);

                // Ensure the filtered respiration array also has the same length
                while (csvRespirationFilteredArray.length < maxLength) {
                    csvRespirationFilteredArray.push(",,,"); // 3 empty cells for filtered respiration
                }

                csvCombined = 'Time,Formatted Time,Patch ECG,Patch Pace' + margin + 'Time,Formatted Time,Respiration' + margin + 'Time,Formatted Time,Filtered Respiration\r\n';
                for (let i = 0; i < maxLength; i++) {
                    csvCombined += csvEcgPaceArray[i] + margin + csvRespirationArray[i] + margin + csvRespirationFilteredArray[i] + '\r\n';
                }
            }

            downloadDataToLocalStorage(csvCombined, 'ECG.csv', 'text/csv');
        }
        else if (ecgHolterDataRef.current.channel1.length > 0) {
            console.log(indicatorDataRef.current.length, ecgHolterDataRef.current.channel1.length)
            const mergedEcgPaceHolter = ecgHolterDataRef.current.channel1.map((data, index) => {
                return {
                    x: data.x,
                    time: data.time,
                    paceAmp: paceHolterRef.current.amp[index].y,
                    paceWidth: paceHolterRef.current.width[index].y,
                    pacePol: paceHolterRef.current.pol[index].y,
                    ecg1: data.y,
                    ecg2: ecgHolterDataRef.current.channel2[index].y,
                    ecg3: ecgHolterDataRef.current.channel3[index].y,
                    ecg4: ecgHolterDataRef.current.channel4[index].y,
                };
            });

            let csvEcgPaceArray = convertToCSV(mergedEcgPaceHolter);
            let csvRespirationArray = convertToCSV(pcgRawDataRef.current);
            let csvIndicationArray = convertToCSV(indicatorDataRef.current);

            // Ensure both arrays have the same length by filling the shorter one with empty values
            const maxLength = Math.max(csvEcgPaceArray.length, csvRespirationArray.length, csvIndicationArray.length);
            while (csvEcgPaceArray.length < maxLength) {
                csvEcgPaceArray.push(",,,,,,,,"); // Eight empty cells for ECG table
            }
            while (csvRespirationArray.length < maxLength) {
                csvRespirationArray.push(",,,"); // Three empty cells for Respiration table
            }
            while (csvIndicationArray.length < maxLength) {
                csvIndicationArray.push(",,,"); // Three empty cells for Indication table
            }

            // Add a margin (empty columns) between the tables
            let margin = ",,,"; // Adjust the number of commas to create the desired margin
            // Merge both arrays side by side with margin
            let csvCombined = 'Time,Formatted Time,Pace Amplitude,Pace Width,Pace Polarity,ECG1,ECG2,ECG3,ECG4' + margin + 'Time,Formatted Time,Holter Respiration' + margin + 'Time,Formatted Time,Indicator\r\n';
            for (let i = 0; i < maxLength; i++) {
                csvCombined += csvEcgPaceArray[i] + margin + csvRespirationArray[i] + margin + csvIndicationArray[i] + '\r\n';
            }
            if (applyFilter.current) {
                let sortedFilteredPcg = filteredPcgRef.current.sort((a, b) => parseFloat(a.x) - parseFloat(b.x));
                let csvRespirationFilteredArray = convertToCSV(sortedFilteredPcg);

                // Ensure the filtered respiration array also has the same length
                while (csvRespirationFilteredArray.length < maxLength) {
                    csvRespirationFilteredArray.push(",,");
                }

                csvCombined = 'Time,Formatted Time,Pace Amplitude,Pace Width,Pace Polarity,ECG1,ECG2,ECG3,ECG4' + margin + 'Time,Formatted Time,Holter Respiration' + margin + 'Time,Formatted Time,Filtered Respiration' + margin + 'Time,Formatted Time,Indicator\r\n';
                for (let i = 0; i < maxLength; i++) {
                    csvCombined += csvEcgPaceArray[i] + margin + csvRespirationArray[i] + margin + csvRespirationFilteredArray[i] + margin + csvIndicationArray[i] + '\r\n';
                }
            }

            downloadDataToLocalStorage(csvCombined, 'ECG.csv', 'text/csv');
        }
    };

    const ChartSection = (title: string, data: DataChart[], collapsed: boolean, sectionID: number, chartConfig: { left: { axisMaximum?: number, axisMinimum?: number, drawGridLines: boolean; drawLabels: boolean; }; right: { enabled: boolean; }; }) => {
        return (

            <View style={styles.chartContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignContent: 'center', flex: 1 }}>
                    <TouchableOpacity onPress={() => handleExpand(sectionID)} style={{ alignSelf: 'center', paddingRight: 15, }}>
                        <Icon name={'expand-arrows-alt'} type='font-awesome-5' size={18} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.subject} onPress={() => toggleCollapse(sectionID)}>
                        <Text style={[styles.title]}>{title}</Text>
                        <Icon style={{ alignSelf: 'center' }} name={collapsed ? 'chevron-down' : 'chevron-up'} type='font-awesome-5' size={18} />
                    </TouchableOpacity>
                </View>
                {!collapsed && Chart(data, chartConfig)}
            </View>
        );
    }

    const HolterPaceChartSection = (title: string, data: { amp: DataChart[], width: DataChart[], pol: DataChart[] }, collapsed: boolean, sectionID: number, chartConfig: { left: { axisMaximum?: number, axisMinimum?: number, drawGridLines: boolean; drawLabels: boolean; }; right: { enabled: boolean; }; }) => {
        return (

            <View style={styles.chartContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignContent: 'center', flex: 1 }}>
                    <TouchableOpacity onPress={() => handleExpand(sectionID)} style={{ alignSelf: 'center', paddingRight: 15, }}>
                        <Icon name={'expand-arrows-alt'} type='font-awesome-5' size={18} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.subject} onPress={() => toggleCollapse(sectionID)}>
                        <Text style={[styles.title]}>{title}</Text>
                        <Icon style={{ alignSelf: 'center' }} name={collapsed ? 'chevron-down' : 'chevron-up'} type='font-awesome-5' size={18} />
                    </TouchableOpacity>
                </View>
                {!collapsed && (
                    <>
                        {Chart(data.amp, chartConfig, 'Amplitude(mV)')}
                        {Chart(data.width, chartConfig, 'Width(us)')}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1, paddingVertical: 10 }}>
                            <View style={{ flex: 1, alignItems: 'flex-start' }}>
                                <Text>Amp: {lastPaceHolterData.current?.amp.toFixed(2)}</Text>
                            </View>
                            <View style={{ flex: 1, alignItems: 'flex-start' }}>
                                <Text>Width: {lastPaceHolterData.current?.width.toFixed(2)}</Text>
                            </View>
                            <View style={{ flex: 1, alignItems: 'flex-start' }}>
                                <Text>Polarity: {lastPaceHolterData.current?.pol.toFixed(2)}</Text>
                            </View>
                        </View>
                    </>
                )}
            </View>
        );
    }

    const renderChartSections = useMemo(() => {
        return (
            <>
                {recordStarted && ecgPatchRef.current.length > 0 && (
                    <>
                        {ChartSection('Patch Pace Graph', pacePatchData, collapsedSectionsState.pace, SectionsIDs.pace, {
                            left: {
                                axisMaximum: 1, axisMinimum: 0, drawGridLines: true, drawLabels: true
                            },
                            right: {
                                enabled: false,
                            },
                        })}
                        {ChartSection('ECG Graph', ecgPatchData, collapsedSectionsState.ecg, SectionsIDs.ecg, chartConfig.yAxis)}
                        {ChartSection('Patch Respiration Graph', applyFilter.current ? filteredPcgData : pcgData, collapsedSectionsState.respiration, SectionsIDs.respiration, chartConfig.yAxis)}
                    </>
                )}
                {recordStarted && ecgHolterDataRef.current.channel1.length > 0 && (
                    <>
                        {HolterPaceChartSection('Holter Pace Graph', paceHolterData, collapsedSectionsState.pace, SectionsIDs.pace, chartConfig.yAxis)}
                        {ChartSection('ECG Channel 1 Graph', ecgHolterData.channel1, collapsedSectionsState.ecgCh1, SectionsIDs.ecgCh1, chartConfig.yAxis)}
                        {ChartSection('ECG Channel 2 Graph', ecgHolterData.channel2, collapsedSectionsState.ecgCh2, SectionsIDs.ecgCh2, chartConfig.yAxis)}
                        {ChartSection('ECG Channel 3 Graph', ecgHolterData.channel3, collapsedSectionsState.ecgCh3, SectionsIDs.ecgCh3, chartConfig.yAxis)}
                        {ChartSection('ECG Channel 4 Graph', ecgHolterData.channel4, collapsedSectionsState.ecgCh4, SectionsIDs.ecgCh4, chartConfig.yAxis)}
                        {ChartSection('Holter Respiration Graph', applyFilter.current ? filteredPcgData : pcgData, collapsedSectionsState.respiration, SectionsIDs.respiration, chartConfig.yAxis)}
                    </>
                )}
            </>
        );
    }, [lastPaceHolterData?.current, recordStarted, ecgPatchData, ecgHolterDataRef, pcgData, pcgRawDataRef.current, paceHolterRef.current.amp, pcgRawDataRef.current, pacePatchRef.current, ecgHolterData, pacePatchData, paceHolterData, filteredPcgData, filteredPcgRef.current, collapsedSectionsState, SectionsIDs, chartConfig.yAxis]);

    const LEDCircle = (isTooltipVisible: boolean, setTooltipVisible: any, indicator: { text: string, title: string, value: number }) => {
        return (
            <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <View style={[styles.led, indicatorRef.current === indicator.value ? styles.ledOn : styles.ledOff]} />
                <View style={{ marginTop: 10, display: 'flex', flexDirection: 'row' }}>
                    {toolTip(isTooltipVisible, setTooltipVisible, indicator)}
                    <Text style={{ fontSize: 12 / fontScale, fontWeight: '500' }}>{indicator.title}</Text>
                </View>
            </View >
        );
    };

    const renderLabelSection = useMemo(() => {
        return (
            <>
                {recordStarted && ecgHolterDataRef.current.channel1.length > 0 && (
                    <View style={styles.chartContainer}>
                        <View style={{ padding: 10, display: 'flex' }}>
                            <Text style={{ fontSize: 16 / fontScale, fontWeight: '500', alignSelf: 'center' }}>Arrhythmia Classification</Text>
                            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 }}>
                                {LEDCircle(labelsTooltip.normal, (isVisible: boolean) => { setLabelsTooltip({ normal: isVisible, mild: false, severe: false, emergency: false }) }, NormalIndicator)}
                                {LEDCircle(labelsTooltip.mild, (isVisible: boolean) => { setLabelsTooltip({ mild: isVisible, normal: false, severe: false, emergency: false }) }, MildIndicator)}
                                {LEDCircle(labelsTooltip.severe, (isVisible: boolean) => { setLabelsTooltip({ severe: isVisible, mild: false, normal: false, emergency: false }) }, SevereIndicator)}
                                {LEDCircle(labelsTooltip.emergency, (isVisible: boolean) => { setLabelsTooltip({ emergency: isVisible, mild: false, severe: false, normal: false }) }, EmergencyIndicator)}
                            </View>
                        </View >
                    </View>
                )}
            </>
        );
    }, [indicatorRef.current, recordStarted, ecgHolterDataRef.current.channel1, labelsTooltip]);

    function toolTip(visible: boolean, setVisible: any, toolTip: { text: string, title: string, value: number }) {
        return (<Tooltip
            isVisible={visible}
            content={
                <View style={{ padding: 3 }}>
                    <Text style={[styles.tooltipTitle]}>{toolTip.title}</Text>
                    <Text style={[styles.tooltipText]}>{toolTip.text}</Text>
                </View>
            }
            // placement="bottom"
            onClose={() => setVisible(false)}
            showChildInTooltip={false}
            topAdjustment={Platform.OS === 'android' ? -StatusBar.currentHeight : 0}
            arrowSize={{ height: 0, width: 0 }}
            displayInsets={{ top: 40, bottom: 40, left: 24, right: 24 }}
            contentStyle={{ borderRadius: 8, height: '100%', width: '100%' }}
        >
            <TouchableOpacity onPress={() => setVisible(true)}>
                <Icon style={{ alignSelf: 'center' }} name='help-outline' type="MaterialIcons" size={16} />
            </TouchableOpacity >
        </Tooltip>)

    }

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

            <ScrollView style={[styles.container]} contentContainerStyle={styles.scrollContentContainer}>
                {expandedGraph === null ? (
                    <>
                        <View style={[styles.buttonContainer, { marginVertical: 15 }]}>

                            <View style={[styles.buttonWrapper]}>
                                <TouchableOpacity
                                    style={[styles.button, styles.shadow, { opacity: notificationSwitch.current ? 0.2 : 1 }]}
                                    onPress={handleStartRecord}
                                    disabled={notificationSwitch.current}
                                >
                                    <Icon name="play" size={20} color="#fff" type='font-awesome-5' />
                                </TouchableOpacity>
                                <Text style={[styles.buttonText, { opacity: notificationSwitch.current ? 0.2 : 1 }]}>Start Record</Text>
                            </View>

                            <View style={[styles.buttonWrapper,]}>
                                <TouchableOpacity
                                    style={[styles.button, styles.shadow, { opacity: !notificationSwitch.current ? 0.2 : 1 }]}
                                    onPress={handleStopRecord}
                                    disabled={!notificationSwitch.current}
                                >
                                    <Icon name="stop" size={20} color="#fff" type='font-awesome-5' />
                                </TouchableOpacity>
                                <Text style={[styles.buttonText, { opacity: !notificationSwitch.current ? 0.2 : 1 }]}>Stop Record</Text>
                            </View>
                        </View>
                        {(!recordStarted || (ecgPatchRef.current.length == 0 && ecgHolterDataRef.current.channel1.length == 0)) && (
                            <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
                                <Text style={{ textAlign: 'center' }}>No data available. Click 'Start' to begin recording.</Text>
                            </View>
                        )}
                        {!isProcessing.current && (ecgPatchRef.current.length > 0 || ecgHolterDataRef.current.channel1.length > 0) && (
                            <TouchableOpacity onPress={downloadData} style={[styles.exportButton]}>
                                <Text style={[styles.textButton]}>Export Data</Text>
                            </TouchableOpacity>
                        )}
                        {ecgHolterDataRef.current.channel1.length > 0 && renderLabelSection}
                        {renderChartSections}
                    </>
                ) :
                    (
                        <>
                            <View style={[styles.buttonContainer, { marginVertical: 5 }]}>
                                <View style={[styles.buttonWrapper, styles.buttonWrapperLandscape]}>
                                    <TouchableOpacity
                                        style={[styles.button, styles.shadow, styles.buttonLandscape, { opacity: !notificationSwitch.current ? 0.2 : 1 }]}
                                        onPress={handleStopRecord}
                                        disabled={!notificationSwitch.current}
                                    >
                                        <Icon name="stop" size={18} color="#fff" type='font-awesome-5' />
                                    </TouchableOpacity>
                                    <Text style={[styles.buttonText, { opacity: !notificationSwitch.current ? 0.2 : 1 }]}>Stop </Text>
                                </View>
                                <View style={[styles.buttonWrapper, styles.buttonWrapperLandscape]}>
                                    <TouchableOpacity
                                        style={[styles.button, styles.shadow, styles.buttonLandscape, { opacity: notificationSwitch.current ? 0.2 : 1 }]}
                                        onPress={handleStartRecord}
                                        disabled={notificationSwitch.current}
                                    >
                                        <Icon name="play" size={18} color="#fff" type='font-awesome-5' />
                                    </TouchableOpacity>
                                    <Text style={[styles.buttonText, { opacity: notificationSwitch.current ? 0.2 : 1 }]}>Start </Text>
                                </View>
                            </View>
                            {ExpandedChart()}
                        </>
                    )}
            </ScrollView>
        </KeyboardAvoidingView >
    );
};

const styles = StyleSheet.create({
    tooltipTitle: {
        fontWeight: 'bold',
        fontSize: 18,
        textDecorationLine: 'underline',
        flexWrap: 'wrap'
    },
    tooltipText: {
        fontSize: 14,
        flexWrap: 'wrap'
    },
    led: {
        width: 45,
        height: 45,
        borderRadius: 50,
    },
    ledOn: {
        backgroundColor: Colors.primary,
        shadowColor: 'rgba(255, 0, 0, 1)', // Glow color
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 10, // Shadow effect on Android
    },
    ledOff: {
        backgroundColor: Colors.lightGray, // Dimmed red or gray color to simulate off state
        shadowColor: 'rgba(0, 0, 0, 0.7)', // Subtle shadow for a "dead" appearance
        shadowOffset: { width: -2, height: -2 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        elevation: 5,
    },
    subject: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 50,
        flex: 1
    },
    container: {
        flex: 1,
        backgroundColor: Colors.lightGray,
        alignContent: 'center',
    },
    scrollContentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexGrow: 1,
    },
    chartContainer: {
        borderRadius: 10,
        marginBottom: 18,
        paddingHorizontal: 10,
        backgroundColor: 'white',
        flexDirection: 'column'
    },
    title: {
        fontSize: 16,
        fontWeight: "500",
        marginRight: 8,
        flex: 1,
    },
    chart: {
        width: '100%',
        flex: 1,
        height: 200,
        marginBottom: 5
    },
    item: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        height: 50,
    },
    chartWrapper: {
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
        paddingBottom: 10,
        height: '100%',
    },
    chartHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 20,
    },
    landscapeChartWrapper: {
        transform: [{ rotate: '90deg' }],
        alignSelf: 'center',
        justifyContent: 'flex-start',
        width: 600,
        padding: 5,
        height: 310,
    },
    landscapeChartContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    lanscapeContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        // flex: 1,
        justifyContent: 'center',
        height: 610,
        maxWidth: 350
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
    },
    button: {
        backgroundColor: Colors.gray,
        borderRadius: 60,
        width: 65,
        height: 65,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonLandscape: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    buttonText: {
        marginTop: 5,
        fontSize: 16,
        fontWeight: '700'
    },
    buttonWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 10,
    },
    buttonWrapperLandscape: {
        transform: [{ rotate: '90deg' }],
        marginHorizontal: 0,
    },
    exportButton: {
        width: '100%',
        height: 30,
        alignItems: 'center',
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    textButton: {
        color: Colors.blue,
        fontSize: 16,
    }
});

export default ECG;
