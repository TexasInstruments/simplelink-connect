import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    InteractionManager,
    KeyboardAvoidingView,
    NativeEventEmitter,
    NativeModules,
    Platform,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Switch,
    useWindowDimensions
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../../constants/Colors';
import { Icon } from '@rneui/base';

interface Props {
    peripheralId: string;
}

const BatteryLevelService: React.FC<Props> = ({ peripheralId }) => {
    const SERVICE_UUID = '180f';
    const BATTERY_CHAR_UUID = '2a19';

    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

    const [batteryLevel, setBatteryLevel] = useState<number>(0);
    const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);

    const isProcessing = useRef<boolean>(false);

    useFocusEffect(
        useCallback(() => {
            const task = InteractionManager.runAfterInteractions(async () => {
                if (Platform.OS === 'android') {
                    await BleManager.requestConnectionPriority(peripheralId, 1);
                    await BleManager.requestMTU(peripheralId, 255);
                }

                readValue();

                if (notificationsEnabled) {
                    bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleNotifications);
                    BleManager.startNotification(peripheralId, SERVICE_UUID, BATTERY_CHAR_UUID)
                        .then(() => console.log('Notifications started'))
                        .catch(console.error);
                }
            });

            return () => {
                task.cancel();
                bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
                if (notificationsEnabled) {
                    try {
                        BleManager.stopNotification(peripheralId, SERVICE_UUID, BATTERY_CHAR_UUID);
                        console.log('Notifications stopped');
                    } catch (e) {
                        console.error(e);
                    }
                }
                isProcessing.current = false;
            };
        }, [notificationsEnabled])
    );

    const handleNotifications = ({ value, characteristic }: any) => {
        if (characteristic.toLowerCase().includes(BATTERY_CHAR_UUID.toLowerCase()) && value) {
            const notificationData = new Uint8Array(value);
            setBatteryLevel(notificationData[0]);
        }
    };

    const readValue = async () => {
        try {
            let val = await BleManager.read(peripheralId, SERVICE_UUID, BATTERY_CHAR_UUID);
            setBatteryLevel(val[0]);
        } catch (error) {
            console.error("Failed to read battery level:", error);
        }
    };

    const toggleNotifications = async () => {
        if (notificationsEnabled) {
            try {
                await BleManager.stopNotification(peripheralId, SERVICE_UUID, BATTERY_CHAR_UUID);
                console.log('Stopped notifications');
            } catch (error) {
                console.error("Failed to stop notifications:", error);
            }
        }
        setNotificationsEnabled(!notificationsEnabled);
    };

    const getBatteryColor = () => {
        if (batteryLevel > 50) return "green";
        if (batteryLevel > 20) return "orange";
        return "red";
    };

    return (
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.item]}>
                <Text style={[styles.title]}>Continuously Update</Text>
                <Switch
                    value={notificationsEnabled}
                    onChange={toggleNotifications}
                />
            </View>
            <View style={[styles.batteryItem]}>

                <View style={styles.container}>
                    {/* Battery Cap */}
                    <View style={styles.batteryCap} />

                    {/* Battery Body */}
                    <View style={styles.batteryBody}>
                        <View style={[styles.batteryFill, { width: `${batteryLevel}%`, backgroundColor: getBatteryColor() }]} />
                    </View>

                    {/* Battery Percentage */}
                    <Text style={styles.percentage}>{batteryLevel}%</Text>
                </View>
            </View>


            {/* Refresh Button */}
            <TouchableOpacity style={[styles.button]} onPress={readValue}>
                <Text style={[styles.buttonText]}>Refresh</Text>
                <Icon solid={true} name={'refresh'} size={16} color={Colors.blue} type="font-awesome" style={{ alignSelf: 'center' }} />
            </TouchableOpacity >

        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.lightGray,
        padding: 20
    },
    batteryBody: {
        width: 200,
        height: 80,
        borderWidth: 3,
        borderColor: "#000",
        borderRadius: 5,
        justifyContent: "center",
        backgroundColor: "#ddd",
        overflow: "hidden",
    },
    batteryFill: {
        height: "100%",
        borderRadius: 3,
    },
    batteryCap: {
        width: 8,
        height: 15,
        backgroundColor: "#000",
        marginLeft: 2,
        borderRadius: 2,
    },
    percentage: {
        marginLeft: 10,
        fontSize: 25,
        fontWeight: "bold",
    },
    button: {
        backgroundColor: "white",
        // width: '50%',
        alignSelf: 'center',
        paddingVertical: 10,
        textAlign: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        borderRadius: 30,
        marginTop: 40,

        // Shadow for iOS
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,

        // Shadow for Android
        elevation: 5,
    },
    buttonText: {
        color: Colors.blue,
        fontWeight: "bold",
        marginRight: 10,
        fontSize: 16,
    },
    switchContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: "bold",
    },
    batteryItem: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        minHeight: 180,
        backgroundColor: 'white',
        borderRadius: 15,
        marginBottom: 20,
    },
    item: {
        display: 'flex',
        flexDirection: 'row',
        padding: 20,
        justifyContent: 'space-between',
        backgroundColor: 'white',
        borderRadius: 15,
        marginBottom: 20,
        alignItems: 'center',  // Ensures vertical centering

    },
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',

    },
});

export default BatteryLevelService;
