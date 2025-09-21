import { StyleSheet, TextInput, Platform, SafeAreaView, KeyboardAvoidingView, ScrollView, useWindowDimensions, Alert, InteractionManager, NativeModules, NativeEventEmitter, PermissionsAndroid } from 'react-native';
import Colors from '../../constants/Colors';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from '../Themed';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import BleManager from 'react-native-ble-manager';
import { convertStringToByteArray, getBytes } from '../../hooks/convert';
import { Buffer } from 'buffer';
import { Dropdown } from 'react-native-element-dropdown';
import { useBleRangeContext } from '../../context/RangeTestContext';

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

const PhyIdOptions =
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

    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
    const { targetLocationContext, updateTargetLocation } = useBleRangeContext();

    const [phyInput, setPhyInput] = useState<number>(0);
    const [txPowerInput, setTxPowerInput] = useState<string>('');
    const [frequencyInput, setFrequencyInput] = useState<string>('');
    const [targetLatitude, setTargetLatitude] = useState<string>('');
    const [targetLongitude, setTargetLongitude] = useState<string>('');
    const [numberOfPacketsInput, setNumberOfPackets] = useState<string>('');
    const [packetsLenInput, setPacketsLen] = useState<string>('');
    const [testMode, setTestMode] = useState<number>();


    const PhyIdUUID = 'f202'
    const FrequencyUUID = 'f203'
    const PacketNumUUID = 'f204'
    const PacketLenUUID = 'f205'
    const OutputPowerUUID = 'f206'
    const TestModeUUID = 'f207'

    const ServiceUuid = 'f200'


    useEffect(() => {

        getCurrentConfig()

        return () => {
        }
    }, []);


    const getCurrentConfig = async () => {
        let phy = await BleManager.read(peripheralId, ServiceUuid, PhyIdUUID);
        setPhyInput(Buffer.from(phy).readInt8())

        let txPower = await BleManager.read(peripheralId, ServiceUuid, OutputPowerUUID);
        setTxPowerInput(Buffer.from(txPower).toString('utf8'))

        let frequency = await BleManager.read(peripheralId, ServiceUuid, FrequencyUUID);
        setFrequencyInput(Buffer.from(frequency).toString('utf8'));

        let testMode = await BleManager.read(peripheralId, ServiceUuid, TestModeUUID);
        setTestMode(Buffer.from(testMode).readInt8());

        let packetsLen = await BleManager.read(peripheralId, ServiceUuid, PacketLenUUID);
        setPacketsLen(Buffer.from(packetsLen).toString('utf8'));

        let numOfPackets = await BleManager.read(peripheralId, ServiceUuid, PacketNumUUID);
        setNumberOfPackets(Buffer.from(numOfPackets).toString('utf8'));
    }

    async function handleConfig() {

        // config phy
        let writeByteArray = [phyInput]
        let writeBytes = Array.from(writeByteArray);
        try {
            console.log('write phy:', writeBytes, 'to characteristic:', PhyIdUUID)
            await BleManager.write(peripheralId, ServiceUuid, PhyIdUUID, writeBytes, writeBytes.length);
            console.log('write phy: succeed')
        }
        catch (err) {
            console.error('write phy failed:', err);
            return;
        }

        if (testMode == TX) {
            // config tx power
            writeByteArray = convertStringToByteArray(txPowerInput);
            writeBytes = Array.from(writeByteArray);
            try {
                console.log('write tx power:', writeBytes, 'to characteristic:', OutputPowerUUID)
                await BleManager.write(peripheralId, ServiceUuid, OutputPowerUUID, writeBytes, writeBytes.length);
                console.log('write tx power: succeed')
            }
            catch (err) {
                console.error('write tx power failed:', err);
                return;
            }
            // config num of packets
            writeByteArray = convertStringToByteArray(numberOfPacketsInput);
            writeBytes = Array.from(writeByteArray);
            try {
                console.log('write numberOfPacketsInput:', writeBytes, 'to characteristic:', PacketNumUUID)
                await BleManager.write(peripheralId, ServiceUuid, PacketNumUUID, writeBytes, writeBytes.length);
                console.log('write numberOfPacketsInput: succeed')
            }
            catch (err) {
                console.error('write numberOfPacketsInput failed:', err);
            }


            // config packets length
            writeByteArray = convertStringToByteArray(packetsLenInput);
            writeBytes = Array.from(writeByteArray);
            try {
                console.log('write packetsLenInput:', packetsLenInput, 'to characteristic:', PacketLenUUID)
                await BleManager.write(peripheralId, ServiceUuid, PacketLenUUID, writeBytes, writeBytes.length);
                console.log('write packetsLenInput: succeed')
            }
            catch (err) {
                console.error('write packetsLenInput failed:', err);
            }

        }

        // config frequency
        writeByteArray = convertStringToByteArray(frequencyInput);
        writeBytes = Array.from(writeByteArray);
        try {
            console.log('write frequency:', frequencyInput, 'to characteristic:', FrequencyUUID)
            await BleManager.write(peripheralId, ServiceUuid, FrequencyUUID, writeBytes, writeBytes.length);
            console.log('write frequency: succeed')
        }
        catch (err) {
            console.error('write frequency failed:', err);
        }

        // config test mode
        console.log(testMode)
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
        }

        // target distance
        updateTargetLocation(
            parseFloat(targetLatitude || "0"), parseFloat(targetLongitude || "0")
        )

        //  get current config
        getCurrentConfig()

    }

    function onCancel() {
        navigation.goBack();
    }

    return (
        <SafeAreaView style={{ backgroundColor: Colors.lightGray, flex: 1, }}>
            <KeyboardAvoidingView style={[styles.container]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={{ backgroundColor: Colors.lightGray, marginBottom: 30 }}>
                    <View style={styles.sectionHeader}>
                        <Icon name="cog" size={28} style={styles.icon} />
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
                                data={PhyIdOptions}
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
                        <Text style={[styles.title]} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Target Location</Text>
                        <View style={styles.targetLocationContainer}>
                            {/* Latitude Input */}
                            <View style={styles.targetInputGroup}>
                                <Text style={styles.label}>Latitude</Text>
                                <TextInput
                                    editable
                                    placeholderTextColor={Colors.gray}
                                    style={[styles.textInput, { marginRight: 5 }]}
                                    placeholder="Latitude"
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
                                    placeholder="Longitude"
                                    value={targetLongitude}
                                    onChangeText={(value) => {
                                        setTargetLongitude(value)
                                    }}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
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
                        accessibilityLabel="connectButton"
                        testID="connectButton"
                    >
                        <Text style={{ color: Colors.blue, fontSize: 18 }}>Config</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
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
        marginBottom: 20
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
    targetLocationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 5,
        marginBottom: 10,
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
