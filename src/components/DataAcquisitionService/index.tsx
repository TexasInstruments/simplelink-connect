import { StyleSheet, Platform, InteractionManager, NativeModules, NativeEventEmitter, processColor, useWindowDimensions, Alert } from 'react-native';
import Colors from '../../constants/Colors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from '../../components/Themed';
import { useFocusEffect } from '@react-navigation/native';
import BleManager from 'react-native-ble-manager';
import { Icon } from '@rneui/base';
import { LineChart } from 'react-native-charts-wrapper';
import { downloadDataToLocalStorage } from '../../services/DownloadFileUtils';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
    peripheralId: string;
}

interface DataChart {
    x: string; // number of samples
    y: number; // ADC output
}

const DataAcquisitionServiceScreen: React.FC<Props> = ({ peripheralId }) => {

    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

    const { fontScale } = useWindowDimensions();

    const [displayedSamples, setDisplaySamples] = useState<DataChart[]>([]);
    const [isRunning, setIsRunning] = useState<boolean>(false);

    const displaySamplesRef = useRef<DataChart[]>([]);
    const allSamplesRef = useRef<DataChart[]>([]);
    const sampleToSaveRef = useRef<string[]>([]);

    const isRunningRef = useRef<boolean>(false);
    const notificationCountRef = useRef<number>(0);
    const notificationLengthRef = useRef<number>(0);

    const SERVICE_UUID = 'f000dd00-0451-4000-b000-000000000000'
    const DATA_CHAR_UUID = 'f000dd02-0451-4000-b000-000000000000'
    const NOTIFY_CHAR_UUID = 'f000dd01-0451-4000-b000-000000000000'

    const MAX_SAMPLES = 400;

    useEffect(() => {
        isRunningRef.current = isRunning;
    }, [isRunning])

    useFocusEffect(
        useCallback(() => {
            const task = InteractionManager.runAfterInteractions(async () => {
                bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleDataAcquisitionNotifications);

                /* Set the MTU Size - Android only API 21+, iOS initiates an MTU exchange automatically upon connection */
                if (Platform.OS === 'android') {
                    await BleManager.requestConnectionPriority(peripheralId, 1);
                    let mtu = await BleManager.requestMTU(peripheralId, 255);
                    console.log('MTU:', mtu)
                }
            });

            sampleToSaveRef.current = [];
            displaySamplesRef.current = [];
            allSamplesRef.current = [];
            notificationCountRef.current = 0;
            setDisplaySamples([]);

            return () => {
                bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic')
                task.cancel();
            };
        }, [])
    );

    const handleDataAcquisitionNotifications = ({ value, peripheral, characteristic, service }: any) => {
        if (characteristic.toLocaleLowerCase() === DATA_CHAR_UUID.toLocaleLowerCase() && value.length > 1) {
            notificationCountRef.current += 1;
            notificationLengthRef.current = value.length;

            const byteArray = new Uint8Array(value);
            const dataView = new DataView(byteArray.buffer);
            let samples: DataChart[] = [];
            let newSavedSamples: string[] = [];

            // Parse 16-bit signed samples
            for (let i = 0; i + 1 < byteArray.length; i += 2) {
                const signed16 = dataView.getInt16(i, true); // little endian
                samples.push({
                    x: (allSamplesRef.current.length + samples.length).toString(),
                    y: signed16,
                });
            }

            // Format 32-bit hex samples (combine 2 x 16-bit)
            for (let i = 0; i + 3 < byteArray.length; i += 4) {
                const hex1 = byteArray[i].toString(16).padStart(2, '0');
                const hex2 = byteArray[i + 1].toString(16).padStart(2, '0');
                const hex3 = byteArray[i + 2].toString(16).padStart(2, '0');
                const hex4 = byteArray[i + 3].toString(16).padStart(2, '0');
                const hex32 = `0x${hex4}${hex3}${hex2}${hex1}`;
                newSavedSamples.push(hex32);
            }

            displaySamplesRef.current = [...displaySamplesRef.current, ...samples];
            allSamplesRef.current = [...allSamplesRef.current, ...samples];
            sampleToSaveRef.current.push(...newSavedSamples);

            if (displaySamplesRef.current.length > MAX_SAMPLES) {
                displaySamplesRef.current = displaySamplesRef.current.slice(-MAX_SAMPLES);
            }

            setDisplaySamples([...displaySamplesRef.current]);
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

    async function handleStartGettingData() {
        // Reset the chart
        // sampleToSaveRef.current = [];
        // displaySamplesRef.current = [];
        // setDisplaySamples([]);
        // notificationCountRef.current = 0;

        setIsRunning(true);
        // Enable notifications
        await BleManager.startNotification(peripheralId, SERVICE_UUID, DATA_CHAR_UUID);

        BleManager.write(peripheralId, SERVICE_UUID, NOTIFY_CHAR_UUID, [1], 1);
    };

    async function handleStopGettingData() {

        setIsRunning(false);

        await BleManager.write(peripheralId, SERVICE_UUID, NOTIFY_CHAR_UUID, [0], 1);

        // Disable notifications
        BleManager.stopNotification(peripheralId, SERVICE_UUID, DATA_CHAR_UUID);

        setDisplaySamples(allSamplesRef.current);
        Alert.alert('Collected Data',
            `Notification Length: ${notificationLengthRef.current} \nNo. of notification received: ${notificationCountRef.current} \nLoss: ${notificationCountRef.current * notificationLengthRef.current / 4 - sampleToSaveRef.current.length}`)

    };

    const exportData = () => {
        let text = sampleToSaveRef.current.map((receivedSample) => {
            return `${receivedSample} `;
        }).join('\n');
        console.log('notificationCountRef:', notificationCountRef.current)
        console.log('saved:', sampleToSaveRef.current.length)
        console.log('loss:', notificationCountRef.current * notificationLengthRef.current / 4 - sampleToSaveRef.current.length)
        downloadDataToLocalStorage(text, 'ADC_Output.txt', 'text/plain');
    }

    const Chart = () => {
        return (
            <View style={styles.chartWrapper}>
                <View style={styles.chartHeader}>
                    <Text style={{ fontSize: 12 / fontScale, fontWeight: 'bold' }}>ADC Output</Text>
                    <View style={{ flex: 1 }} />

                </View>
                <LineChart
                    style={styles.chart}
                    data={getChartData(displayedSamples)}
                    chartDescription={{ text: '' }}
                    xAxis={getLabelsXAxis(displayedSamples)}
                    yAxis={chartConfig.yAxis}
                    legend={chartConfig.legend}
                    marker={chartConfig.markerConfig}
                    {...chartConfig.config}
                />
                <Text style={{ alignSelf: 'center', fontSize: 12 / fontScale, fontWeight: 'bold' }}>No. of Samples</Text>
            </View>
        );
    };

    function getChartData(data: DataChart[]) {
        const formattedData = data.map((data, index) => ({
            x: index,
            y: data.y,
        }));
        return {
            dataSets: [{
                label: 'ADC Output',
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

    return (
        <SafeAreaView style={[styles.container]} edges={['left', 'right', 'bottom']}>
            <View style={{ flex: 1, backgroundColor: Colors.lightGray }}>
                {/* Play and stop Buttons */}
                <View style={[styles.buttonsContainer]}>
                    <View style={[styles.buttonWrapper]}>

                        <TouchableOpacity
                            style={[styles.platStopButton, styles.shadow, { opacity: isRunning ? 0.3 : 1 }]}
                            onPress={handleStartGettingData}
                            disabled={isRunning}
                        >
                            <Icon name="play" size={18} color="#fff" type='font-awesome-5' />

                        </TouchableOpacity>
                        <Text style={[styles.startStopButtonText, { opacity: isRunning ? 0.3 : 1 }]}>Start</Text>

                    </View>
                    <View style={[styles.buttonWrapper]}>

                        <TouchableOpacity
                            style={[styles.platStopButton, styles.shadow, { opacity: !isRunning ? 0.3 : 1 }]}
                            onPress={handleStopGettingData}
                            disabled={!isRunning}

                        >
                            <Icon name="stop" size={18} color="#fff" type='font-awesome-5' />

                        </TouchableOpacity>
                        <Text style={[styles.startStopButtonText, { opacity: !isRunning ? 0.3 : 1 }]}>Stop</Text>
                    </View>
                </View>
                {/* Classification Box */}
                <View style={[styles.chartContainer]}>
                    {displayedSamples.length > 0 && Chart()}
                    {!(displayedSamples.length > 0) && (
                        <Text style={{ fontSize: 16, textAlign: 'center' }}>
                            Click on "Start" to begin data acquisition
                        </Text>
                    )}
                </View>

            </View>

            <TouchableOpacity
                style={[styles.button, styles.shadow, { opacity: (displayedSamples.length === 0 || isRunning) ? 0.3 : 1 }]}
                onPress={exportData}
                disabled={displayedSamples.length === 0 || isRunning}
            >
                <Text style={[styles.buttonText]}>Export Data</Text>
            </TouchableOpacity>
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    chartContainer: {
        flex: 1,
        borderRadius: 15,
        padding: 20,
        backgroundColor: 'white',
        marginVertical: 20
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
    buttonWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 10,
        backgroundColor: Colors.lightGray
    },
    buttonsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.lightGray,
        justifyContent: 'space-evenly',
    },
    startStopButtonText: {
        color: Colors.gray,
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 5
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5, // Adds shadow for Android
    },
    platStopButton: {
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
        paddingVertical: 20,
        justifyContent: 'flex-start',
        backgroundColor: Colors.lightGray,
    },
    chart: {
        width: '100%',
        flex: 1,
        height: 200,
        marginBottom: 5
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        paddingHorizontal: 20,
        borderRadius: 30,
        backgroundColor: Colors.blue,
        alignSelf: 'center',
    },
});

export default DataAcquisitionServiceScreen;
