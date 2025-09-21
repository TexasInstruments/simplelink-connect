import { StyleSheet, Platform, SafeAreaView, KeyboardAvoidingView, ScrollView, InteractionManager, NativeModules, NativeEventEmitter, processColor } from 'react-native';
import Colors from '../../constants/Colors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from '../Themed';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Icon } from '@rneui/base';
import { Divider } from 'react-native-paper';
import BleManager from 'react-native-ble-manager';
import { Buffer } from 'buffer';
import { LatLng } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { getDistance } from 'geolib';
import { useBleRangeContext } from '../../context/RangeTestContext';
import { LineChart } from 'react-native-charts-wrapper';
import { downloadDataToLocalStorage } from '../../services/DownloadFileUtils';

interface Props {
    peripheralId: string;
}


const BLERangeStatics: React.FC<Props> = ({ peripheralId }) => {

    const navigation = useNavigation();

    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
    const { targetLocationContext, updateTargetLocation } = useBleRangeContext();

    const [packetReceived, setPacketReceived] = useState<string | number>('N/A');
    const [crcOk, setCrcOk] = useState<string | number>('N/A');
    const [syncOk, setSyncOk] = useState<string | number>('N/A');
    const [timestamp, setTimestamp] = useState<string | number>('N/A');
    const [avgRssi, setAvgRssi] = useState<string | number>('N/A');
    const [minRssi, setMinRssi] = useState<string | number>('N/A');
    const [maxRssi, setMaxRssi] = useState<string | number>('N/A');
    const [rssiEntries, setRssiEntries] = useState<{ x: number; y: number; timestamp: string }[]>([]);

    const [isRunning, setIsRunning] = useState(false);

    const [targetLocation, setTargetLocation] = useState<LatLng | null>(null);
    const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
    const [distance, setDistance] = useState<number | null>(null);


    const StartTestUUID = 'f409'
    const DataRefreshUUID = 'f401'
    const SightSurveyUUID = 'f40b'
    const PacketReceivedUUID = 'f402'
    const CrcOkUUID = 'f403'
    const SyncOkUUID = 'f404'
    const TimestampUUID = 'f405'
    const AvgRssiUUID = 'f406'
    const MinRssiUUID = 'f407'
    const MaxRssiUUID = 'f408'
    const CurrentRssiUUID = 'f40a'
    const SERVICE_UUID = 'f400'

    const ENTRIES_LIMIT = 1500

    useFocusEffect(
        useCallback(() => {
            const task = InteractionManager.runAfterInteractions(async () => {
                bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleNotifications);

                /* Set the MTU Size - Android only API 21+, iOS initiates an MTU exchange automatically upon connection */
                if (Platform.OS === 'android') {
                    await BleManager.requestConnectionPriority(peripheralId, 1);
                    let mtu = await BleManager.requestMTU(peripheralId, 255);
                    console.log('MTU:', mtu)
                }
                if (Platform.OS === "ios") {
                    // your code using Geolocation and asking for authorisation with
                    Geolocation.requestAuthorization("whenInUse")
                }

                try {
                    BleManager.startNotification(peripheralId, SERVICE_UUID, CrcOkUUID)
                    BleManager.startNotification(peripheralId, SERVICE_UUID, SyncOkUUID)
                    BleManager.startNotification(peripheralId, SERVICE_UUID, PacketReceivedUUID)
                    BleManager.startNotification(peripheralId, SERVICE_UUID, TimestampUUID)
                    BleManager.startNotification(peripheralId, SERVICE_UUID, AvgRssiUUID)
                    BleManager.startNotification(peripheralId, SERVICE_UUID, MaxRssiUUID)
                    BleManager.startNotification(peripheralId, SERVICE_UUID, CurrentRssiUUID)
                    BleManager.startNotification(peripheralId, SERVICE_UUID, MinRssiUUID)
                } catch (e) {
                    console.log(e)
                }
            });

            fetchCurrentLocation()

            // Calculate current location every 3 seconds
            const interval = setInterval(() => {
                fetchCurrentLocation()
            }, 3000);

            return () => {
                clearInterval(interval)
                bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic')
                BleManager.stopNotification(peripheralId, SERVICE_UUID, CrcOkUUID)
                BleManager.stopNotification(peripheralId, SERVICE_UUID, SyncOkUUID)
                BleManager.stopNotification(peripheralId, SERVICE_UUID, PacketReceivedUUID)
                BleManager.stopNotification(peripheralId, SERVICE_UUID, TimestampUUID)
                BleManager.stopNotification(peripheralId, SERVICE_UUID, AvgRssiUUID)
                BleManager.stopNotification(peripheralId, SERVICE_UUID, MaxRssiUUID)
                BleManager.stopNotification(peripheralId, SERVICE_UUID, CurrentRssiUUID)
                BleManager.stopNotification(peripheralId, SERVICE_UUID, MinRssiUUID)
                task.cancel();
            };
        }, [])
    );

    useEffect(() => {
        setTargetLocation(targetLocationContext)
    }, [targetLocationContext])

    useEffect(() => {
        if (currentLocation && targetLocation) {
            try {
                const dist = getDistance(currentLocation, targetLocation);
                setDistance(dist);
            } catch (e) {
                console.log("Error:", e)
            }
        }
    }, [currentLocation, targetLocation]);

    const fetchCurrentLocation = async () => {
        try {

            Geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords
                    setCurrentLocation({ latitude, longitude });
                },
                (err) => console.error(err),
                { enableHighAccuracy: true }
            );
        } catch (e) {
            console.log("ERROR:", e)
        }
    }


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

    const handleNotifications =
        ({ value, peripheral, characteristic, service }: any) => {
            console.log(`notification: ${value}, characteristic: ${characteristic}`);
            let bytes = Buffer.from(value, 'base64'); // Decode from Base64 to Buffer
            let decimalValue = 0
            if (characteristic.toLowerCase().includes(PacketReceivedUUID)) {
                decimalValue = bytes.readUInt32LE();
                setPacketReceived(decimalValue)
            }
            else if (characteristic.toLowerCase().includes(CrcOkUUID)) {
                decimalValue = bytes.readUInt32LE()
                setCrcOk(decimalValue)
            }
            else if (characteristic.toLowerCase().includes(SyncOkUUID)) {
                decimalValue = bytes.readUInt32LE();
                setSyncOk(decimalValue)
            }
            else if (characteristic.toLowerCase().includes(TimestampUUID)) {
                decimalValue = bytes.readUInt32LE();
                setTimestamp(decimalValue)
            }
            else if (characteristic.toLowerCase().includes(AvgRssiUUID)) {
                decimalValue = bytes.readIntLE(0, 1);
                setAvgRssi(decimalValue)
            }
            else if (characteristic.toLowerCase().includes(MinRssiUUID)) {
                decimalValue = bytes.readIntLE(0, 1);
                setMinRssi(decimalValue)
            }
            else if (characteristic.toLowerCase().includes(MaxRssiUUID)) {
                decimalValue = bytes.readIntLE(0, 1);
                setMaxRssi(decimalValue)
            }
            else if (characteristic.toLowerCase().includes(CurrentRssiUUID)) {
                decimalValue = bytes.readIntLE(0, 1);
                setRssiEntries(prev => {
                    let newIndex = prev.length > 0 ? prev[prev.length - 1].x + 1 : 0
                    const newEntry = {
                        x: newIndex,
                        y: decimalValue,
                        timestamp: new Date().toTimeString().split(' ')[0],
                    };

                    const updated = [...prev, newEntry];

                    // Keep only the last 50 entries
                    if (updated.length > ENTRIES_LIMIT) {
                        updated.shift(); // remove oldest
                    }

                    return updated;
                });

            }
            else {
                console.log("Unrecognized notification")
            }

        }

    const handleStartTest = async () => {

        try {
            // Write byte `0x01` to trigger test
            let writeBytes = [0x01]; // Explicit hex notation

            setIsRunning(true)
            await BleManager.write(peripheralId, SERVICE_UUID, StartTestUUID, writeBytes, writeBytes.length);
            console.log('start test')
        }
        catch (err) {
            console.error(err);
            return;
        }

    }

    const handleStopTest = async () => {

        try {
            // Write byte `0x00` to stop test
            let writeBytes = [0x00]; // Explicit hex notation

            setIsRunning(false)
            await BleManager.write(peripheralId, SERVICE_UUID, StartTestUUID, writeBytes, writeBytes.length);

            console.log('stop test')
        }
        catch (err) {
            console.error(err);
            return;
        }

    }

    const sightSurveyPressed = async () => {
        try {
            let writeBytes = [0x01]; // Explicit hex notation
            await BleManager.write(peripheralId, SERVICE_UUID, SightSurveyUUID, writeBytes, writeBytes.length);

            console.log('sightSurveyPressed')
        } catch (e) {
            alert(e)
        }
    }

    const handleExportCSV = () => {
        // Convert to CSV string
        const header = "Index,RSSI,Timestamp\n";
        const rows = rssiEntries
            .map((entry, i) => `${entry.x},${entry.y},${entry.timestamp}`)
            .join("\n");
        const csv = header + rows;


        downloadDataToLocalStorage(csv, "rssi.csv", 'text/csv');
    }

    return (
        <SafeAreaView style={{ backgroundColor: Colors.lightGray, flex: 1, }}>
            <KeyboardAvoidingView style={[styles.container]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView style={{ flex: 1 }}>
                    <View style={[styles.buttonContainer, { marginVertical: 15 }]}>

                        <View style={[styles.buttonWrapper]}>
                            <TouchableOpacity
                                style={[styles.button, styles.shadow, { opacity: isRunning ? 0.2 : 1 }]}
                                onPress={handleStartTest}
                                disabled={isRunning}
                            >
                                <Icon name="play" size={20} color="#fff" type='font-awesome-5' />
                            </TouchableOpacity>
                            <Text style={[styles.buttonText, { opacity: isRunning ? 0.2 : 1 }]}>Start Test</Text>
                        </View>

                        <View style={[styles.buttonWrapper,]}>
                            <TouchableOpacity
                                style={[styles.button, styles.shadow, { opacity: !isRunning ? 0.2 : 1 }]}
                                onPress={handleStopTest}
                                disabled={!isRunning}
                            >
                                <Icon name="stop" size={20} color="#fff" type='font-awesome-5' />
                            </TouchableOpacity>
                            <Text style={[styles.buttonText, { opacity: !isRunning ? 0.2 : 1 }]}>Stop Test</Text>
                        </View>
                    </View>
                    <View style={[styles.chartContainer]}>
                        <Text style={[styles.title]}>Current RSSI</Text>
                        <View style={styles.chartHeader}>
                            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>dBm</Text>
                            <View style={{ flex: 1 }} />
                        </View>
                        <LineChart
                            style={[styles.chart]}
                            data={{
                                dataSets: [
                                    {
                                        values: rssiEntries.map(e => ({ x: e.x, y: e.y })),
                                        label: 'Current RSSI',
                                        config: {
                                            color: processColor(Colors.blue),
                                            drawCircles: false,
                                            lineWidth: 1,
                                            drawValues: true
                                        },
                                    },
                                ],
                            }}
                            xAxis={{
                                position: 'BOTTOM',
                                valueFormatter: rssiEntries.map(item => item.x.toString()),
                                granularityEnabled: false,
                                granularity: 1,
                                drawLabels: true,
                            }}
                            yAxis={chartConfig.yAxis}
                            legend={chartConfig.legend}
                            marker={chartConfig.markerConfig}
                            {...chartConfig.config}
                            chartDescription={{ text: '' }}
                            scaleXEnabled={true}
                            scaleYEnabled={false}
                        />
                        <Text style={{ alignSelf: 'center', fontWeight: 'bold', fontSize: 12, }}>time</Text>

                        <TouchableOpacity
                            onPress={handleExportCSV}
                            style={{ marginBottom: 10, marginTop: 20 }}
                        >
                            <Text style={{ color: Colors.blue, fontSize: 16, }}>Export as CSV</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Statics Results */}
                    <View style={[styles.contentBox]}>
                        <View style={[styles.item]}>
                            <Text style={[styles.title]}>Distance</Text>
                            <Text style={[styles.data]}> {distance !== null ? `${distance} meters` : 'N/A'}</Text>
                        </View>
                        <Divider />
                        <View style={[styles.item]}>
                            <Text style={[styles.title]}>Packets received</Text>
                            <Text style={[styles.data]}>{packetReceived}</Text>
                        </View>
                        <Divider />
                        <View style={[styles.item]}>
                            <Text style={[styles.title]}>CRC Ok</Text>
                            <Text style={[styles.data]}>{crcOk}</Text>
                        </View>
                        <Divider />
                        <View style={[styles.item]}>
                            <Text style={[styles.title]}>Sync OK</Text>
                            <Text style={[styles.data]}>{syncOk}</Text>
                        </View>
                        <Divider />
                        <View style={[styles.item]}>
                            <Text style={[styles.title]}>Time stamp </Text>
                            <Text style={[styles.data]}>{timestamp}</Text>
                        </View>
                        <Divider />
                        <View style={[styles.item]}>
                            <Text style={[styles.title]}>Average RSSI</Text>
                            <Text style={[styles.data]}>{avgRssi}</Text>
                        </View>
                        <Divider />
                        <View style={[styles.item]}>
                            <Text style={[styles.title]}>Max RSSI</Text>
                            <Text style={[styles.data]}>{maxRssi}</Text>
                        </View>
                        <Divider />
                        <View style={[styles.item]}>
                            <Text style={[styles.title]}>Min RSSI</Text>
                            <Text style={[styles.data]}>{minRssi}</Text>
                        </View>
                        <Divider />
                        <View style={[styles.siteSurveyCont]}>
                            <TouchableOpacity onPress={sightSurveyPressed}>
                                <Text style={{ color: Colors.blue, fontSize: 16, textAlignVertical: 'center' }}>Site Survey</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                </ScrollView>

            </KeyboardAvoidingView>
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    item: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 45,
    },
    siteSurveyCont: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 45,
    },
    chartContainer: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 20,
        padding: 10,
        borderRadius: 15
    },
    data: {
        fontSize: 16,
    },
    contentBox: {
        backgroundColor: 'transparent',
        borderRadius: 15,
        overflow: 'hidden'
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    button: {
        backgroundColor: Colors.gray,
        borderRadius: 60,
        width: 65,
        height: 65,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 10,
        justifyContent: 'flex-start',
        backgroundColor: Colors.lightGray,
    },
    buttonWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 10,
        backgroundColor: Colors.lightGray
    },
    icon: {
        marginRight: 10,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        backgroundColor: Colors.lightGray,
        marginBottom: 10
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
        fontWeight: '700',
        color: Colors.gray
    },
    chart: {
        width: 300,
        height: 300,
        paddingHorizontal: 40,
        marginTop: 10,
        paddingVertical: 10
    },
    chartHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 20,
    },
});

export default BLERangeStatics;
