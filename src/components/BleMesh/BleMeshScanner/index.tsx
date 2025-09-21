import { Text, TouchableOpacity } from '../../Themed';
import { StyleSheet, NativeModules, View, NativeEventEmitter, PermissionsAndroid, Platform, EmitterSubscription } from 'react-native';
import { useEffect, useState, } from 'react';
import { Icon, Skeleton } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { LogBox } from 'react-native';
import { callMeshModuleFunction, meshStyles } from '../meshUtils';
import { BleMeshScanScreenProps } from '../../../../types';
LogBox.ignoreLogs(['new NativeEventEmitter']);
import RNRestart from 'react-native-restart';
import { ScrollView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BearerSelectionModal } from './BearerSelectionModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props extends BleMeshScanScreenProps { };

interface ScanResult {
    name: string;
    id: string;
    identifier?: string;
    rssi: string;
    bearers: string[];
    lastSeen: number; // To insure the device is active
}

const BleMeshScanner: React.FC<Props> = ({ route }) => {

    const { MeshModule } = NativeModules;
    const { scanProvisionedNodes, unicastAddr } = route.params

    let navigation = useNavigation();
    const bleMeshEmitter = new NativeEventEmitter(MeshModule);

    const [scanResult, setScanResult] = useState<ScanResult[]>([]);
    const [bearerModalVisible, setBearerModalVisible] = useState(false);
    const [selectedPeripheral, setSelectedPeripheral] = useState<ScanResult | null>(null);

    useEffect(() => {
        let scanResultListener: EmitterSubscription;
        setScanResult([]);
        requestAndroidPermissions().then(() => {
            if (!scanProvisionedNodes) {
                scanResultListener = bleMeshEmitter.addListener('onScanResult', handleDiscoverPeripheral);

                callMeshModuleFunction('startScan');
            }

            else {
                scanResultListener = bleMeshEmitter.addListener('onProvisionedScanResult', handleDiscoverPeripheral);
                callMeshModuleFunction('reconnectToProxy', unicastAddr);
            }
        });

        return () => {
            bleMeshEmitter.removeAllListeners('onScanResult')
            bleMeshEmitter.removeAllListeners('onProvisionedScanResult');
            callMeshModuleFunction('stopScan');
        };
    }, [scanProvisionedNodes]);

    // TODO: Fix remote provisioning results ar are not contiusely
    // Check every 2 seconds if there is any inactive devices
    // useEffect(() => {
    //     const interval = setInterval(() => {
    //         const currentTime = Date.now();
    //         const inactivityThreshold = 2000;

    //         setScanResult((prev) => {
    //             return prev.filter((device) => currentTime - device.lastSeen < inactivityThreshold);
    //         });
    //     }, 2000);

    //     return () => clearInterval(interval);
    // }, []);

    async function requestAndroidPermissions(): Promise<void> {
        if (Platform.OS === 'android') {
            try {
                // Android 12 and above
                if (Platform.Version >= 31) {
                    await PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
                    ]);
                }
                // Android 11 and lower 
                else {
                    await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    );

                    // First time asking for permission - need to reload the app
                    const hasAskedPermission = await AsyncStorage.getItem('hasAskedPermission');
                    if (hasAskedPermission !== 'true') {
                        await AsyncStorage.setItem('hasAskedPermission', 'true');
                        RNRestart.Restart();
                    }
                }
                Promise.resolve();

            } catch (error) {
                console.error('Android permissions error: ', error);
                Promise.reject();
            }
        }
        else {
            Promise.resolve();
        }
    };

    function handleDiscoverPeripheral(scanResult: ScanResult) {
        const currentTime = Date.now();
        setScanResult((prev) => {
            const index = prev.findIndex(p => p.id === scanResult.id);
            // Device is already discovered
            if (index >= 0) {
                // Update the existing device's RSSI and current time
                const updatedPeripherals = [...prev];

                updatedPeripherals[index] = {
                    ...updatedPeripherals[index],
                    rssi: scanResult.rssi,
                    bearers: scanResult.bearers,
                    lastSeen: currentTime,
                };

                return updatedPeripherals;
            } else {
                // Add the new peripheral to the list with the current time
                return [{ ...scanResult, lastSeen: currentTime }, ...prev];
            }
        });
    };

    async function onSelectNode(peripheral: ScanResult) {
        bleMeshEmitter.removeAllListeners('onScanResult');
        bleMeshEmitter.removeAllListeners('onProvisionedScanResult');
        callMeshModuleFunction('stopScan');

        if (scanProvisionedNodes) {
            await callMeshModuleFunction('selectProvisionedNodeToConnect', peripheral.id, unicastAddr, peripheral.identifier ?? "");
            navigation.navigate('BleMeshConfigureNode', { unicastAddr: unicastAddr, isConnecting: true })

        }
        else {
            if (Platform.OS == "android") {
                callMeshModuleFunction('selectUnprovisionedNode', peripheral.id);
                navigation.navigate('BleMeshProvisionNode')
            }
            else { // ios
                // if there is more then one bearer - let the user choose the bearer to provision with (use proxy node or gatt bearer)
                if (peripheral.bearers.length > 1) {
                    setSelectedPeripheral(peripheral);
                    setBearerModalVisible(true);
                }
                else {
                    // use the default bearer
                    callMeshModuleFunction('selectUnprovisionedNode', peripheral.id, 0);
                    navigation.navigate('BleMeshProvisionNode')

                }
            }

        }
    };

    const onBearerSelected = (bearerIndex: number) => {
        console.log("selected bearer:", selectedPeripheral?.bearers[bearerIndex])
        callMeshModuleFunction('selectUnprovisionedNode', selectedPeripheral?.id, bearerIndex);
        navigation.navigate('BleMeshProvisionNode')
    }

    const ScannedDevice = ({ peripheral }: { peripheral: ScanResult }) => {
        return (
            <TouchableOpacity
                style={[styles.scannedDeviceContainer, meshStyles.shadow]}
                onPress={() => onSelectNode(peripheral)}
            >
                <View style={styles.leftSection}>
                    <View style={styles.deviceInfo}>
                        <Text style={styles.priName}>{peripheral.name || 'Unknown'}</Text>
                        <Text numberOfLines={1} style={styles.priId}>Device ID: {peripheral.id || peripheral.identifier}</Text>
                    </View>
                </View>
                <View style={styles.rightSection}>
                    <Icon name="signal" type="font-awesome" color={'black'} size={20} />
                    <Text style={styles.rssiText}>{peripheral.rssi} dBm</Text>
                    {Platform.OS === 'android' ? ( // Android - default provisioning
                        <Icon
                            name="chevron-right"
                            type="evilicon"
                            size={40}
                            color="black"
                            style={{ marginBottom: 8 }}
                        />
                    ) : peripheral.bearers && peripheral.bearers.length > 1 ? ( // iOS - multi bearer selection
                        <MaterialCommunityIcons
                            name="arrow-decision"
                            size={25}
                            color="black"
                            style={{
                                marginLeft: 8,
                                marginRight: 8,
                                transform: [{ rotate: '90deg' }]
                            }}
                        />
                    ) : peripheral.bearers && peripheral.bearers.length === 1 && peripheral.bearers[0] === 'PB GATT' ? ( // iOS - default provisioning
                        <Icon
                            name="chevron-right"
                            type="evilicon"
                            size={40}
                            color="black"
                            style={{ marginBottom: 8 }}
                        />
                    ) : ( // iOS - remote provisioning only
                        <MaterialCommunityIcons
                            name="transfer-right"
                            size={25}
                            color="black"
                            style={{
                                marginLeft: 8,
                                marginRight: 8,
                            }}
                        />
                    )}

                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={meshStyles.container}>
            <Text style={[meshStyles.title, { marginBottom: 20 }]}>Scanning devices...</Text>
            <ScrollView>
                {scanResult.map((peripheral) => (
                    <ScannedDevice key={peripheral.id} peripheral={peripheral} />
                ))}
                {scanResult.length == 0 && (
                    <>
                        <Skeleton animation='pulse' style={{ width: "100%", height: 50, marginBottom: 10 }} />
                        <Skeleton animation='pulse' style={{ width: "100%", height: 50, marginBottom: 10 }} />
                        <Skeleton animation='pulse' style={{ width: "100%", height: 50, marginBottom: 10 }} />
                    </>
                )}
            </ScrollView>
            <BearerSelectionModal
                setModalVisible={setBearerModalVisible}
                visible={bearerModalVisible}
                onSelectBearer={onBearerSelected}
                bearerOptions={selectedPeripheral?.bearers}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    scannedDeviceContainer: {
        padding: 10,
        paddingLeft: 20,
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'row',
        borderRadius: 9,
        justifyContent: 'space-between',
        marginBottom: 15,
        minHeight: 60,
    },
    row: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignContent: 'flex-start',
    },
    priName: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    priId: {
        fontSize: 12,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rssiText: {
        fontSize: 12,
        color: 'black',
        marginLeft: 6,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    deviceInfo: {
        flex: 1,
    },
});

export default BleMeshScanner;
