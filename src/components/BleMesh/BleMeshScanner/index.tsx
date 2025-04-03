import { Text, TouchableOpacity } from '../../Themed';
import { StyleSheet, NativeModules, View, NativeEventEmitter, PermissionsAndroid, Platform, EmitterSubscription } from 'react-native';
import { useEffect, useState, } from 'react';
import { Icon } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { LogBox } from 'react-native';
import { callMeshModuleFunction, meshStyles } from '../meshUtils';
import { BleMeshScanScreenProps } from '../../../../types';
LogBox.ignoreLogs(['new NativeEventEmitter']);
import RNRestart from 'react-native-restart';
import { ScrollView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props extends BleMeshScanScreenProps { };

interface ScanResult {
    name: string;
    id: string;
    rssi: string;
    lastSeen: number; // To insure the device is active
}

const BleMeshScanner: React.FC<Props> = ({ route }) => {

    const { MeshModule } = NativeModules;
    const { scanProvisionedNodes, unicastAddr } = route.params

    let navigation = useNavigation();
    const bleMeshEmitter = new NativeEventEmitter(MeshModule);

    const [scanResult, setScanResult] = useState<ScanResult[]>([]);

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

    // Check every 2 seconds if there is any inactive devices
    useEffect(() => {
        const interval = setInterval(() => {
            const currentTime = Date.now();
            const inactivityThreshold = 2000;

            setScanResult((prev) => {
                return prev.filter((device) => currentTime - device.lastSeen < inactivityThreshold);
            });
        }, 2000);

        return () => clearInterval(interval);
    }, []);

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
                    lastSeen: currentTime,
                };

                return updatedPeripherals;
            } else {
                // Add the new peripheral to the list with the current time
                return [{ ...scanResult, lastSeen: currentTime }, ...prev];
            }
        });

    };

    async function onSelectNode(peripheral: any) {
        bleMeshEmitter.removeAllListeners('onScanResult');
        bleMeshEmitter.removeAllListeners('onProvisionedScanResult');
        callMeshModuleFunction('stopScan');

        if (scanProvisionedNodes) {
            await callMeshModuleFunction('selectProvisionedNodeToConnect', peripheral.id, unicastAddr);
            navigation.navigate('BleMeshConfigureNode', { unicastAddr: unicastAddr, isConnecting: true })

        }
        else {
            callMeshModuleFunction('selectUnprovisionedNode', peripheral.id);
            navigation.navigate('BleMeshProvisionNode')
        }
    };

    const ScannedDevice = ({ peripheral }: { peripheral: ScanResult }) => {
        return (
            <TouchableOpacity style={[styles.scannedDeviceContainer, meshStyles.shadow]} onPress={() => onSelectNode(peripheral)}>
                <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    {/* <PeripheralIcon icon={peripheral.icon} color={'black'} /> */}
                    <View style={{ display: 'flex', flexDirection: 'column', marginLeft: 10 }}>
                        <Text style={styles.priName}>{peripheral.name ? peripheral.name : 'Unknown'} </Text>
                        <Text numberOfLines={1} style={styles.priId}>Device ID: {peripheral.id} </Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="signal" type="font-awesome" color={'black'} size={20} />
                    <Text style={{ textAlign: 'center', color: 'black', fontSize: 12 }}> {peripheral.rssi} dBm</Text>
                    <Icon name="chevron-right" type="evilicon" size={40} color={'black'} style={{ marginBottom: 8 }} />
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
            </ScrollView>
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
});

export default BleMeshScanner;
