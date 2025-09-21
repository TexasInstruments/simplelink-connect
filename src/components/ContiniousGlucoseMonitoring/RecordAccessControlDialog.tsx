import { Dialog, TextInput } from "react-native-paper";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useEffect, useState } from "react";
import { Text, TouchableOpacity } from '../Themed';
import { CustomDropdwn } from "./CustomDropdwn";
import Colors from "../../constants/Colors";
import BleManager from 'react-native-ble-manager';
import { Buffer } from 'buffer';
import { KeyboardAvoidingDialog } from "./KeyBoardAvodingDialog";

interface Props {
    visible: boolean;
    hideDialog: any;
    peripheralId: string;
    resetChart: () => void;
    serviceUuid: string;
    writeChar: string;
}

export const OP_CODES_ACCESS_CONTROL = {
    reportStoredRecords: { desc: 'Report stored records (0x01)', value: 0x01 },
    deleteStoredRecords: { desc: 'Delete stored records (0x02)', value: 0x02 },
    abortOperation: { desc: 'Abort operation (0x03)', value: 0x03 },
    reporeNumberStoredRecords: { desc: 'Report number of stored records (0x04)', value: 0x04 },
    numberStoredRecordsResponse: { desc: 'Number of stored records response (0x05)', value: 0x05 },
    responseCode: { desc: 'Response Code (0x06)', value: 0x06 },
}

const OPERATORS = {
    null: { desc: 'Null (0x00)', value: 0x00 },
    allRecords: { desc: 'All records (0x01)', value: 0x01 },
    lessOrEqual: { desc: 'Less than or equal to (0x02)', value: 0x02 },
    greaterOrEqual: { desc: 'Greater than or equal to (0x03)', value: 0x03 },
    within: { desc: 'Within range of (0x04)', value: 0x04 },
    first: { desc: 'First record (0x05)', value: 0x05 },
    last: { desc: 'Last record (0x06)', value: 0x06 },
};

export const RecordAccessControlDialog: React.FC<Props> = ({ visible, hideDialog, peripheralId, resetChart, serviceUuid, writeChar }) => {
    const [selectedOpCode, setSelectedOpCode] = useState<number>(OP_CODES_ACCESS_CONTROL.reportStoredRecords.value);
    const [selectedOperator, setSelectedOperator] = useState<number>(OPERATORS.allRecords.value);
    const [selectedOperand, setSelectedOperand] = useState<string>('0');

    const [opCodesList, setOpcodesList] = useState(Object.values(OP_CODES_ACCESS_CONTROL));
    const [operatorList, setOperatorList] = useState(Object.values(OPERATORS));
    const [isOperandUse, setIsOperandUse] = useState<boolean>(false);


    useEffect(() => {
        let isOprand = false;
        if (selectedOperator === OPERATORS.allRecords.value || selectedOperator === OPERATORS.first.value || selectedOperator === OPERATORS.last.value) {
            isOprand = false;
        } else if (selectedOperator === OPERATORS.lessOrEqual.value || selectedOperator === OPERATORS.greaterOrEqual.value || selectedOperator === OPERATORS.within.value) {
            isOprand = true;
        }
        setIsOperandUse(isOprand);

    }, [selectedOperator]);


    useEffect(() => {
        let newOperatorList = Object.values(OPERATORS);
        let newSelectedOperator = OPERATORS.null.value;

        if (selectedOpCode === OP_CODES_ACCESS_CONTROL.reportStoredRecords.value || selectedOpCode === OP_CODES_ACCESS_CONTROL.deleteStoredRecords.value || selectedOpCode === OP_CODES_ACCESS_CONTROL.reporeNumberStoredRecords.value) {
            newOperatorList = Object.values(OPERATORS);
            newSelectedOperator = OPERATORS.allRecords.value;
        } else if (selectedOpCode === OP_CODES_ACCESS_CONTROL.numberStoredRecordsResponse.value || selectedOpCode === OP_CODES_ACCESS_CONTROL.responseCode.value || selectedOpCode === OP_CODES_ACCESS_CONTROL.abortOperation.value) {
            newOperatorList = Object.values(OPERATORS).filter(v => v.value === OPERATORS.null.value);
        }

        setOperatorList(newOperatorList);
        setSelectedOperator(newSelectedOperator);

    }, [selectedOpCode]);

    async function handleSendRequest() {
        let command = [selectedOpCode, selectedOperator]

        if (isOperandUse) {
            const operandInt = parseInt(selectedOperand, 10);
            const operandBuffer = Buffer.alloc(4);
            operandBuffer.writeUInt32LE(operandInt, 0);

            command.push(0x01); // filter type

            for (let i = 0; i < operandBuffer.length; i++) {
                command.push(operandBuffer[i]);
            }
        }

        const data = Buffer.from(command);
        // write value to characteristic
        try {
            await BleManager.write(peripheralId, serviceUuid, writeChar, data.toJSON().data, data.length);
        }
        catch (err) {
            Alert.alert(err,
                'Tip: Verify indications are enabled',)
        }
        if (selectedOpCode === 0x01) {
            resetChart();
        }

        hideDialog();
    }

    function isValid(): boolean {
        if (selectedOpCode === undefined || selectedOperator == undefined) {
            return false;
        }
        if (isOperandUse && !selectedOperand) {
            return false;
        }
        return true;
    }


    return (
        <KeyboardAvoidingDialog visible={visible} onDismiss={hideDialog} >
            <Dialog.Title allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Record Access Control Point</Dialog.Title>

            <Dialog.Content>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flexGrow: 1 }}

                >
                    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>

                        <CustomDropdwn
                            placeholder={"Op Code"}
                            data={opCodesList}
                            value={selectedOpCode}
                            setter={setSelectedOpCode} />

                        <CustomDropdwn
                            placeholder={"Operator"}
                            data={operatorList}
                            value={selectedOperator}
                            setter={setSelectedOperator} />
                        {isOperandUse && (
                            <>
                                <Text style={{
                                    fontWeight: 'bold',
                                    fontSize: 12
                                }}>Operand</Text>
                                <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', height: 50, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, }}>Filter Type: </Text>
                                    <Text style={{ fontSize: 13, }}>Time Offset (0x01) </Text>
                                </View>
                                <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{
                                        fontSize: 13,
                                        textAlignVertical: 'center'
                                    }}>Filter Parameter: </Text>
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
                    </ScrollView >

                </KeyboardAvoidingView>
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


