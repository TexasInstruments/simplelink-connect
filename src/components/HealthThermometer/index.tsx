import { InteractionManager, KeyboardAvoidingView, NativeEventEmitter, Switch, TouchableOpacity, View } from 'react-native';
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
import { AntDesign } from '@expo/vector-icons';
import { downloadDataToLocalStorage } from '../Tests/testsUtils';
import { ScrollView } from 'react-native-gesture-handler';

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

const HealthThermometer: React.FC<Props> = ({ peripheralId }) => {

    const SERVICE_UUID = '1809';
    const CHAR_UUID = '2A1C';

    const [indicationsSwitch, setIndicationsSwitch] = useState<boolean>(false);
    const [temperature, setTemperature] = useState<{ temp: number, unit: string } | null>(null);
    const [time, setTime] = useState<string | null>(null);
    const [date, setDate] = useState<string | null>(null);
    const [temperatureType, setTemperatureType] = useState<string | null>(null);
    const [temperatureDataSet, setTemperatureDataSet] = useState<TemperatureData[]>([]);
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

    function parseTemperature(valueArray: any) {

        // Extract signed mantissa (first 3 bytes)
        const mantissa = (valueArray[2] << 16) | (valueArray[1] << 8) | valueArray[0];
        const signedMantissa = mantissa >= 0x8000 ? mantissa - 0x10000 : mantissa;

        // Extract signed exponent (last byte)
        const exponent = valueArray[3];

        const signedExponent = exponent >= 0x80 ? exponent - 0x100 : exponent;
        const floatValue = signedMantissa * Math.pow(10, signedExponent);

        return floatValue;
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

                // Parse temperature measurement value as a float
                const temperatureMeasurementValue = valueArray.slice(1, 5); // Bytes 2 to 5

                const tempMeasure = parseTemperature(temperatureMeasurementValue);
                const tempMeasureRounded = parseFloat(tempMeasure.toFixed(2));

                // Parse timestamp (if present)
                let timestamp = null;
                let hexString = Buffer.from(value).toString('hex');
                let timeString = '';
                let dateString = '';
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
                    timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    dateString = timestamp.toLocaleDateString("en-US", options);

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

                setTemperature({ temp: tempMeasureRounded, unit: units });
                console.log("Temperature Type:", temperatureType);

                const location = tempTypeToDefinition(temperatureType)
                setTemperatureType(location);

                const newData: TemperatureData = {
                    temperatureMeasurement: tempMeasureRounded,
                    timestamp: new Date().toTimeString().split(' ')[0],
                    date: dateString,
                    time: timeString,
                    location: location,
                    units: units
                }
                // Add new sample to data array
                setTemperatureDataSet(prevData => {
                    let newSet = [...prevData, newData];
                    if (newSet.length > 20) {
                        newSet.shift();
                    }
                    return newSet;
                });

                BleManager.stopNotification(peripheralId, SERVICE_UUID, CHAR_UUID);
            }

        }

    const chartData = {
        // labels: pollingCounter,
        datasets: [
            {
                data: temperatureDataSet.map((x) => x.temperatureMeasurement),
                strokeWidth: 2
            }
        ],
        legend: ["Temperature Measurement"]
    };

    function convertToCSV(dataArray: TemperatureData[]): string {

        // Define headers for CSV
        const headers = ["Timestamp", "Temperature Measurement", "units", "Location", "Time", "Date"];

        // Map the headers and data rows to strings
        const csvRows = [
            headers.join(","), // Header row
            ...dataArray.map(row => `${row.timestamp},${row.temperatureMeasurement},${row.units},${row.location},${row.time},${row.date}`)
        ];

        // Join all rows with newline characters
        return csvRows.join("\n");
    }

    const exportData = () => {
        console.log("press enter to export")
        let csvStr = convertToCSV(temperatureDataSet);

        downloadDataToLocalStorage(csvStr, "Health_Thermometer_Service.csv", 'text/csv');
    }

    return (
        <KeyboardAvoidingView style={[styles.container]}>
            <ScrollView>
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
                        height={180}
                        chartConfig={chartConfig}
                        charStyle={chartStyles}
                        style={{ borderRadius: 10, opacity: indicationsSwitch ? 1 : 0.3 }}
                    />
                )}

                <TouchableOpacity style={[styles.button]} onPress={exportData}>
                    <Text style={{ color: Colors.blue, fontSize: 14, marginRight: 8 }}>Export Data</Text>
                    <AntDesign name="download" size={20} color={Colors.blue} />
                </TouchableOpacity>

            </ScrollView>

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
        paddingVertical: 10,
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
        marginTop: 10,
        alignContent: 'center',
        alignItems: 'center',
    }
})
export default HealthThermometer;
