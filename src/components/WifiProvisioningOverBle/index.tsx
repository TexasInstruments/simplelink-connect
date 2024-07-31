import { StyleSheet, TextInput, Platform, SafeAreaView, KeyboardAvoidingView, ScrollView, useWindowDimensions, Alert, InteractionManager, NativeModules, NativeEventEmitter } from 'react-native';
import Colors from '../../constants/Colors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dropdown } from 'react-native-element-dropdown';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity } from '../../components/Themed';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import BleManager from 'react-native-ble-manager';
import { convertStringToByteArray } from '../../hooks/convert';
import { useSpecificScreenConfigContext } from '../../context/SpecificScreenOptionsContext';

interface Props {
    peripheralId: string;
    isLinuxDevice: boolean;
}

const WifiProvisioningOverBLEScreen: React.FC<Props> = ({ peripheralId, isLinuxDevice }) => {

    const { specificScreenConfig } = useSpecificScreenConfigContext();
    const navigation = useNavigation();

    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

    const [ssidInput, setSsidInput] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [security, setSecurity] = useState<'open' | 'wpa2' | undefined>('open');
    const [connectionTimeout, setConnectionTimeout] = useState<number>(specificScreenConfig.wifiProvisioningConnectionTimeout);
    const [log, setLog] = useState<{ color: string, text: string }>();

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const timeout = useRef<NodeJS.Timeout | undefined>(undefined);
    const connectionEstablished = useRef(false);

    const ServiceUuidLinux = '180d'
    const ConnectionCharLinux = '2a39'

    const ServiceUuid = 'cc00'
    const SsidUuid = 'cc01'
    const PasswordUuid = 'cc02'
    const ConnectionCharUuid = 'cc03'

    useFocusEffect(
        useCallback(() => {
            const task = InteractionManager.runAfterInteractions(() => {
                if (!isLinuxDevice) {
                    bleManagerEmitter.addListener(
                        'BleManagerDidUpdateValueForCharacteristic', handleConnectionNotifications);

                    BleManager.startNotification(peripheralId, ServiceUuid, ConnectionCharUuid);
                    console.log('notification enabled')
                }

                setLog({ color: 'black', text: 'Waiting for ssid and password' });
                setLoading(false);
            });

            return () => {
                task.cancel();

                if (!isLinuxDevice) {
                    bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');

                    // Stop notifications
                    BleManager.stopNotification(peripheralId, ServiceUuid, ConnectionCharUuid);
                    console.log('notification disabled')
                }
            };
        }, [])
    );

    useEffect(() => {
        setConnectionTimeout(specificScreenConfig.wifiProvisioningConnectionTimeout)
    }, [specificScreenConfig.wifiProvisioningConnectionTimeout])

    const securityOptions = [
        { label: 'Open', value: 'open' },
        { label: 'WPA2', value: 'wpa2' },
    ];

    const isValid = () => {
        if (loading) return false;
        if (security === 'wpa2' && !password) return false;
        else return ssidInput
    }

    const handleConnectionNotifications =
        ({ value, peripheral, characteristic, service }: any) => {
            console.log(`notification: ${value}, characteristic: ${characteristic}`);
            if (value[0] === 1) {
                console.log('connection started!');
                setLog({ color: 'black', text: 'Connection Process Started' })
            }
            else if (value[0] == 2) {
                console.log('connection established!');
                setLog({ color: 'green', text: 'Connection Established' })
                connectionEstablished.current = true;
                clearTimeout(timeout.current)
                timeout.current = undefined;
                setLoading(false);

            }
            else if (value[0] == 3) {
                console.log('connection failed!');
                setLog({ color: 'red', text: 'Connection Failed' })
                clearTimeout(timeout.current);
                timeout.current = undefined
                setLoading(false);
            }
        }

    async function handleConnect() {
        setLog({ color: 'black', text: 'Connection progress started' })
        connectionEstablished.current = false;
        timeout.current = undefined;
        clearTimeout(timeout.current)
        setLoading(true);

        if (isLinuxDevice) {
            let writeByteArray = convertStringToByteArray(ssidInput + ',' + password);
            // @ts-ignore
            let writeBytes = Array.from(writeByteArray);
            console.log('write ssid:', ssidInput, ' and password:', password, 'to characteristic:', ConnectionCharLinux)
            await BleManager.writeWithoutResponse(peripheralId, ServiceUuidLinux, ConnectionCharLinux, writeBytes, writeBytes.length);

            // Assume connection succeeded
            console.log('connection established!');
            setLog({ color: 'green', text: 'Connection Established' })
            connectionEstablished.current = true;
            setLoading(false);
            return;
        }

        // Write ssid to char 1
        let writeByteArray = convertStringToByteArray(ssidInput);

        // @ts-ignore
        let writeBytes = Array.from(writeByteArray);
        try {
            console.log('write ssid:', ssidInput, 'to characteristic:', SsidUuid)
            await BleManager.write(peripheralId, ServiceUuid, SsidUuid, writeBytes, writeBytes.length);
            console.log('write ssid: succeed')
            setLog({ color: 'black', text: `write SSID: ${ssidInput} to characteristic ${SsidUuid} succeed!` })
        }
        catch (err) {
            console.error('write ssid failed:', err);
            setLog({ color: 'red', text: `write SSID: ${ssidInput} to characteristic ${SsidUuid} failed!` })
            setLoading(false);
            return;
        }

        // Write password to char 2
        if (security === 'wpa2') {
            let writeByteArrayPass = convertStringToByteArray(password);
            // @ts-ignore
            let writeBytesPass = Array.from(writeByteArrayPass);

            try {
                console.log('write password:', password, 'to characteristic:', PasswordUuid)
                await BleManager.write(peripheralId, ServiceUuid, PasswordUuid, writeBytesPass, writeBytesPass.length);
                console.log('write password: succeed')
                setLog({ color: 'black', text: `write password: ${password} to characteristic ${PasswordUuid} succeed!` })
            }

            catch (err) {
                console.error('write password failed:', err);
                setLog({ color: 'red', text: `write password: ${password} to characteristic ${PasswordUuid} failed!` })
                setLoading(false);
                return;
            }
        }

        // Read char 3 to connect
        try {
            console.log('read to trigger connection')
            let response = await BleManager.read(peripheralId, ServiceUuid, ConnectionCharUuid);
            console.log('read response:', response);
            setLog({ color: 'black', text: `Start connection progress` })

            if (response[0] === 2) {
                console.log('connection already established')
                setLog({ color: 'green', text: 'connection already established' })
            }

            else {
                setLog({ color: 'black', text: `Waiting for notifications` })
                monitorConnection();
            }

        }
        catch (err) {
            console.error('read failed:', err);
            setLog({ color: 'red', text: `Trigger connection failed` });
            setLoading(false);
            return;

        }
    }

    function onCancel() {
        clearTimeout(timeout.current);
        navigation.goBack();
    }

    function monitorConnection() {
        timeout.current = setTimeout(() => {
            if (!connectionEstablished.current) {
                setLoading(false);
                setLog({ text: `Connection timeout after ${connectionTimeout / 1000} seconds`, color: 'red' })
                console.log('connection timeout')
                clearTimeout(timeout.current)
            }
        }, connectionTimeout);
    }

    return (
        <SafeAreaView style={{ backgroundColor: Colors.lightGray, flex: 1, }}>
            <KeyboardAvoidingView style={[styles.container]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView style={{ flex: 1 }}>
                    {/* Header */}
                    <View style={{ backgroundColor: Colors.lightGray, marginBottom: 30 }}>
                        <View style={styles.sectionHeader}>
                            <Icon name="wifi" size={28} style={styles.icon} />
                            <Text style={styles.sectionTitle} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Enter SSID and Password</Text>
                        </View>
                    </View>
                    {/* Content */}
                    <View style={{ backgroundColor: Colors.lightGray, flex: 1, }}>
                        <Text style={[styles.title]} allowFontScaling adjustsFontSizeToFit numberOfLines={1} testID='ssid' accessibilityLabel='ssid'>WiFi SSID</Text>
                        <View style={[styles.optionBox]}>
                            <TextInput
                                editable
                                placeholderTextColor={Colors.gray}
                                style={[styles.textInput]}
                                placeholder="Enter WiFi SSID"
                                value={ssidInput}
                                onChangeText={(owner) => { setSsidInput(owner.trim()); }}
                            />
                        </View>
                        <Text style={[styles.title]} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Security</Text>
                        <View style={[styles.optionBox]}>
                            <Dropdown
                                style={[styles.dropdown]}
                                placeholderStyle={styles.placeholderStyle}
                                selectedTextStyle={styles.selectedTextStyle}
                                data={securityOptions}
                                placeholder='Choose Security'
                                value={security}
                                onChange={(v: any) => {
                                    setSecurity(v.value);
                                }}
                                labelField="label"
                                valueField="value"
                            />
                        </View>

                        {security === 'wpa2' && (
                            <>
                                <Text style={[styles.title]} allowFontScaling adjustsFontSizeToFit numberOfLines={1} testID='password' accessibilityLabel='password'>Password</Text>
                                <View style={[styles.optionBox]}>
                                    <View style={[styles.passwordContainer]}>
                                        <TextInput
                                            placeholderTextColor={Colors.gray}
                                            placeholder="Enter Password"
                                            secureTextEntry={!showPassword}
                                            editable
                                            style={[styles.textInput, { shadowOpacity: 0, elevation: 0 }]}
                                            value={password}
                                            onChangeText={(token) => { setPassword(token); }}
                                        />
                                        <MaterialCommunityIcons
                                            style={styles.icon}
                                            name={showPassword ? 'eye-off' : 'eye'}
                                            size={24}
                                            color="gray"
                                            onPress={() => setShowPassword(!showPassword)}
                                        />
                                    </View>
                                </View>
                            </>
                        )}


                    </View>
                    {/* Progress bar */}
                    {log && (
                        <>
                            <Text style={[styles.title, { marginTop: 10 }]} testID='ssid' accessibilityLabel='ssid'>Status:
                                <Text style={{ color: log.color, fontWeight: 'normal' }}>{' '} {log.text}</Text>
                            </Text>
                        </>
                    )}

                </ScrollView>
                {/* Action Buttons */}
                <View style={{ backgroundColor: Colors.lightGray }}>
                    {/* Save Cancel Buttons */}
                    <View style={{ flexDirection: 'row', backgroundColor: Colors.lightGray, justifyContent: 'space-evenly', marginBottom: Platform.OS === 'ios' ? 60 : 0 }}>
                        <TouchableOpacity style={styles.buttonWrapper} onPress={onCancel}>
                            <Text style={{ color: Colors.blue, fontSize: 18 }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.buttonWrapper]}
                            onPress={handleConnect}
                            disabled={!isValid()}
                        >
                            <Text style={{ color: Colors.blue, fontSize: 18, opacity: !isValid() ? 0.2 : 1 }}>Connect</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 22,
        fontWeight: '600',
        flex: 1,
    },
    optionBox: {
        backgroundColor: Colors.lightGray,
        height: 50,
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
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: 'gray',
        borderRadius: 10,
        height: 50,
        elevation: 2,
        shadowOpacity: 0.5,
        shadowRadius: 0,
        shadowColor: 'rgba(0,0,0,0.4)',
        shadowOffset: {
            height: 1,
            width: 0,
        },
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        paddingHorizontal: 32,
        borderWidth: 0.5,
        borderRadius: 10,
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
    buttonWrapper: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    icon: {
        marginRight: 10,
    },
});

export default WifiProvisioningOverBLEScreen;
