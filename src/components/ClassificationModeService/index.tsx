import { StyleSheet, Platform, InteractionManager, NativeModules, NativeEventEmitter, FlatList } from 'react-native';
import Colors from '../../constants/Colors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from '../../components/Themed';
import { useFocusEffect } from '@react-navigation/native';
import BleManager from 'react-native-ble-manager';
import { Buffer } from 'buffer';
import { Icon } from '@rneui/base';

interface Props {
    peripheralId: string;
}

const ClassificationModeServiceScreen: React.FC<Props> = ({ peripheralId }) => {

    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

    const [labels, setLabels] = useState<string[]>([]);
    const [confidenceScore, setConfidenceScore] = useState<string>("");
    const [detectedLabel, setDetectedLabel] = useState<string>("");
    const [isRunning, setIsRunning] = useState<boolean>();

    const receivedData = useRef<string>("");
    const numberOfLabels = useRef<number>(0);
    const currentLabels = useRef<string[]>([]);
    const detectedLabelRef = useRef<string>("");
    const confidenceScoreRef = useRef<string>("");

    const SERVICE_UUID = 'f000ee00-0451-4000-b000-000000000000'
    const WRITE_UUID = 'f000ee01-0451-4000-b000-000000000000'
    const CLASSIFICATION_CHAR = 'f000ee02-0451-4000-b000-000000000000'
    const RESULT_CHAR = 'f000ee03-0451-4000-b000-000000000000'

    const numColumns = 4; // Number of labels per row (adjust as needed)

    useFocusEffect(
        useCallback(() => {
            const task = InteractionManager.runAfterInteractions(async () => {
                bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleClassificationNotifications);

                /* Set the MTU Size - Android only API 21+, iOS initiates an MTU exchange automatically upon connection */
                if (Platform.OS === 'android') {
                    await BleManager.requestConnectionPriority(peripheralId, 1);
                    let mtu = await BleManager.requestMTU(peripheralId, 255);
                    console.log('MTU:', mtu)
                }
            });

            receivedData.current = "";
            currentLabels.current = [];
            numberOfLabels.current = 0;

            // handleGetClassificationLabels();

            return () => {
                bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
                BleManager.stopNotification(peripheralId, SERVICE_UUID, CLASSIFICATION_CHAR);
                BleManager.stopNotification(peripheralId, SERVICE_UUID, RESULT_CHAR);
                task.cancel();
            };
        }, [])
    );

    useEffect(() => {
        setLabels([...currentLabels.current])
    }, [currentLabels.current]);

    useEffect(() => {
        setConfidenceScore(confidenceScoreRef.current);
        setDetectedLabel(detectedLabelRef.current);
    }, [confidenceScoreRef.current, detectedLabelRef.current]);

    const handleClassificationNotifications =
        ({ value, peripheral, characteristic, service }: any) => {

            if (characteristic.toLocaleLowerCase() === CLASSIFICATION_CHAR.toLocaleLowerCase() && value) {

                // Ignore unexpected extra notification
                if (value == 0x1) { return }

                // Convert the value to string
                let chunk = Buffer.from(value).toString('utf8');

                // If this is the first notification then extract the number of labels.
                if (receivedData.current == "") {
                    const firstPipeIndex = chunk.indexOf('|');
                    numberOfLabels.current = parseInt(chunk.substring(0, firstPipeIndex), 10);
                    console.log("Number of labels:", numberOfLabels.current);

                    // Remove label count part
                    chunk = chunk.substring(firstPipeIndex + 1);
                }

                receivedData.current = receivedData.current + chunk;

                // If this is the last notification
                let labels = receivedData.current.split('|');
                // Ignore the last part since the notification string ends with |
                labels.pop();

                if (labels.length == numberOfLabels.current) {

                    numberOfLabels.current = 0;
                    receivedData.current = "";
                    currentLabels.current = labels

                    // Disable notifications
                    BleManager.stopNotification(peripheralId, SERVICE_UUID, CLASSIFICATION_CHAR);
                    setLabels([...labels, ...labels]); // Use spread to trigger re-render

                    console.log("Labels:", currentLabels.current);
                }

            }

            else if (characteristic.toLocaleLowerCase() === RESULT_CHAR.toLocaleLowerCase() && value.length >= 2) {
                // Extract the first byte (class ID) and second byte (confidence score)
                const classId = value[0]; // First byte
                const confidenceScore = value[1]; // Second byte (percentage 0-100)

                console.log(`Inference Result - Class ID: ${classId}, Confidence: ${confidenceScore}%`);

                // Map class ID to a label (modify as needed)
                const detectedClass = currentLabels.current[classId - 1] || "Unknown";

                console.log("Inference Result", `Detected: ${detectedClass}\nConfidence: ${confidenceScore}%`);
                detectedLabelRef.current = detectedClass;
                confidenceScoreRef.current = confidenceScore;
                setDetectedLabel(detectedClass);
                setConfidenceScore(confidenceScore);
            }

            else {
                console.log(`notification: ${value}, characteristic: ${characteristic}`);
            }
        }

    const chunkArray = (arr: string[], size: number) => {
        return arr.reduce((acc, _, i) =>
            (i % size ? acc[acc.length - 1].push(arr[i]) : acc.push([arr[i]]), acc),
            [] as string[][]);
    };

    async function handleGetClassificationLabels() {

        // Enable notifications
        BleManager.startNotification(peripheralId, SERVICE_UUID, CLASSIFICATION_CHAR);

        try {
            // Write byte `0x01` to the characteristic
            let writeBytes = [0x01]; // Explicit hex notation

            await BleManager.write(peripheralId, SERVICE_UUID, WRITE_UUID, writeBytes, writeBytes.length);
            console.log("Successfully wrote 0x01 to characteristic");
        }
        catch (err) {
            console.error('write failed:', err);
            return;
        }
    }

    async function handleStopInferenceResults() {
        // Disable notifications
        BleManager.stopNotification(peripheralId, SERVICE_UUID, RESULT_CHAR);
        console.log("Stopping RESULT_CHAR notifications");
        setIsRunning(false);
    }

    async function handleGetInferenceResults() {
        setIsRunning(true);
        // Enable notifications
        BleManager.startNotification(peripheralId, SERVICE_UUID, RESULT_CHAR);

        try {
            // Write byte `0x02` to the characteristic
            let writeBytes = [0x02]; // Explicit hex notation

            await BleManager.write(peripheralId, SERVICE_UUID, WRITE_UUID, writeBytes, writeBytes.length);
            console.log("Successfully wrote 0x02 to characteristic");
        }
        catch (err) {
            console.error('write failed:', err);
            return;
        }
    }

    const DisplayLabel = ({ label }: { label: string }) => {
        return (
            <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <View style={[styles.led, label == detectedLabel ? styles.ledOn : styles.ledOff]} />
                <Text style={{ flex: 1, marginVertical: 10, fontSize: 12, fontWeight: '500', alignSelf: 'center', textAlign: 'center' }}>{label}</Text>
            </View >
        );
    }

    return (
        <View style={[styles.container]}>
            <View style={{ flex: 1, backgroundColor: Colors.lightGray }}>
                {/* Play and stop Buttons */}
                <View style={[styles.buttonsContainer]}>
                    <View style={[styles.buttonWrapper]}>

                        <TouchableOpacity
                            style={[styles.platStopButton, styles.shadow, { opacity: isRunning || labels.length == 0 ? 0.3 : 1 }]}
                            onPress={handleGetInferenceResults}
                            disabled={isRunning}
                        >
                            <Icon name="play" size={18} color="#fff" type='font-awesome-5' />

                        </TouchableOpacity>
                        <Text style={[styles.startStopButtonText, { opacity: isRunning || labels.length == 0 ? 0.3 : 1 }]}>Get Results</Text>

                    </View>
                    <View style={[styles.buttonWrapper]}>

                        <TouchableOpacity
                            style={[styles.platStopButton, styles.shadow, { opacity: !isRunning ? 0.3 : 1 }]}
                            onPress={handleStopInferenceResults}
                            disabled={!isRunning}

                        >
                            <Icon name="stop" size={18} color="#fff" type='font-awesome-5' />

                        </TouchableOpacity>
                        <Text style={[styles.startStopButtonText, { opacity: !isRunning ? 0.3 : 1 }]}>Stop</Text>
                    </View>
                </View>
                {/* Inference Result View */}
                <View style={[styles.resultsBox]}>
                    <Text style={[styles.score]}>Confidence Score</Text>
                    <Text style={[styles.score, { fontWeight: 'bold' }]}>{confidenceScore ? confidenceScore + "%" : "N/A"}</Text>
                </View>

                {/* Classification Box */}
                <View style={[styles.classificationBox]}>
                    <FlatList
                        data={chunkArray(labels, numColumns)}
                        keyExtractor={(_, index) => index.toString()}
                        renderItem={({ item: row }) => (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', borderRadius: 15, padding: 10, flex: 1 }}>
                                {row.map((label, index) => (
                                    <DisplayLabel key={index} label={label} />
                                ))}
                            </View>
                        )}
                        ListEmptyComponent={<Text style={{ padding: 20 }}>No labels available! Click on "Get Class" to ask for labels.</Text>}
                    />

                </View>
            </View>
            {/* Get Button */}
            <TouchableOpacity
                style={[styles.button, styles.shadow, { opacity: isRunning ? 0.3 : 1 }]}
                onPress={handleGetClassificationLabels}
                disabled={isRunning}
            >
                <Text style={[styles.buttonText]}>Get Classes</Text>
            </TouchableOpacity>
        </View >
    );
};

const styles = StyleSheet.create({
    platStopButton: {
        backgroundColor: Colors.gray,
        borderRadius: 60,
        width: 65,
        height: 65,
        justifyContent: 'center',
        alignItems: 'center',
    },
    score: {
        fontSize: 25,
        fontWeight: '500',
    },
    led: {
        width: 45,
        height: 45,
        borderRadius: 50,
        marginTop: 15,
    },
    ledOn: {
        backgroundColor: Colors.primary,
        shadowColor: 'rgba(255, 0, 0, 1)', // Glow color
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
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
    classificationBox: {
        minHeight: 120,
        backgroundColor: 'white',
        borderRadius: 15,
        marginTop: 20,
        alignContent: 'center',
        justifyContent: 'center',
        flexShrink: 1
    },
    resultsBox: {
        minHeight: 80,
        backgroundColor: 'white',
        borderRadius: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        alignContent: 'center',
        alignItems: 'center'
    },
    buttonsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.lightGray,
        justifyContent: 'space-evenly',
        marginBottom: 20,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold'
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5, // Adds shadow for Android
    },
    button: {
        alignSelf: 'center',
        alignItems: 'center',
        padding: 10,
        borderRadius: 30,
        backgroundColor: Colors.gray,
        marginBottom: 20,
        marginTop: 20,
        width: '50%'
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 20,
        justifyContent: 'flex-start',
        backgroundColor: Colors.lightGray,
    },
    buttonWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        // marginHorizontal: 10,
        backgroundColor: Colors.lightGray
    },
    startStopButtonText: {
        color: Colors.gray,
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 5,
    },
});

export default ClassificationModeServiceScreen;
