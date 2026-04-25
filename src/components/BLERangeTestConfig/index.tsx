import { StyleSheet, TextInput, Platform, KeyboardAvoidingView, ScrollView, EventSubscription, InteractionManager, PermissionsAndroid } from 'react-native';
import Colors from '../../constants/Colors';
import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity } from '../Themed';
import { useNavigation } from '@react-navigation/native';
import { EvilIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import BleManager from 'react-native-ble-manager';
import { convertStringToByteArray } from '../../hooks/convert';
import { Buffer } from 'buffer';
import { Dropdown } from 'react-native-element-dropdown';
import { useBleRangeContext } from '../../context/RangeTestContext';
import { Snackbar } from 'react-native-paper';
import { TI_TERMINAL_SERVICE } from '../../constants/uuids';
import { ActivityIndicator } from 'react-native-paper';
import Geolocation from 'react-native-geolocation-service';

interface Props {
    peripheralId: string;
}
const RX = 0
const TX = 1

const TestModeOptions =
    [
        { label: 'RX', value: RX },
        { label: 'TX', value: TX },
    ]

const DEFAULT_PHY_ID_OPTIONS =
    [
        { label: 'WiSUN Mode #2b (#default)', value: 0 },
        { label: 'WiSUN Mode #4b ', value: 1 },
        { label: 'OFDM WiSUN Option 2 MCS 3', value: 2 },
        { label: 'OFDM WiSUN Option 2 MCS 4', value: 3 },
        { label: 'OFDM WiSUN Option 2 MCS 5', value: 4 },
        { label: 'OFDM WiSUN Option 2 MCS 6', value: 5 },
        { label: 'OFDM WiSUN Option 3 MCS 4', value: 6 },
        { label: 'OFDM WiSUN Option 3 MCS 5', value: 7 },
        { label: 'OFDM WiSUN Option 3 MCS 6', value: 8 },
        { label: 'OFDM WiSUN Option 4 MCS 4', value: 9 },
        { label: 'OFDM WiSUN Option 4 MCS 5', value: 10 },
        { label: 'OFDM WiSUN Option 4 MCS 6', value: 11 },
    ]

const TxPowerOptions =
    [
        { label: '10 dbm', value: '10' },
        { label: '9 dbm', value: '9' },
        { label: '8 dbm', value: '8' },
        { label: '7 dbm', value: '7' },
        { label: '6 dbm', value: '6' },
        { label: '5 dbm', value: '5' },
        { label: '4 dbm', value: '4' },
        { label: '3 dbm', value: '3' },
        { label: '2 dbm', value: '2' },
        { label: '1 dbm', value: '1' },
        { label: '0 dbm', value: '0' },
        { label: '-1 dbm', value: '-1' },
        { label: '-2 dbm', value: '-2' },
        { label: '-3 dbm', value: '-3' },
        { label: '-4 dbm', value: '-4' },
        { label: '-5 dbm', value: '-5' },
        { label: '-6 dbm', value: '-6' },
        { label: '-7 dbm', value: '-7' },
        { label: '-8 dbm', value: '-8' },
        { label: '-9 dbm', value: '-9' },
        { label: '-10 dbm', value: '-10' },
        { label: '-11 dbm', value: '-11' },
        { label: '-12 dbm', value: '-12' },
        { label: '-13 dbm', value: '-13' },
        { label: '-14 dbm', value: '-14' },
        { label: '-15 dbm', value: '-15' },
    ]

const BLERangeTestConfig: React.FC<Props> = ({ peripheralId }) => {

    const navigation = useNavigation();
    const phyValuesSubscription = useRef<EventSubscription | null>(null);

    const { targetLocationContext, updateTargetLocation } = useBleRangeContext();

    const [phyInput, setPhyInput] = useState<number>(0);
    const [txPowerInput, setTxPowerInput] = useState<string>('');
    const [frequencyInput, setFrequencyInput] = useState<string>('');
    const [targetLatitude, setTargetLatitude] = useState<string>('');
    const [targetLongitude, setTargetLongitude] = useState<string>('');
    const [numberOfPacketsInput, setNumberOfPackets] = useState<string>('');
    const [packetsLenInput, setPacketsLen] = useState<string>('');
    const [testMode, setTestMode] = useState<number>();
    const [visibleSnackBar, setVisibleSnackBar] = useState(false);
    const [snackBarData, setSnackBarData] = useState<{ message: string, color: string }>({ message: '', color: "white" });
    const [phyIdOptions, setPhyIdOptions] = useState<{ label: string, value: number }[]>(DEFAULT_PHY_ID_OPTIONS);
    const [isLoading, setIsLoading] = useState(true);
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    const phyIdResponseBuffer = useRef<string>('');
    const phyIdResponseTimeout = useRef<NodeJS.Timeout | null>(null);
    const phyOptionsLoaded = useRef<boolean>(false);
    const phyLoadTimeout = useRef<NodeJS.Timeout | null>(null);

    const successColor = "#00FF91"
    const failureColor = "#FF5F5F"

    const PhyIdUUID = 'f202'
    const FrequencyUUID = 'f203'
    const PacketNumUUID = 'f204'
    const PacketLenUUID = 'f205'
    const OutputPowerUUID = 'f206'
    const TestModeUUID = 'f207'

    const ServiceUuid = 'f200'

    useEffect(() => {

        const task = InteractionManager.runAfterInteractions(async () => {
            // Set up notification listener for data_out_char
            phyValuesSubscription.current = BleManager.onDidUpdateValueForCharacteristic(handlePhyIdNotification);

            // Start notifications on data_out_char
            try {
                await BleManager.startNotification(peripheralId, TI_TERMINAL_SERVICE.uuid, TI_TERMINAL_SERVICE.data_out_char);
                console.log('Started notifications on data_out_char');

                // First, get available PHY IDs
                await getAvailablePhyIds();

                // Set a timeout in case PHY response never comes
                phyLoadTimeout.current = setTimeout(() => {
                    if (!phyOptionsLoaded.current) {
                        console.log('PHY load timeout - proceeding with defaults');
                        setPhyIdOptions(DEFAULT_PHY_ID_OPTIONS);
                        stopPhyIdNotifications();
                        loadCurrentConfig();
                    }
                }, 5000); // 5 second timeout

            } catch (error) {
                console.error('Failed to start notifications:', error);
                showSnackBar("Failed to start notifications: " + error, failureColor);
                setIsLoading(false);
            }
        });

        return () => {
            task.cancel();

            // Clear timeouts if exist
            if (phyIdResponseTimeout.current) {
                clearTimeout(phyIdResponseTimeout.current);
            }
            if (phyLoadTimeout.current) {
                clearTimeout(phyLoadTimeout.current);
            }

            phyValuesSubscription.current?.remove();
            BleManager.stopNotification(peripheralId, TI_TERMINAL_SERVICE.uuid, TI_TERMINAL_SERVICE.data_out_char)
                .catch((error) => console.error('Failed to stop notifications:', error));
        }

    }, []);

    useEffect(() => {
        if (targetLocationContext) {
            setTargetLatitude(targetLocationContext.latitude.toString())
            setTargetLongitude(targetLocationContext.longitude.toString())
        }
    }, [targetLocationContext])


    const handlePhyIdNotification = ({ value, characteristic }: any) => {
        if (characteristic.toLowerCase() === TI_TERMINAL_SERVICE.data_out_char.toLowerCase() && value) {
            try {
                const notificationData = Buffer.from(value);
                // Try to decode as UTF-8
                let responseText: string;
                try {
                    responseText = notificationData.toString('utf8');
                    // Verify it's valid UTF-8 by checking for replacement characters
                    if (responseText.includes('\uFFFD')) {
                        throw new Error('Invalid UTF-8 sequence detected');
                    }
                } catch (utf8Error) {
                    console.error('Failed to decode notification as UTF-8:', utf8Error);
                    showSnackBar("Failed to decode PHY data: Invalid format", failureColor);
                    setPhyIdOptions(DEFAULT_PHY_ID_OPTIONS);
                    phyIdResponseBuffer.current = '';
                    if (phyIdResponseTimeout.current) {
                        clearTimeout(phyIdResponseTimeout.current);
                    }
                    return;
                }

                // Clean the response by removing non-printable characters except newlines
                responseText = responseText.replace(/[^\x20-\x7E\n\r]/g, '');

                // Accumulate the response
                phyIdResponseBuffer.current += responseText;

                // Clear existing timeout
                if (phyIdResponseTimeout.current) {
                    clearTimeout(phyIdResponseTimeout.current);
                }

                // Set a new timeout - parse after no new data for 500ms
                phyIdResponseTimeout.current = setTimeout(() => {
                    const completeResponse = phyIdResponseBuffer.current;
                    console.log('Complete PHY ID response:', completeResponse);
                    parsePhyIdResponse(completeResponse);

                    // Reset buffer
                    phyIdResponseBuffer.current = '';
                }, 500); // Wait 500ms after last chunk

            } catch (error) {
                console.error('Error handling PHY ID notification:', error);
                showSnackBar("Error processing PHY data", failureColor);
                setPhyIdOptions(DEFAULT_PHY_ID_OPTIONS);
            }
        }
    };

    const stopPhyIdNotifications = () => {
        phyValuesSubscription.current?.remove();
        BleManager.stopNotification(peripheralId, TI_TERMINAL_SERVICE.uuid, TI_TERMINAL_SERVICE.data_out_char)
            .then(() => console.log('Stopped PHY ID notifications'))
            .catch((error) => console.error('Failed to stop PHY ID notifications:', error));
    };

    const getCurrentConfig = async () => {
        try {
            const phy = await BleManager.read(peripheralId, ServiceUuid, PhyIdUUID);
            setPhyInput(Buffer.from(phy).readInt8());

            const txPower = await BleManager.read(peripheralId, ServiceUuid, OutputPowerUUID);
            setTxPowerInput(Buffer.from(txPower).toString('utf8'));

            const frequency = await BleManager.read(peripheralId, ServiceUuid, FrequencyUUID);
            setFrequencyInput(Buffer.from(frequency).toString('utf8'));

            const testMode = await BleManager.read(peripheralId, ServiceUuid, TestModeUUID);
            setTestMode(Buffer.from(testMode).readInt8());

            const packetsLen = await BleManager.read(peripheralId, ServiceUuid, PacketLenUUID);
            setPacketsLen(Buffer.from(packetsLen).toString('utf8'));

            const numOfPackets = await BleManager.read(peripheralId, ServiceUuid, PacketNumUUID);
            setNumberOfPackets(Buffer.from(numOfPackets).toString('utf8'));

        } catch (e) {
            showSnackBar("Getting configuration failed: " + e, failureColor)
        }
    }

    const loadCurrentConfig = async () => {
        try {
            await getCurrentConfig();
            showSnackBar("Configuration loaded successfully", successColor);
        } catch (e) {
            console.error('Error loading current config:', e);
        } finally {
            setIsLoading(false);
        }
    }

    const parsePhyIdResponse = async (response: string) => {
        try {
            // Parse the response to extract PHY entries
            // Expected format: "PHY <value>: <description>\nPHY <value>: <description>\n..."
            const phyLines = response.split('\n').filter(line => line.trim().startsWith('PHY'));
            if (phyLines.length === 0) {
                console.log('No PHY entries found in response');
                setPhyIdOptions(DEFAULT_PHY_ID_OPTIONS);
                stopPhyIdNotifications();
                // Continue to load current config even if PHY parsing failed
                await loadCurrentConfig();
                return;
            }

            const phyIds = phyLines.map(line => {
                // Extract PHY value and description
                // Format: "PHY <value>: <description>"
                const match = line.match(/PHY\s+(\d+):\s*(.+)/);
                if (match) {
                    const phyValue = parseInt(match[1], 10);
                    let description = match[2].trim();

                    // Clean up the description - remove "Available ONLY ON TRX CC1407:" prefix if present
                    description = description.replace(/Available ONLY ON TRX CC\d+:\s*/i, '');

                    // Remove PhySettings and other metadata
                    description = description.replace(/,\s*PhySettings_.*/i, '');
                    description = description.replace(/,\s*PhySettings.*/i, '');

                    return {
                        label: `PHY ${phyValue}: ${description}`,
                        value: phyValue
                    };
                }
                return null;
            }).filter((item): item is { label: string, value: number } => item !== null);

            if (phyIds.length > 0) {
                console.log('Parsed PHY IDs:', phyIds);
                setPhyIdOptions(phyIds);
            } else {
                console.log('Failed to parse PHY IDs, using defaults');
                setPhyIdOptions(DEFAULT_PHY_ID_OPTIONS);
            }

            // Stop notifications after processing PHY data
            stopPhyIdNotifications();

            // Mark PHY options as loaded and proceed to get current config
            phyOptionsLoaded.current = true;

            // Clear the timeout since we got the response
            if (phyLoadTimeout.current) {
                clearTimeout(phyLoadTimeout.current);
            }

            await loadCurrentConfig();

        } catch (error) {
            console.error('Error parsing PHY ID response:', error);
            showSnackBar("Error parsing PHY configurations", failureColor);
            // Fall back to default options if parsing fails
            setPhyIdOptions(DEFAULT_PHY_ID_OPTIONS);
            stopPhyIdNotifications();

            // Clear the timeout since we're handling the error
            if (phyLoadTimeout.current) {
                clearTimeout(phyLoadTimeout.current);
            }

            // Continue to load current config even if PHY parsing failed
            await loadCurrentConfig();
        }
    };

    async function getAvailablePhyIds() {
        try {
            const writeCommand = "ATPPN?";
            const writeBytes = convertStringToByteArray(writeCommand);

            console.log('Requesting available PHY IDs with command:', writeCommand);
            await BleManager.write(
                peripheralId,
                TI_TERMINAL_SERVICE.uuid,
                TI_TERMINAL_SERVICE.data_in_char,
                Array.from(writeBytes),
                writeBytes.length
            );
            console.log('PHY ID request sent successfully');
        } catch (error) {
            console.error('Failed to request PHY IDs:', error);
            showSnackBar("Failed to get available PHY IDs: " + error, failureColor);
        }
    }

    async function handleConfig() {
        showSnackBar("Applying configuration...", "white")

        try {
            let writeByteArray: number[] = []
            let writeBytes = Array.from(writeByteArray);

            // config phy
            if (phyInput != undefined) {
                writeByteArray = [phyInput]
                writeBytes = Array.from(writeByteArray);

                try {
                    console.log('write phy:', writeBytes, 'to characteristic:', PhyIdUUID)
                    await BleManager.write(peripheralId, ServiceUuid, PhyIdUUID, writeBytes, writeBytes.length);
                    console.log('write phy: succeed')
                }
                catch (err) {
                    console.error('write phy failed:', err);
                    showSnackBar("Failed to write PHY: " + err, failureColor);
                    return;
                }
            }

            // config tx power
            if (testMode == TX) {
                if (txPowerInput != '' && txPowerInput != undefined) {
                    writeByteArray = convertStringToByteArray(txPowerInput);
                    writeBytes = Array.from(writeByteArray);
                    try {
                        console.log('write tx power:', writeBytes, 'to characteristic:', OutputPowerUUID)
                        await BleManager.write(peripheralId, ServiceUuid, OutputPowerUUID, writeBytes, writeBytes.length);
                        console.log('write tx power: succeed')
                    }
                    catch (err) {
                        console.error('write tx power failed:', err);
                        showSnackBar("Failed to write TX power: " + err, failureColor);
                        return;
                    }
                }

                // config num of packets
                if (numberOfPacketsInput != '' && numberOfPacketsInput != undefined) {
                    writeByteArray = convertStringToByteArray(numberOfPacketsInput);
                    writeBytes = Array.from(writeByteArray);
                    try {
                        console.log('write numberOfPacketsInput:', writeBytes, 'to characteristic:', PacketNumUUID)
                        await BleManager.write(peripheralId, ServiceUuid, PacketNumUUID, writeBytes, writeBytes.length);
                        console.log('write numberOfPacketsInput: succeed')
                    }
                    catch (err) {
                        console.error('write numberOfPacketsInput failed:', err);
                        showSnackBar("Failed to write number of packets: " + err, failureColor);
                        return;
                    }
                }

                // config packets length
                if (packetsLenInput != '' && packetsLenInput != undefined) {
                    writeByteArray = convertStringToByteArray(packetsLenInput);
                    writeBytes = Array.from(writeByteArray);
                    try {
                        console.log('write packetsLenInput:', packetsLenInput, 'to characteristic:', PacketLenUUID)
                        await BleManager.write(peripheralId, ServiceUuid, PacketLenUUID, writeBytes, writeBytes.length);
                        console.log('write packetsLenInput: succeed')
                    }
                    catch (err) {
                        console.error('write packetsLenInput failed:', err);
                        showSnackBar("Failed to write packet length: " + err, failureColor);
                        return;
                    }
                }

            }

            // config frequency
            if (frequencyInput != '' && packetsLenInput != undefined) {
                writeByteArray = convertStringToByteArray(frequencyInput);
                writeBytes = Array.from(writeByteArray);
                try {
                    console.log('write frequency:', frequencyInput, 'to characteristic:', FrequencyUUID)
                    await BleManager.write(peripheralId, ServiceUuid, FrequencyUUID, writeBytes, writeBytes.length);
                    console.log('write frequency: succeed')
                }
                catch (err) {
                    console.error('write frequency failed:', err);
                    showSnackBar("Failed to write frequency: " + err, failureColor);
                    return;
                }
            }

            // config test mode
            if (testMode != undefined) {
                writeByteArray = [testMode]
                console.log(writeByteArray)

                writeBytes = Array.from(writeByteArray);

                try {
                    console.log('write testMode:', writeBytes, 'to characteristic:', TestModeUUID)
                    await BleManager.write(peripheralId, ServiceUuid, TestModeUUID, writeBytes, writeBytes.length);
                    console.log('write testMode: succeed')
                }
                catch (err) {
                    console.error('write testMode failed:', err);
                    showSnackBar("Failed to write test mode: " + err, failureColor);
                    return;
                }
            }

            // target distance
            updateTargetLocation(
                parseFloat(targetLatitude || "0"), parseFloat(targetLongitude || "0")
            )
            showSnackBar("Configuration done!", successColor)
            //  get current config
            getCurrentConfig()

        } catch (error) {
            console.error('Configuration error:', error);
            showSnackBar("Configuration failed: " + error, failureColor);
        }
    }

    function onCancel() {
        navigation.goBack();
    }

    const showSnackBar = (message: string, color: string) => {
        setVisibleSnackBar(true);
        setSnackBarData({
            message: message,
            color: color
        })
    };

    const closeSnackBar = () => setVisibleSnackBar(false);

    const requestLocationPermission = async (): Promise<boolean> => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: 'Location Permission',
                        message: 'This app needs access to your location to populate GPS coordinates.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.error('Permission request error:', err);
                return false;
            }
        } else if (Platform.OS === 'ios') {
            try {
                const status = await Geolocation.requestAuthorization('whenInUse');
                return status === 'granted';
            } catch (err) {
                console.error('iOS permission request error:', err);
                return false;
            }
        }
        return false;
    };

    const getCurrentLocation = async () => {
        setIsGettingLocation(true);
        showSnackBar("Getting current location...", "white");

        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
            showSnackBar("Location permission denied", failureColor);
            setIsGettingLocation(false);
            return;
        }

        Geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setTargetLatitude(latitude.toString());
                setTargetLongitude(longitude.toString());
                showSnackBar("Location updated successfully", successColor);
                setIsGettingLocation(false);
            },
            (error) => {
                console.error('Location error:', error);
                let errorMessage = "Failed to get location";
                switch (error.code) {
                    case 1:
                        errorMessage = "Location permission denied";
                        break;
                    case 2:
                        errorMessage = "Location unavailable";
                        break;
                    case 3:
                        errorMessage = "Location request timeout";
                        break;
                    default:
                        errorMessage = `Failed to get location: ${error.message}`;
                }
                showSnackBar(errorMessage, failureColor);
                setIsGettingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 10000,
            }
        );
    };

    return (
        <View style={{ backgroundColor: Colors.lightGray, flex: 1, }}>
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.blue} />
                        <Text style={styles.loadingText}>Initializing...</Text>
                    </View>
                </View>
            )}
            <KeyboardAvoidingView style={[styles.container]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={{ backgroundColor: Colors.lightGray, marginBottom: 20 }}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="cog" size={28} style={styles.icon} />
                        <Text style={styles.sectionTitle} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Config Parameters</Text>
                    </View>
                </View>
                <ScrollView style={{ flex: 1 }}>
                    {/* Content */}
                    <View style={{ backgroundColor: Colors.lightGray, flex: 1, }}>
                        {/* Test Mode */}
                        <Text style={[styles.title]} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Test Mode</Text>
                        <View style={[styles.optionBox]}>
                            <Dropdown
                                style={[styles.dropdown]}
                                placeholderStyle={styles.placeholderStyle}
                                selectedTextStyle={styles.selectedTextStyle}
                                data={TestModeOptions}
                                placeholder='Select Test Mode'
                                value={testMode}
                                onChange={(v: any) => {
                                    setTestMode(v.value);
                                }}
                                labelField="label"
                                valueField="value"
                                itemTestIDField="label"
                                itemAccessibilityLabelField="label"
                            />
                        </View>

                        {/* PHY */}
                        <Text style={[styles.title]} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>PHY ID</Text>
                        <View style={[styles.optionBox]}>
                            <Dropdown
                                style={[styles.dropdown]}
                                placeholderStyle={styles.placeholderStyle}
                                selectedTextStyle={styles.selectedTextStyle}
                                data={phyIdOptions}
                                placeholder='Choose PHY'
                                value={phyInput}
                                onChange={(v: any) => {
                                    setPhyInput(v.value);
                                }}
                                labelField="label"
                                valueField="value"
                                itemTestIDField="label"
                                itemAccessibilityLabelField="label"
                            />
                        </View>

                        {/* TX Power */}
                        {testMode == TX && (
                            <>
                                <Text style={[styles.title]} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>TX Power</Text>
                                <View style={[styles.optionBox]}>
                                    <Dropdown
                                        style={[styles.dropdown]}
                                        placeholderStyle={styles.placeholderStyle}
                                        selectedTextStyle={styles.selectedTextStyle}
                                        data={TxPowerOptions}
                                        placeholder='Choose TX Power'
                                        value={txPowerInput}
                                        onChange={(v: any) => {
                                            setTxPowerInput(v.value);
                                        }}
                                        labelField="label"
                                        valueField="value"
                                        itemTestIDField="label"
                                        itemAccessibilityLabelField="label"
                                    />
                                </View>

                                {/* Packets Length */}
                                <Text style={[styles.title]} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Packet Length</Text>
                                <View style={[styles.optionBox]}>
                                    <TextInput
                                        editable
                                        placeholderTextColor={Colors.gray}
                                        style={[styles.textInput]}
                                        placeholder="Enter packet Length"
                                        value={packetsLenInput}
                                        onChangeText={(value) => { setPacketsLen(value.trim()); }}
                                    />
                                </View>

                                {/* Number of Packets */}
                                <Text style={[styles.title]} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Number of Packets</Text>
                                <View style={[styles.optionBox]}>
                                    <TextInput
                                        editable
                                        placeholderTextColor={Colors.gray}
                                        style={[styles.textInput]}
                                        placeholder="Enter number of packets"
                                        value={numberOfPacketsInput}
                                        onChangeText={(value) => { setNumberOfPackets(value.trim()); }}
                                    />
                                </View>
                            </>
                        )}

                        {/* Frequency */}
                        <Text style={[styles.title]} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Frequency</Text>
                        <View style={[styles.optionBox]}>
                            <TextInput
                                editable
                                placeholderTextColor={Colors.gray}
                                style={[styles.textInput]}
                                placeholder="Enter Frequency"
                                value={frequencyInput}
                                onChangeText={(value) => { setFrequencyInput(value.trim()); }}
                            />
                        </View>

                        {/* Set Target Location */}
                        <View style={styles.targetLocationHeader}>
                            <Text style={[styles.title]} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Target Location</Text>
                            <TouchableOpacity
                                style={styles.locationButton}
                                onPress={getCurrentLocation}
                                disabled={isGettingLocation}
                            >
                                {isGettingLocation ? (
                                    <ActivityIndicator size="small" color={Colors.blue} />
                                ) : (
                                    <Ionicons name="location" size={20} color={Colors.blue} />
                                )}
                                <Text style={styles.locationButtonText}>
                                    {isGettingLocation ? 'Getting...' : 'Use Phone Location'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.targetLocationContainer}>
                            {/* Latitude Input */}
                            <View style={styles.targetInputGroup}>
                                <Text style={styles.label}>Latitude</Text>
                                <TextInput
                                    editable
                                    placeholderTextColor={Colors.gray}
                                    style={[styles.textInput, { marginRight: 5 }]}
                                    placeholder="e.g. 61.55xxxxx"
                                    value={targetLatitude}
                                    onChangeText={(value) => {
                                        setTargetLatitude(value)
                                    }}
                                    keyboardType="numeric"
                                />
                            </View>

                            {/* Longitude Input */}
                            <View style={styles.targetInputGroup}>
                                <Text style={styles.label}>Longitude</Text>
                                <TextInput
                                    editable
                                    placeholderTextColor={Colors.gray}
                                    style={[styles.textInput, { marginLeft: 5 }]}
                                    placeholder="e.g. 9.39xxxxx"
                                    value={targetLongitude}
                                    onChangeText={(value) => {
                                        setTargetLongitude(value)
                                    }}
                                    keyboardType="numeric"
                                />
                            </View>

                        </View>
                        <Text style={styles.helperText}>
                            Coordinates must be in decimal format
                        </Text>
                    </View>


                </ScrollView>
                {/* Action Buttons */}
                <View style={[styles.actionButtons]}>
                    <TouchableOpacity style={styles.buttonWrapper} onPress={onCancel}>
                        <Text style={{ color: Colors.blue, fontSize: 18 }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.buttonWrapper]}
                        onPress={handleConfig}
                    >
                        <Text style={{ color: Colors.blue, fontSize: 18 }}>Config</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            <Snackbar
                visible={visibleSnackBar}
                onDismiss={closeSnackBar}
                duration={5000}
                style={{ backgroundColor: 'black' }}
                elevation={5}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'black' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'black' }}>
                        <FontAwesome5 name={"info-circle"} size={20} color={snackBarData.color} />
                        <Text allowFontScaling adjustsFontSizeToFit numberOfLines={3} style={{ marginLeft: 8, color: snackBarData.color, fontWeight: 'bold' }}>{snackBarData.message}</Text>
                    </View>
                    <TouchableOpacity onPress={closeSnackBar}>
                        <EvilIcons name="close" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </Snackbar>

        </View >
    );
};

const styles = StyleSheet.create({
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingContainer: {
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 15,
        alignItems: 'center',
        minWidth: 200,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: 'black',
        fontWeight: '500',
    },
    helperText: {
        fontSize: 12,
        color: Colors.gray,
        marginTop: 4,
    },
    dropdown: {
        alignContent: 'center',
        alignSelf: 'center',
        width: '100%',
        color: 'black',
        borderRadius: 10,
        padding: 8,
        flex: 1,
        backgroundColor: 'white',
        fontSize: 14,
        elevation: 2,
        shadowOpacity: 0.5,
        shadowRadius: 0,
        shadowColor: 'rgba(0,0,0,0.4)',
        shadowOffset: {
            height: 1,
            width: 0,
        },
    },
    placeholderStyle: {
        color: Colors.gray,
        fontSize: 14,
    },
    selectedTextStyle: {
        fontSize: 14,
        color: 'black',
    },
    actionButtons: {
        flexDirection: 'row',
        backgroundColor: Colors.lightGray,
        justifyContent: 'space-evenly',
        marginBottom: 40
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '600',
        flex: 1,
    },
    optionBox: {
        backgroundColor: Colors.lightGray,
        height: 40,
        marginTop: 5,
        marginBottom: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.lightGray,
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
    },
    targetLocationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.lightGray,
        marginBottom: 5,
    },
    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.lightGray,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        gap: 4,
    },
    locationButtonText: {
        color: Colors.blue,
        fontSize: 14,
        fontWeight: '500',
    },
    targetLocationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 5,
        backgroundColor: Colors.lightGray
    },
    targetInputGroup: {
        flex: 1,
        backgroundColor: Colors.lightGray,
    },
    label: {
        fontSize: 14,
        fontWeight: '400',
        marginBottom: 5,
        color: 'black',
    },
    textInput: {
        borderColor: 'gray',
        borderRadius: 10,
        padding: 8,
        flex: 1,
        backgroundColor: 'white',
        fontSize: 14,
        elevation: 2,
        shadowOpacity: 0.5,
        shadowRadius: 0,
        shadowColor: 'rgba(0,0,0,0.4)',
        shadowOffset: {
            height: 1,
            width: 0,
        },
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 20,
        justifyContent: 'flex-start',
        backgroundColor: Colors.lightGray,
    },
    buttonWrapper: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    icon: {
        marginRight: 10,
    },
});

export default BLERangeTestConfig;
