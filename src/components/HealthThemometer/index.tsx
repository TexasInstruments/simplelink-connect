import { InteractionManager, KeyboardAvoidingView, NativeEventEmitter, Switch, View } from 'react-native';
import { Text } from '../Themed';
import { StyleSheet, NativeModules, Dimensions } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import Colors from '../../constants/Colors';
import { useCallback, useEffect, useState } from 'react';
import BleManager from 'react-native-ble-manager';
import { Buffer } from 'buffer';
import { Divider } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { chartConfig, chartStyles } from '../../constants/Charts';
import { useFocusEffect } from '@react-navigation/native';

interface Props {
    peripheralId: string;
}

const HealthThemometer: React.FC<Props> = ({ peripheralId }) => {

    const SERVICE_UUID = '1809';
    const CHAR_UUID = '2A1C';

    const [indicationsSwitch, setIndicationsSwitch] = useState<boolean>(false);
    const [temperature, setTemperature] = useState<{ temp: number, unit: string } | null>(null);
    const [time, setTime] = useState<string | null>(null);
    const [date, setDate] = useState<string | null>(null);
    const [temperatureType, setTemperatureType] = useState<string | null>(null);
    const [temperatureDataSet, setTemperatureDataSet] = useState<number[]>([0]);
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
    const [selectedInterval, setSelectedInterval] = useState('10'); // Default interval is 10 seconds

    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

    useFocusEffect(
        useCallback(() => {
            const task = InteractionManager.runAfterInteractions(() => {
                bleManagerEmitter.addListener(
                    'BleManagerDidUpdateValueForCharacteristic', handleIndication);
            });

            return () => {
                task.cancel();
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    setPollingInterval(null);
                }
                bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
                BleManager.stopNotification(peripheralId, SERVICE_UUID, CHAR_UUID); // Stop notifications
            };
        }, [pollingInterval])
    );

    useEffect(() => {
        if (indicationsSwitch) {
            // Start polling interval if indicationsSwitch is enabled
            pollTemperature();
            const interval = setInterval(pollTemperature, Number(selectedInterval) * 1000);
            setPollingInterval(interval);
        } else {
            // Clear polling interval
            if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
            }
        }
    }, [indicationsSwitch]);

    const pollTemperature = () => {
        console.log('Polling temperature...');
        BleManager.startNotification(peripheralId, SERVICE_UUID, CHAR_UUID);
    };

    const handleIndicationSwitch = useCallback(async () => {
        setIndicationsSwitch((prev) => !prev);
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

    const handleIndication =
        ({ value, peripheral, characteristic, service }: any) => {
            console.log(`notification: ${value}, characteristic: ${characteristic}`);

            if (characteristic.toLowerCase().includes(CHAR_UUID.toLowerCase()) && value) {

                const valueArray = new Uint8Array(value);

                // Parse flags
                const flags = valueArray[0];
                const temperatureUnitsFlag = !!(flags & 0b00000001);
                const timeStampFlag = !!(flags & 0b00000010);
                const temperatureTypeFlag = !!(flags & 0b00000100);

                // Parse temperature measurement value
                const temperatureMeasurementValue = valueArray.slice(1, 5); // Bytes 2 to 5

                // Parse timestamp (if present)
                let timestamp = null;
                let hexString = Buffer.from(value).toString('hex');

                if (timeStampFlag) {
                    const year = valueArray[5] + valueArray[6] * 256; // Bytes 6 and 7
                    const seconds = valueArray[7];
                    const minutes = valueArray[8];
                    const hour = valueArray[9];
                    const month = valueArray[10];
                    const day = valueArray[11];
                    timestamp = new Date(year, month - 1, day, hour, minutes, seconds);
                    const options = {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    };
                    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const dateString = timestamp.toLocaleDateString("en-US", options);

                    console.log('Time:', timeString);
                    console.log('Date:', dateString);

                    setTime(timeString);
                    setDate(dateString);
                }

                // Parse temperature type
                const temperatureType = valueArray[12]; // Byte 13

                // Display parsed data
                let units = temperatureUnitsFlag ? 'Fahrenheit' : 'Celsius'
                console.log("Temperature Units Flag:", units);

                let tempMeasure = new Uint32Array(temperatureMeasurementValue.buffer)[0];
                setTemperature({ temp: tempMeasure, unit: units });

                // Add new sample to data array
                setTemperatureDataSet(prevData => {
                    let newSet = [...prevData, tempMeasure]
                    if (newSet.length > 20) {
                        newSet.shift();
                    }
                    return newSet
                });

                console.log("Temperature Type:", temperatureType);
                setTemperatureType(tempTypeToDefinition(temperatureType));

                BleManager.stopNotification(peripheralId, SERVICE_UUID, CHAR_UUID);
            }

        }

    const chartData = {
        // labels: pollingCounter,
        datasets: [
            {
                data: temperatureDataSet,
                strokeWidth: 2
            }
        ],
        legend: ["Temperature Measurement"]
    };

    return (
        <KeyboardAvoidingView style={[styles.container]}>
            <View style={{ flex: 1, }}>
                <View style={[styles.dataBox]}>
                    <Text style={[styles.title]}>Temperature</Text>
                    <Text style={[styles.data]}>{temperature ? temperature.temp + (temperature?.unit == 'Fahrenheit' ? '°F' : '°C') : 'N/A'}</Text>
                </View>
                <View style={[styles.dateTimeBox]}>
                    <View style={[styles.item]}>
                        <Text style={[styles.title]}>Date</Text>
                        <Text style={[styles.data]}>{date ? date : 'N/A'}</Text>
                    </View>
                    <Divider />
                    <View style={[styles.item]}>
                        <Text style={[styles.title]}>Time</Text>
                        <Text style={[styles.data]}>{time ? time : 'N/A'}</Text>
                    </View>
                    <Divider />
                    <View style={[styles.item]}>
                        <Text style={[styles.title]}>Location</Text>
                        <Text style={[styles.data]}>{temperatureType ? temperatureType : 'N/A'}</Text>
                    </View>
                </View>
                <View style={[styles.dateTimeBox]}>
                    <View style={[styles.item]}>
                        <Text style={[styles.title]}>Enable Indications</Text>
                        <Switch
                            value={indicationsSwitch}
                            onChange={handleIndicationSwitch}
                        />
                    </View>
                    <Divider />

                    <View style={[styles.item]}>
                        <View style={styles.intervalPickerContainer}>
                            <Text style={[styles.title]}>Polling Interval</Text>
                            <Dropdown
                                style={[styles.dropdown]}
                                data={Object.values([
                                    { value: '5', label: '5 seconds', },
                                    { value: '10', label: '10 seconds', },
                                    { value: '30', label: '30 seconds', },
                                    { value: '60', label: '60 seconds', },
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
                </View>

                {/* LineChart component */}
                {temperatureDataSet.length > 0 && (
                    <LineChart
                        data={chartData}
                        width={Dimensions.get("window").width - 40}
                        height={220}
                        chartConfig={chartConfig}
                        charStyle={chartStyles}
                        style={{ borderRadius: 10, opacity: indicationsSwitch ? 1 : 0.3 }}
                    />
                )}

            </View>

        </KeyboardAvoidingView>
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
        width: 130,
    },
    container: {
        paddingHorizontal: 20,
        paddingVertical: 30,
        alignContent: 'center',
        height: '100%',
        backgroundColor: Colors.lightGray
    },
    dataBox: {
        backgroundColor: 'white',
        marginBottom: 15,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        borderRadius: 10,
        height: 50,
        alignItems: 'center',
    },
    item: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        height: 50,
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
    }
})
export default HealthThemometer;
