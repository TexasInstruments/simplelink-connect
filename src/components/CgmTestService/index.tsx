import { InteractionManager, KeyboardAvoidingView, NativeEventEmitter, Platform, StatusBar, Switch, TouchableOpacity, View } from 'react-native';
import { Text } from '../Themed';
import { StyleSheet, NativeModules, Dimensions } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import Colors from '../../constants/Colors';
import { useCallback, useEffect, useRef, useState } from 'react';
import BleManager from 'react-native-ble-manager';
import { Divider } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { chartConfig } from '../../constants/Charts';
import { useFocusEffect } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';
import { downloadDataToLocalStorage } from '../../services/DownloadFileUtils';
import { useSpecificScreenConfigContext } from '../../context/SpecificScreenOptionsContext';
import DocumentPicker from 'react-native-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Tooltip from 'react-native-walkthrough-tooltip';
import { Icon } from '@rneui/base';
import { Modal } from 'react-native';
import RNFS from 'react-native-fs';
import IdleTimerManager from 'react-native-idle-timer';

interface Props {
    peripheralId: string;
}

interface TemperatureData {
    temperatureMeasurement: number,
    units: string,
    timestamp: string,
    date: string,
    time: string,
    location: string
}

interface ChData {
    cgmMeasurement: number,
    timestamp: string,
}

const CgmTestService: React.FC<Props> = ({ peripheralId }) => {

    const SERVICE_UUID = '1100';
    const CHAR_UUID = '1101';
    const { specificScreenConfig, updateConfigurations } = useSpecificScreenConfigContext();

    const [indicationsSwitch, setIndicationsSwitch] = useState<boolean>(false);
    const [temperature, setTemperature] = useState<{ temp: number, unit: string } | null>(null);
    const [ch1current, setCh1current] = useState<number | null>(null);
    const [ch2current, setCh2current] = useState<number | null>(null);
    const [time, setTime] = useState<string | null>(null);
    const [temperatureType, setTemperatureType] = useState<string | null>(null);
    const [temperatureDataSet, setTemperatureDataSet] = useState<TemperatureData[]>([]);
    const [ch1DataSet, setCh1DataSet] = useState<ChData[]>([]);
    const [ch2DataSet, setCh2DataSet] = useState<ChData[]>([]);
    const [allCh1DataSet, setAllCh1DataSet] = useState<ChData[]>([]);
    const [allTemperatureDataSet, setAllTemperatureDataSet] = useState<TemperatureData[]>([]);

    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
    const [selectedInterval, setSelectedInterval] = useState('5');
    const [sectionsTooltip, setSectionsTooltip] = useState({ interval: false, afeProfile: false, glucose: false });

    const [showCgmData, setShowCgmData] = useState<boolean>(specificScreenConfig.showCgmData);
    const showCgmDataRef = useRef<boolean>(specificScreenConfig.showCgmData);

    const [channel1Visible, setChannel1Visible] = useState(true);
    const [channel2Visible, setChannel2Visible] = useState(false);
    const [tempChartVisible, setTempVisible] = useState(true);

    const [channel1FullScreen, setChannel1FullScreen] = useState(false);
    const [channel2FullScreen, setChannel2FullScreen] = useState(false);
    const [tempFullScreen, setTempFullScreen] = useState(false);


    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

    const isConnecting = useRef<boolean>(false);
    const logBuffer = useRef<string[]>([]);
    const disconnectInInterval = useRef<boolean>(specificScreenConfig.disconnectInInterval);

    const maxPoints = 40;

    const intervalTooltipText = 'Interval for smartphone to establish connection to Bluetooth LE Device to gather data from sensor.\n\nDevice and app will disconnect after data is transmitted. Device and app will reconnect after time interval has passed. \n\nDevice remains connected and does not disconnect for interval of 1 second.';
    const afeProfileTooltipText = 'Default profile: 1-channel default registers. \n\nUpload a txt file of AFE registers to configure sensor with a custom configuration. \n\nCustom register txt file can be obtained from AFE EVM GUI.'
    const glucoseToolTipText = 'Based on simulation. \n\nNot representative of real glucose data.'

    useFocusEffect(
        useCallback(() => {
            const task = InteractionManager.runAfterInteractions(() => {
                bleManagerEmitter.addListener(
                    'BleManagerDidUpdateValueForCharacteristic', handleIndication);

                bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', () => {
                    addLog("device disconnected from phone")
                })
            });

            return () => {
                task.cancel();
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    setPollingInterval(null);
                }
                bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
                bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
                BleManager.stopNotification(peripheralId, SERVICE_UUID, CHAR_UUID); // Stop notifications


            };
        }, [pollingInterval])
    );

    useEffect(() => {
        /* Disable lock screen sleep */
        IdleTimerManager.setIdleTimerDisabled(true, 'cgm-test-screen');

        // Update disconnectInInterval to be false as default
        updateConfigurations({ ...specificScreenConfig, disconnectInInterval: false, showCgmData: showCgmDataRef.current })

        return () => {
            /* Enable lock screen sleep */
            IdleTimerManager.setIdleTimerDisabled(false, 'cgm-test-screen');
            updateConfigurations({ ...specificScreenConfig, disconnectInInterval: false, showCgmData: showCgmDataRef.current })

        };
    }, []);

    useEffect(() => {
        isConnecting.current = false;

        if (indicationsSwitch) {
            addLog("Indications switched ON - polling first sample immediately");

            // Poll immediately once
            connect(peripheralId, 0, 5)
                .then(() => {
                    addLog('Peripheral connected for immediate first poll');
                    return BleManager.retrieveServices(peripheralId);
                })
                .then(() => {
                    pollTemperature();
                    addLog('First sample requested');

                    // Now start interval for repeated polling
                    const interval = setInterval(onIntervalTimeout, Number(selectedInterval) * 1000);
                    setPollingInterval(interval);
                })
                .catch((e) => {
                    addLog('Failed to poll first sample: ' + e);
                });

        } else {
            // If turning off, clear polling interval and disconnect
            if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
                addLog("polling interval cleared");
            }
            addLog("Trying to connect to peripheral (indications OFF)");
            connect(peripheralId)
                .catch((e) => addLog("Connect failed: " + e));
        }

        return () => {
            // Cleanup when indicationsSwitch changes or component unmounts
            if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
                addLog("polling interval cleared (cleanup)");
            }
        };
    }, [indicationsSwitch, selectedInterval]);


    useEffect(() => {
        setShowCgmData(specificScreenConfig.showCgmData);
        showCgmDataRef.current = specificScreenConfig.showCgmData
    }, [specificScreenConfig.showCgmData]);

    useEffect(() => {
        disconnectInInterval.current = specificScreenConfig.disconnectInInterval;
    }, [specificScreenConfig.disconnectInInterval]);

    // Each interval, connect to the device, and start notification, once notification received, disconnect from the device
    const pollTemperature = () => {
        addLog('Polling temperature...');
        BleManager.startNotification(peripheralId, SERVICE_UUID, CHAR_UUID);
    };

    const connect = (peripheralId: string, retries = 0, maxRetries = 5) => {
        return new Promise((resolve, reject) => {
            BleManager.connect(peripheralId)
                .then(() => {
                    addLog(`Connected to ${peripheralId}`);
                    resolve('success');
                })
                .catch((error) => {
                    addLog(`Connection failed: ${error}. Retrying... (${retries + 1}/${maxRetries})`);

                    if (retries < maxRetries) {
                        setTimeout(() => {
                            connect(peripheralId, retries + 1, maxRetries).then(resolve).catch(reject);
                        }, 2000);
                    } else {

                        reject('Max retries reached, failed to connect');
                    }
                });
        });
    };

    // In each interval timeout, connect to the device, enable notification and disconnect the device.
    const onIntervalTimeout = () => {
        addLog("Interval timeout")
        if (isConnecting.current) {
            addLog('Connection already in progress, skipping...');
            return; // Prevent multiple connection attempts
        }
        isConnecting.current = true

        if (disconnectInInterval.current) {
            addLog('Trying to connect to ' + peripheralId + ' ....')
            connect(peripheralId, 0, 5) // 5 retries
                .then(() => {
                    addLog('Peripheral connected, retrieving services..');
                    BleManager.retrieveServices(peripheralId).then(() => {
                        pollTemperature();

                    }).catch((e) => {
                        addLog('Retrieve services failed:', e);
                    }).finally(() => {
                        isConnecting.current = false;
                    });
                })
                .catch((e) => {
                    addLog('Final connection attempt failed:', e);
                })
                .finally(() => {
                    isConnecting.current = false;
                });

        } else {
            BleManager.isPeripheralConnected(peripheralId, [])
                .then(isConnected => {
                    if (isConnected) {
                        addLog('Peripheral already connected, polling data..');
                        isConnecting.current = false;
                        pollTemperature();
                    } else {
                        connect(peripheralId, 0, 0)
                            .then(() => {
                                addLog('Peripheral connected');
                                BleManager.retrieveServices(peripheralId)
                                    .then(() => {
                                        pollTemperature();
                                    })
                                    .catch((e) => {
                                        addLog('Retrieve services failed:', e);
                                    })
                                    .finally(() => {
                                        isConnecting.current = false;
                                    });
                            })
                            .catch((e) => {
                                addLog('Final connection attempt failed:', e);
                            })
                            .finally(() => {
                                isConnecting.current = false;
                            });
                    }
                }).catch((e) => addLog("isPeripheralConnected failed" + e));
        }

    }

    const handleIndicationSwitch = useCallback(async () => {
        setIndicationsSwitch((prev) => !prev);
        //  Poll first sample right away 
        pollTemperature();
    }, [indicationsSwitch]);

    function tempTypeToDefinition(type: number) {
        let def;
        switch (type) {
            case 0x0:
                def = "Reserved for future use";
                break;
            case 0x1:
                def = "Armpit";
                break;
            case 0x2:
                def = "Body (general)";
                break;
            case 0x3:
                def = "Ear (usually earlobe)";
                break;
            case 0x4:
                def = "Finger";
                break;
            case 0x5:
                def = "Gastrointestinal Tract";
                break;
            case 0x6:
                def = "Mouth";
                break;
            case 0x7:
                def = "Rectum";
                break;
            case 0x8:
                def = "Toe";
                break;
            case 0x9:
                def = "Tympanum (ear drum)";
                break;
            default:
                def = "Reserved for future use";
                break;
        }
        return def;
    }

    function parseTemperature(valueArray: any) {
        if (!valueArray || valueArray.length < 4) return 0; // add sanity check

        const mantissa = (valueArray[2] << 16) | (valueArray[1] << 8) | valueArray[0];
        const signedMantissa = mantissa >= 0x8000 ? mantissa - 0x10000 : mantissa;

        const exponent = valueArray[3];
        const signedExponent = exponent >= 0x80 ? exponent - 0x100 : exponent;

        const floatValue = signedMantissa * Math.pow(10, signedExponent);

        if (isNaN(floatValue) || !isFinite(floatValue)) return 0;

        return floatValue;
    }

    const handleIndication = async ({ value, peripheral, characteristic, service }: any) => {
        addLog(`Got notification: ${value}, characteristic: ${characteristic}`);

        if (characteristic.toLowerCase().includes(CHAR_UUID.toLowerCase()) && value) {
            const valueArray = new Uint8Array(value);

            // --- Parse flags ---
            const flags = valueArray[0];
            const temperatureUnitsFlag = !!(flags & 0b00000001);
            const timeStampFlag = !!(flags & 0b00000010);
            const temperatureTypeFlag = !!(flags & 0b00000100);

            // --- Parse Ch1 float (bytes 1–4) ---
            const ch1MeasurementValue = valueArray.slice(1, 5);
            const ch1Measure = parseTemperature(ch1MeasurementValue);
            const ch1MeasureRounded = parseFloat(ch1Measure.toFixed(2));

            // // --- Parse Ch2 float (bytes 5-8) ---
            // const ch2MeasurementValue = valueArray.slice(5, 9);
            // const ch2Measure = parseTemperature(ch2MeasurementValue);
            // const ch2MeasureRounded = parseFloat(ch2Measure.toFixed(2));

            // --- Parse temperature float (bytes 5-8) ---
            const temperatureMeasurementValue = valueArray.slice(5, 9);
            const tempMeasure = parseTemperature(temperatureMeasurementValue);
            const tempMeasureRounded = parseFloat(tempMeasure.toFixed(2));

            let offset = 9; // after temp + ch1

            // --- Parse timestamp (if present) ---
            let timestamp = null;
            let timeString = '';
            let dateString = '';

            if (timeStampFlag) {
                const year = valueArray[offset] + valueArray[offset + 1] * 256;
                const seconds = valueArray[offset + 2];
                const minutes = valueArray[offset + 3];
                const hour = valueArray[offset + 4];
                const month = valueArray[offset + 5];
                const day = valueArray[offset + 6];
                timestamp = new Date(year, month - 1, day, hour, minutes, seconds);

                // Format as M/D/YY HH:mm
                const formattedYear = timestamp.getFullYear() % 100; // last two digits
                const formattedMonth = timestamp.getMonth() + 1; // month is zero-based
                const formattedDay = timestamp.getDate();
                const formattedHours = timestamp.getHours().toString().padStart(2, '0');
                const formattedMinutes = timestamp.getMinutes().toString().padStart(2, '0');
                const formattedSeconds = timestamp.getSeconds().toString().padStart(2, '0');

                timeString = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`
                dateString = `${formattedMonth}/${formattedDay}/${formattedYear}`
                const formattedDateTime = timeString + ' ' + dateString
                setTime(formattedDateTime);

                offset += 7;
            }

            // --- Parse temperature type ---
            let location = 'N/A';
            if (temperatureTypeFlag) {
                const temperatureType = valueArray[offset];
                location = tempTypeToDefinition(temperatureType);
                offset += 1;
            }

            const units = temperatureUnitsFlag ? '°F' : '°C';
            setTemperature({ temp: tempMeasureRounded, unit: units });
            setTemperatureType(location);
            setCh1current(ch1MeasureRounded);
            // setCh2current(ch2MeasureRounded);

            // addLog(`Temp: ${tempMeasureRounded} ${units}, Ch1: ${ch1MeasureRounded} mg/dL, Ch2: ${ch2MeasureRounded} mg/dL, Time: ${timeString}`);
            addLog(`Temp: ${tempMeasureRounded} ${units}, Ch1: ${ch1MeasureRounded} mg/dL, Time: ${timeString}`);

            const date = new Date().toTimeString().split(' ')[0]
            const newDataTemp: TemperatureData = {
                temperatureMeasurement: tempMeasureRounded,
                timestamp: date,
                date: dateString,
                time: timeString,
                location: location,
                units: units,
            };

            const newDataCh1: ChData = {
                cgmMeasurement: ch1MeasureRounded,
                timestamp: date,
            };

            // const newDataCh2: ChData = {
            //     cgmMeasurement: ch2MeasureRounded,
            //     timestamp: date,
            // };

            setTemperatureDataSet(prevData => {
                let newSet = [...prevData, newDataTemp];
                if (newSet.length > maxPoints) newSet.shift();
                return newSet;
            });

            setAllTemperatureDataSet(prevData => {
                return [...prevData, newDataTemp]
            })

            setCh1DataSet(prevData => {
                let newSet = [...prevData, newDataCh1];
                if (newSet.length > maxPoints) newSet.shift();
                return newSet;
            });
            setAllCh1DataSet(prevData => {
                return [...prevData, newDataCh1]
            })

            // setCh2DataSet(prevData => {
            //     let newSet = [...prevData, newDataCh2];
            //     if (newSet.length > maxPoints) newSet.shift();
            //     return newSet;
            // });

            // --- Disconnect or keep connected ---
            try {
                BleManager.stopNotification(peripheralId, SERVICE_UUID, CHAR_UUID)
                if (disconnectInInterval.current) {
                    try {
                        await BleManager.disconnect(peripheralId)
                        addLog('Peripheral Disconnected')
                    } catch (e) {
                        addLog("Failed disconnect the device" + e)
                    }
                } else {
                    addLog('Keeping device connected since toggle is off');
                }
            }
            catch (e) {
                addLog('stopNotification failed:' + e)
            }

        }
    };

    function convertToCSV(temperatureData: TemperatureData[], ch1Data: ChData[]): string {
        const headers = [
            "Timestamp",
            "Temperature Measurement",
            "Temperature Units",
            "Temperature Location",
            "Time",
            "Date",
            "CGM Measurement",
            "CGM Units",
            // "Channel 2 Measurement",
            // "Channel 2 Units",
        ];

        // We assume temperatureData and channels data arrays are roughly aligned by index.
        const maxLength = Math.max(temperatureData.length, ch1Data.length);

        const csvRows = [
            headers.join(","), // Header row
        ];

        for (let i = 0; i < maxLength; i++) {
            const tempRow = temperatureData[i] || {};
            const ch1Row = ch1Data[i] || {};

            const row = [
                tempRow.timestamp || "",
                tempRow.temperatureMeasurement !== undefined ? tempRow.temperatureMeasurement : "",
                tempRow.units == "°C" ? "Celsius" : "Fahrenheit",
                tempRow.location || "",
                tempRow.time || "",
                tempRow.date || "",
                ch1Row.cgmMeasurement !== undefined ? ch1Row.cgmMeasurement : "",
                "nA",
                // ch2Row.cgmMeasurement !== undefined ? ch2Row.cgmMeasurement : "",
                // "nA",
            ];

            csvRows.push(row.join(","));
        }

        return csvRows.join("\n");
    }

    const exportData = () => {
        let csvStr = convertToCSV(allTemperatureDataSet, allCh1DataSet);
        downloadDataToLocalStorage(csvStr, "CGM_Service.csv", 'text/csv');
    }

    function getTimeStamp() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const ss = String(now.getSeconds()).padStart(2, "0");
        const ms = String(now.getMilliseconds()).padStart(3, "0");
        return `${hh}:${mm}:${ss} (${ms})`;
    }

    const addLog = (message: string) => {

        const timestamp = getTimeStamp()
        console.log(message)
        const logEntry = `[${timestamp}] ${message}`;

        // Store log in buffer
        logBuffer.current = [...logBuffer.current, logEntry];
    }

    const exportLogs = () => {
        downloadDataToLocalStorage(logBuffer.current.join('\n'), "CGM_Service_logs.txt", 'text/plain');
    }

    const handleFileUpload = async () => {
        const result = await DocumentPicker.pickSingle({
            type: DocumentPicker.types.allFiles,
        });

        if (result.uri) {
            const content = await RNFS.readFile(result.uri, 'utf8');
            console.log("uploaded content:", content)
        }
    };

    function toolTip(visible: boolean, setVisible: any, text: string, title: string) {
        return (
            <Tooltip
                isVisible={visible}
                content={
                    <View style={{ padding: 3 }}>
                        <Text style={[styles.tooltipTitle]}>{title}</Text>
                        <Text style={[styles.tooltipText]}>{text}</Text>
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
                <TouchableOpacity onPress={() => setVisible(true)} style={{ marginLeft: 5 }}>
                    <Icon style={{ alignSelf: 'center' }} name='help-outline' type="MaterialIcons" size={16} />
                </TouchableOpacity >
            </Tooltip>
        )
    }

    const ch1ChartData = {
        datasets: [
            {
                data: ch1DataSet.map(x => {
                    const val = x.cgmMeasurement;
                    return (typeof val === 'number' && !isNaN(val)) ? val : 0;
                }),
                strokeWidth: 2,
            },
        ],
        legend: ["Current"],
    };

    const ch2ChartData = {
        datasets: [
            {
                data: ch2DataSet.map(x => {
                    const val = x.cgmMeasurement;
                    return (typeof val === 'number' && !isNaN(val)) ? val : 0;
                }),
                strokeWidth: 2,
            },
        ],
        legend: ["Current"],
    };

    const temperatureChartData = {
        datasets: [
            {
                data: temperatureDataSet.map(x => {
                    const val = x.temperatureMeasurement;
                    return (typeof val === 'number' && !isNaN(val)) ? val : 0;
                }),
                strokeWidth: 2,
            },
        ],
        legend: ["Temperature"],
    };

    return (
        <KeyboardAvoidingView style={[styles.container]}>
            <ScrollView>

                {/* Config */}
                <View style={[styles.dateTimeBox]}>

                    <View style={[styles.item]}>
                        <View style={styles.intervalPickerContainer}>
                            <View style={[styles.row]}>
                                <Text style={[styles.title]}>Data Interval</Text>
                                {toolTip(sectionsTooltip.interval, (isVisible: boolean) => { setSectionsTooltip({ ...sectionsTooltip, interval: isVisible }) }, intervalTooltipText, "Data Interval")}
                            </View>
                            <Dropdown
                                style={[styles.dropdown]}
                                data={Object.values([
                                    { value: '1', label: '1 second', },
                                    { value: '5', label: '5 seconds', },
                                    { value: '10', label: '10 seconds', },
                                    { value: '60', label: '1 minute', },
                                    { value: '120', label: '2 minutes', },
                                    { value: '300', label: '5 minutes', },
                                ])}
                                value={selectedInterval}
                                onChange={(v: any) => {
                                    setIndicationsSwitch(false);
                                    setSelectedInterval(v.value);
                                }}
                                labelField='label'
                                valueField='value'
                            />
                        </View>
                    </View>
                    <Divider />

                    <View style={[styles.item]}>
                        <View style={[styles.row]}>
                            <Text style={[styles.title]}>AFE Profile</Text>
                            {toolTip(sectionsTooltip.afeProfile, (isVisible: boolean) => { setSectionsTooltip({ ...sectionsTooltip, afeProfile: isVisible }) }, afeProfileTooltipText, "AFE Profile")}
                        </View>
                        <TouchableOpacity onPress={handleFileUpload} style={{ flexDirection: 'row' }}>
                            <Text style={{ color: Colors.blue }}>Upload File</Text>
                            <MaterialCommunityIcons name="paperclip" size={18} color={Colors.blue} solid={false} />
                        </TouchableOpacity>
                    </View>
                    <Divider />

                    <View style={[styles.item]}>
                        <Text style={[styles.title]}>Enable Indications</Text>
                        <Switch
                            value={indicationsSwitch}
                            onValueChange={handleIndicationSwitch}
                        />
                    </View>

                </View>

                {/* Glucose data */}
                {showCgmData && (
                    <View style={[styles.dateTimeBox]}>

                        <View style={[styles.item]}>
                            <Text style={[styles.title]}>Date and Time</Text>
                            <Text style={[styles.data]}>{time ? time : 'N/A'}</Text>
                        </View>

                        <Divider />

                        <View style={[styles.item]}>
                            <View style={[styles.row]}>
                                <Text style={[styles.title]}>Glucose</Text>
                                {toolTip(sectionsTooltip.glucose, (isVisible: boolean) => { setSectionsTooltip({ ...sectionsTooltip, glucose: isVisible }) }, glucoseToolTipText, "Glucose")}
                            </View>
                            <Text style={[styles.data]}>{ch1current && temperature ? Math.round(Number(ch1current * 10 + ((temperature?.temp - 26) / 2))) + " mg/dL" : "N/A"}</Text>
                        </View>

                    </View>
                )}

                {/* Channel 1 Chart */}
                {ch1DataSet.length > 0 && (
                    <View style={[styles.chartContainer]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 50 }}>
                            <View style={{ flexDirection: 'row' }}>

                                {/* Expand / fullscreen icon */}
                                <TouchableOpacity onPress={() => setChannel1FullScreen(true)} style={{ marginRight: 10 }}>
                                    <Icon name={'expand-arrows-alt'} type='font-awesome-5' size={18} />
                                </TouchableOpacity>

                                <Text style={[styles.title]}>Channel 1</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setChannel1Visible(!channel1Visible)}
                                style={{ flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Icon
                                    name={!channel1Visible ? 'chevron-down' : 'chevron-up'}
                                    type='font-awesome-5'
                                    size={18}
                                    style={{ marginLeft: 8 }}
                                />
                            </TouchableOpacity>

                        </View>


                        {channel1Visible && (
                            <View style={{ alignItems: 'center' }}>
                                <LineChart
                                    data={ch1ChartData}
                                    width={Dimensions.get("window").width - 40}
                                    height={180}
                                    chartConfig={chartConfig}
                                    style={{ borderRadius: 10 }}
                                />
                                <Text style={[styles.yAxisLabel]}>nA</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Channel 2 Chart  */}
                {ch1DataSet.length > 0 && (
                    <View style={[styles.chartContainer]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 50 }}>
                            <View style={{ flexDirection: 'row' }}>

                                {/* Expand / fullscreen icon */}
                                <TouchableOpacity
                                    // onPress={() => setChannel2FullScreen(true)}
                                    style={{ marginRight: 10 }}>
                                    <Icon name={'expand-arrows-alt'} type='font-awesome-5' size={18} />
                                </TouchableOpacity>

                                <Text style={[styles.title]}>Channel 2</Text>
                            </View>
                            <TouchableOpacity
                                // onPress={() => setChannel2Visible(!channel2Visible)}
                                style={{ flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Icon
                                    name={!channel2Visible ? 'chevron-down' : 'chevron-up'}
                                    type='font-awesome-5'
                                    size={18}
                                    style={{ marginLeft: 8 }}
                                />
                            </TouchableOpacity>

                        </View>


                        {channel2Visible && (
                            <View style={{ alignItems: 'center' }}>
                                <LineChart
                                    data={ch2ChartData}
                                    width={Dimensions.get("window").width - 40}
                                    height={180}
                                    chartConfig={chartConfig}
                                    style={{ borderRadius: 10 }}
                                />
                                <Text style={[styles.yAxisLabel]}> nA </Text>
                            </View>
                        )}
                    </View>
                )}


                {/* Temperature Chart */}
                {temperatureDataSet.length > 0 && (
                    <View style={[styles.chartContainer]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 50 }}>
                            <View style={{ flexDirection: 'row' }}>

                                {/* Expand / fullscreen icon */}
                                <TouchableOpacity onPress={() => setTempFullScreen(true)} style={{ marginRight: 10 }}>
                                    <Icon name={'expand-arrows-alt'} type='font-awesome-5' size={18} />
                                </TouchableOpacity>

                                <Text style={[styles.title]}>Temperature</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setTempVisible(!tempChartVisible)}
                                style={{ flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Icon
                                    name={!tempChartVisible ? 'chevron-down' : 'chevron-up'}
                                    type='font-awesome-5'
                                    size={18}
                                    style={{ marginLeft: 8 }}
                                />
                            </TouchableOpacity>

                        </View>


                        {tempChartVisible && (
                            <View style={{ alignItems: 'center' }}>
                                <LineChart
                                    data={temperatureChartData}
                                    width={Dimensions.get("window").width - 40}
                                    height={180}
                                    chartConfig={chartConfig}
                                    style={{ borderRadius: 10 }}
                                />
                                <Text style={[styles.yAxisLabel]} > {temperature?.unit} </Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={[styles.buttonContainer]}>
                    <TouchableOpacity style={[styles.button]} onPress={exportData}>
                        <Text style={{ color: Colors.blue, fontSize: 14, marginRight: 8 }}>Export Data</Text>
                        <AntDesign name="download" size={20} color={Colors.blue} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button]} onPress={exportLogs}>
                        <Text style={{ color: Colors.blue, fontSize: 14, marginRight: 8 }}>Export Logs</Text>
                        <AntDesign name="download" size={20} color={Colors.blue} />
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <Modal visible={channel1FullScreen} animationType="fade">
                <View style={[styles.fullScreenChartContainer]}>
                    {/* Close button */}
                    <TouchableOpacity
                        onPress={() => setChannel1FullScreen(false)}
                        style={[styles.fullScreenCloseButton]}
                    >
                        <Icon name="close" type="antdesign" color="white" size={26} />
                    </TouchableOpacity>

                    {/* Fullscreen chart */}
                    <LineChart
                        data={ch1ChartData}
                        width={Dimensions.get('window').height - 100} // Adjusted for padding
                        height={Dimensions.get('window').width - 60}
                        chartConfig={{
                            ...chartConfig,
                        }}
                        style={{ borderRadius: 10, transform: [{ rotate: '90deg' }], }}
                    />
                </View>
            </Modal>
            <Modal visible={channel2FullScreen} animationType="fade">
                <View style={[styles.fullScreenChartContainer]}>
                    {/* Close button */}
                    <TouchableOpacity
                        onPress={() => setChannel2FullScreen(false)}
                        style={[styles.fullScreenCloseButton]}
                    >
                        <Icon name="close" type="antdesign" color="white" size={26} />
                    </TouchableOpacity>

                    {/* Fullscreen chart */}
                    <LineChart
                        data={ch2ChartData}
                        width={Dimensions.get('window').height - 100} // Adjusted for padding
                        height={Dimensions.get('window').width - 60}
                        chartConfig={{
                            ...chartConfig,
                        }}
                        style={{ borderRadius: 10, transform: [{ rotate: '90deg' }], }}
                    />
                </View>
            </Modal>
            <Modal visible={tempFullScreen} animationType="fade">
                <View style={[styles.fullScreenChartContainer]}>
                    {/* Close button */}
                    <TouchableOpacity
                        onPress={() => setTempFullScreen(false)}
                        style={[styles.fullScreenCloseButton]}
                    >
                        <Icon name="close" type="antdesign" color="white" size={26} />
                    </TouchableOpacity>

                    {/* Fullscreen chart */}
                    <LineChart
                        data={temperatureChartData}
                        width={Dimensions.get('window').height - 100} // Adjusted for padding
                        height={Dimensions.get('window').width - 60}
                        chartConfig={{
                            ...chartConfig,
                        }}
                        style={{ borderRadius: 10, transform: [{ rotate: '90deg' }], }}
                    />
                </View>
            </Modal>

        </KeyboardAvoidingView >
    );
};

const styles = StyleSheet.create({
    intervalPickerContainer: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
    },
    dropdown: {
        width: 120,
    },
    container: {
        paddingHorizontal: 20,
        paddingTop: 20,
        alignContent: 'center',
        height: '100%',
        backgroundColor: Colors.lightGray
    },
    dataBox: {
        backgroundColor: 'white',
        marginBottom: 10,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        borderRadius: 10,
        height: 40,
        alignItems: 'center',
    },
    item: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 50,
    },
    row: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateTimeBox: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 15,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    data: {
        fontSize: 16,
    },
    button: {
        backgroundColor: 'white',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginBottom: 10,
        shadowColor: 'rgba(0,0,0,0.4)',
        elevation: 2,
        shadowOpacity: 0.5,
        shadowRadius: 0,
        shadowOffset: {
            height: 1,
            width: 0,
        },
        display: 'flex',
        flexDirection: 'row',
        alignSelf: 'center',
        alignContent: 'center',
        alignItems: 'center',
    },
    tooltipTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        textDecorationLine: 'underline',
        flexWrap: 'wrap',
        marginBottom: 3,
    },
    tooltipText: {
        fontSize: 14,
        flexWrap: 'wrap'
    },
    chartContainer: {
        borderRadius: 10,
        backgroundColor: 'white',
        flexDirection: 'column',
        marginBottom: 15,
    },
    buttonContainer: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30,
        marginBottom: 15

    },
    yAxisLabel: {
        position: 'absolute',
        left: 55,
        top: 0,
        transform: [],
        fontWeight: 'bold',
        fontSize: 12
    },
    fullScreenCloseButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: Colors.blue,
        borderRadius: 30,
        padding: 8,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        zIndex: 2
    },
    fullScreenChartContainer: {
        flex: 1,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24, // More padding on sides
        paddingVertical: 50,   // More padding top/bottom
    }
})
export default CgmTestService;
