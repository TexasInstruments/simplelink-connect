import { KeyboardAvoidingView, Image, View, useWindowDimensions, Pressable, Platform, Text, InteractionManager, NativeEventEmitter, NativeModules } from 'react-native';
import { StyleSheet } from 'react-native';
import Colors from '../../constants/Colors';
import { useCallback, useEffect, useState } from 'react';
import BleManager from 'react-native-ble-manager';
import { Buffer } from 'buffer';
import { TouchableOpacity } from '../Themed';
import { useFocusEffect } from '@react-navigation/native';

interface Props {
    peripheralId: string;
}

const ON = {
    color: Colors.gray,
    text: 'Click to turn on light'
}
const OFF = {
    color: Colors.primary,
    text: 'Click to turn off light'
}

const LIGHT_ON_OFF_CHAR = Platform.OS === 'ios' ? 'f00011a1-0451-4000-b000-000000000000'.toLocaleUpperCase() : 'f00011a1-0451-4000-b000-000000000000';
const LIGHT_TOGGLE_CHAR = Platform.OS === 'ios' ? 'f00011a2-0451-4000-b000-000000000000'.toLocaleUpperCase() : 'f00011a2-0451-4000-b000-000000000000';
const LIGHT_STATE_CHAR = Platform.OS === 'ios' ? 'f00011a3-0451-4000-b000-000000000000'.toLocaleUpperCase() : 'f00011a3-0451-4000-b000-000000000000';
const SERVICE_UUID = Platform.OS === 'ios' ? 'f00011a0-0451-4000-b000-000000000000'.toLocaleUpperCase() : 'f00011a0-0451-4000-b000-000000000000'


const MatterLight: React.FC<Props> = ({ peripheralId }: any) => {
    const [lightOn, setLightOn] = useState<boolean>(false);
    const [buttonText, setButtonText] = useState(ON.text);
    const [buttonColor, setButtonColor] = useState(ON.color);



    let { width } = useWindowDimensions();

    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

    useFocusEffect(
        useCallback(() => {
            const task = InteractionManager.runAfterInteractions(() => {
                console.log('enable noti')
                BleManager.startNotification(
                    peripheralId,
                    SERVICE_UUID,
                    LIGHT_STATE_CHAR
                );

                console.log('addListener for BleManagerDidUpdateValueForCharacteristic');
                bleManagerEmitter.addListener(
                    'BleManagerDidUpdateValueForCharacteristic',
                    ({ value, peripheral, characteristic, service }) => {
                        let buf = Buffer.from(value);
                        let lightState = buf.readUInt8(0);
                        console.log('Got Notifications:', characteristic, lightState)
                        setLightOn(lightState === 1 ? true : false)
                    })
            });

            return () => {
                task.cancel();
                console.log('remove all listeners');
                bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
                BleManager.stopNotification(peripheralId, SERVICE_UUID, LIGHT_STATE_CHAR);
            }
        }, [])
    );

    useEffect(() => {
        console.log('peripheralId', peripheralId);
        updateLightState();
    }, [peripheralId]);

    useEffect(() => {
        if (lightOn) {
            setButtonColor(OFF.color);
            setButtonText(OFF.text);
        } else {
            setButtonColor(ON.color);
            setButtonText(ON.text);
        }
    }, [lightOn]);

    const updateLightState = async () => {
        try {
            const isLightOn = await getCurrentLightState();
            setLightOn(isLightOn);
        } catch (error) {
            console.error('Failed to update light state:', error);
        }
    };

    const getCurrentLightState = async (): Promise<boolean> => {
        try {
            const data = await BleManager.read(peripheralId, SERVICE_UUID, LIGHT_STATE_CHAR);
            const isLightOn = Boolean(Buffer.from(data).readInt8());
            console.log('isLightOn:', isLightOn);
            return isLightOn;
        } catch (error) {
            console.error('Read error:', error);
            return false;
        }
    };

    const setLightState = async () => {
        try {
            const buffer = Buffer.from([1]);
            // Write the buffer to the toggle light characteristic
            await BleManager.write(peripheralId, SERVICE_UUID, LIGHT_TOGGLE_CHAR, buffer.toJSON().data);

        } catch (error) {
            console.error('Set light state error:', error);
        }
    };

    const onButtonToggle = () => {
        console.log('Button toggled');
        setLightState();
    };

    return (
        <KeyboardAvoidingView style={[styles.container]}>
            <View style={{ flex: 1, }}>
                {lightOn && (
                    <Image source={require('../../assets/images/led-lamp-red-on.png')} style={[{ width }, styles.image]} />
                )}
                {!(lightOn) && (
                    <Image source={require('../../assets/images/led-lamp-red-off.png')} style={[{ width }, styles.image]} />
                )}

            </View>
            <TouchableOpacity
                onPress={onButtonToggle}
                disabled={false}
                style={[{
                    ...styles.button,
                    borderWidth: Platform.OS === 'ios' ? 4 : 0,
                    height: 40,
                    backgroundColor: buttonColor,
                    borderColor: buttonColor,
                    opacity: 1,
                }]}>
                <Text style={[styles.text]}>{buttonText}</Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    text: {
        fontSize: 16,
        lineHeight: 21,
        fontWeight: 'bold',
        letterSpacing: 0.25,
        color: 'white',
    },
    image: {
        flex: 1,
        // width: '100%', height: '90%',
        // resizeMode: 'contain',
    },
    container: {
        flex: 1,
        paddingVertical: 30,
    },
    button: {
        alignItems: 'center',
        alignSelf: 'center',
        width: '70%',
        justifyContent: 'center',
        borderWidth: 0.5,
        borderRadius: 4,
        elevation: 3,
    },
})
export default MatterLight;
