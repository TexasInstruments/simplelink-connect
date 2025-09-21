import { Dialog, TextInput } from "react-native-paper";
import { Alert, StyleSheet, View } from 'react-native';
import { useEffect, useState } from "react";
import { Text, TouchableOpacity } from '../Themed';
import { CustomDropdwn } from "./CustomDropdwn";
import Colors from "../../constants/Colors";
import { CGM_PROFILE } from "../../constants/uuids";
import BleManager from 'react-native-ble-manager';
import { Buffer } from 'buffer';
import { KeyboardAvoidingDialog } from "./KeyBoardAvodingDialog";

interface Props {
    visible: boolean;
    hideDialog: any;
    peripheralId: string;
}

export const OP_CODES_CONTROL_POINT = {
    setCommunicationInterval: { desc: 'Set CGM Communication Interval (0x01)', value: 0x01 },
    getCommunicationInterval: { desc: 'Get CGM Communication Interval (0x02)', value: 0x02 },
    // setGlucoseCalibration: { desc: 'Set Glucose Calibration value (0x04)', value: 0x04 },
    getGlucoseCalibration: { desc: 'Get Glucose Calibration Value (0x05)', value: 0x05 },
    setPatientHighAlert: { desc: 'Set Patient High Alert Level (0x07)', value: 0x07 },
    getPatientHighAlert: { desc: 'Get Patient High Alert Level (0x08)', value: 0x08 },
    setPatientLowAlert: { desc: 'Set Patient Low Alert Level (0x0A)', value: 0x0A },
    getPatientLowAlert: { desc: 'Get Patient Low Alert Level (0x0B)', value: 0x0B },
    setHypoAlert: { desc: 'Set Hypo Alert Level (0x0D)', value: 0x0D },
    getHypoAlert: { desc: 'Get Hypo Alert Level (0x0E)', value: 0x0E },
    setHyperAlert: { desc: 'Set Hyper Alert Level (0x10)', value: 0x10 },
    getHyperAlert: { desc: 'Get Hyper Alert Level (0x11)', value: 0x11 },
    setRateDecAlert: { desc: 'Set Rate of Decrease Alert Level (0x13)', value: 0x13 },
    getRateDecAlert: { desc: 'Get Rate of Decrease Alert Level (0x14)', value: 0x14 },
    setRateIncData: { desc: 'Set Rate of Increase Alert Level (0x16)', value: 0x16 },
    getRateIncData: { desc: 'Get Rate of Increase Alert Level (0x17)', value: 0x17 },
    resetDevice: { desc: 'Reset Device Specific Alert (0x19)', value: 0x19 },
    startSession: { desc: 'Start the Session (0x1A)', value: 0x1A },
    stopSession: { desc: 'Stop the Session (0x1B)', value: 0x1B },
}

export const CONTROL_POINT_RESP = {
    communicationInterval: { desc: 'CGM Communication Interval response (0x03)', value: 0x03 },
    calibrationValue: { desc: 'Glucose Calibration Value response (0x06)', value: 0x06 },
    patientHighAlertLevel: { desc: 'Patient High Alert Level Response (0x09)', value: 0x09 },
    patientLowAlertLevelResponse: { desc: 'Patient Low Alert Level Response (0x0C)', value: 0x0C },
    hypoAlertLevelResponse: { desc: 'Hypo Alert Level Response (0x0F)', value: 0x0F },
    hyperAlertLevelResponse: { desc: 'Hyper Alert Level Response (0x12)', value: 0x12 },
    rateofDecreaseAlertLevelResponse: { desc: 'Rate of Decrease Alert Level Response (0x15)', value: 0x15 },
    rateofIncreaseAlertLevelResponse: { desc: 'Rate of Increase Alert Level Response (0x18)', value: 0x18 },
    responseCode: { desc: 'Response Code (0x1C)', value: 0x1C },
}

export const SpecificOpsControlPointDialog: React.FC<Props> = ({ visible, hideDialog, peripheralId }) => {
    const [selectedOpCode, setSelectedOpCode] = useState<number>(0);
    const [selectedOperand, setSelectedOperand] = useState<string>('');

    const [opCodesList, setOpcodesList] = useState(Object.values(OP_CODES_CONTROL_POINT));
    const [isOperandUse, setIsOperandUse] = useState<boolean>(false);


    useEffect(() => {

        if (selectedOpCode === OP_CODES_CONTROL_POINT.setCommunicationInterval.value ||
            selectedOpCode === OP_CODES_CONTROL_POINT.setPatientHighAlert.value ||
            selectedOpCode === OP_CODES_CONTROL_POINT.setPatientLowAlert.value ||
            selectedOpCode === OP_CODES_CONTROL_POINT.setHypoAlert.value ||
            selectedOpCode === OP_CODES_CONTROL_POINT.setHyperAlert.value ||
            selectedOpCode === OP_CODES_CONTROL_POINT.setRateDecAlert.value ||
            selectedOpCode === OP_CODES_CONTROL_POINT.setRateIncData.value
        ) {
            setIsOperandUse(true)
        } else {
            setIsOperandUse(false)
        }
    }, [selectedOpCode]);

    async function handleSendRequest() {
        let command = [selectedOpCode]

        if (isOperandUse) {
            let operandInt = parseInt(selectedOperand, 10);
            const operandBuffer = Buffer.alloc(1);
            operandBuffer.writeUInt8(operandInt, 0);
            command.push(operandBuffer[0])
        }

        const data = Buffer.from(command);
        // write value to characteristic
        try {
            await BleManager.write(peripheralId, CGM_PROFILE.uuid, CGM_PROFILE.cgm_specific_op_cp, data.toJSON().data, data.length);
        }
        catch (err) {
            Alert.alert(err,
                'Tip: Verify indications are enabled',)
        }
        hideDialog();
    }

    function isValid(): boolean {
        if (!selectedOpCode) {
            return false;
        }
        if (isOperandUse && !selectedOperand) {
            return false;
        }
        return true;
    }

    return (
        <KeyboardAvoidingDialog visible={visible} onDismiss={hideDialog} >
            <Dialog.Title allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Specific Ops Control Point</Dialog.Title>

            <Dialog.Content>
                <CustomDropdwn
                    placeholder={"Op Code"}
                    data={opCodesList}
                    value={selectedOpCode}
                    setter={setSelectedOpCode} />

                {isOperandUse && (
                    <>
                        <Text style={{
                            fontWeight: 'bold',
                            fontSize: 12
                        }}>Operand</Text>
                        <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{
                                fontSize: 13,
                                textAlignVertical: 'center'
                            }}>Value:</Text>
                            <TextInput
                                // editable
                                keyboardType='number-pad'
                                returnKeyType="done"
                                style={[styles.textInput]}
                                value={selectedOperand}
                                onChangeText={text => setSelectedOperand(text)}
                                underlineColor="gray"
                                activeOutlineColor={Colors.active}
                                // returnKeyType='send'
                                onSubmitEditing={() => setSelectedOperand(selectedOperand)}
                                allowFontScaling
                                activeUnderlineColor="black"
                            />
                        </View>
                    </>)}


            </Dialog.Content>

            <Dialog.Actions style={{ justifyContent: 'space-between' }}>
                <TouchableOpacity onPress={hideDialog}>
                    <Text style={styles.textButton}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSendRequest} disabled={!isValid()}>
                    <Text style={[styles.textButton, { opacity: isValid() ? 1 : 0.5 }]} >Send</Text>
                </TouchableOpacity>

            </Dialog.Actions>
        </KeyboardAvoidingDialog >
    )
}

const styles = StyleSheet.create({
    textInput: {
        borderColor: 'gray',
        borderRadius: 0,
        backgroundColor: 'white',
        marginBottom: 15,
        fontSize: 13,
        height: 50,
    },
    textButton: {
        color: Colors.blue,
        marginRight: 10,
        fontSize: 16,
    },
})


