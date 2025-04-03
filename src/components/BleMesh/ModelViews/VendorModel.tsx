import React, { useEffect, useState } from 'react';
import { Alert, NativeEventEmitter, NativeModules, StyleSheet, TextInput } from 'react-native';
import { Text, TouchableOpacity, View } from '../../Themed';
import { callMeshModuleFunction, meshStyles } from '../meshUtils';
import Colors from '../../../constants/Colors';
import { Divider } from 'react-native-paper';
import { Icon } from '@rneui/base';

interface Response {
    response: string;
    parameters: string;
    timestamp: string;
}

export const VendorModel: React.FC<{ nodeUnicastAddress: number, scrollViewRef: any, boundApplicationsKeys: number[] }> = ({ nodeUnicastAddress, scrollViewRef, boundApplicationsKeys }) => {
    const { MeshModule } = NativeModules;
    const bleMeshEmitter = new NativeEventEmitter(MeshModule);

    const [opcode, setOpcode] = useState<string>('');
    const [parameters, setParameters] = useState<string>('');

    const [opcodeError, setOpcodeError] = useState<string>();
    const [paramsError, setParametersError] = useState<string>();

    const [response, setResponse] = useState<Response>({ response: 'N/A', parameters: 'N/A', timestamp: 'N/A' });

    useEffect(() => {
        const resListener = bleMeshEmitter.addListener("onStatusReceived", handleResponse)
        return () => {
            bleMeshEmitter.removeAllListeners("onStatusReceived");
        };
    }, []);

    const sendCommand = () => {
        setResponse({ response: 'N/A', parameters: 'N/A', timestamp: 'N/A' });
        try {
            if (validateOpCode(opcode) && validateParameters(parameters)) {
                callMeshModuleFunction('sendVendorModelMessage', nodeUnicastAddress, parseInt(opcode, 16), parameters);
            }
            else {
                if (opcodeError) {
                    Alert.alert('Invalid command', opcodeError ? opcodeError : '');
                }
                else if (paramsError) {
                    Alert.alert('Invalid parameters', paramsError);
                }
            }
        } catch (e) {
            console.error(e)

        }
    };

    const dateOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    const handleResponse = (response: Response) => {
        if (response) {
            scrollViewRef.current?.scrollToEnd({ animated: true });

            let res = {
                response: response.response,
                parameters: response.parameters,
                timestamp: new Date().toLocaleTimeString('en-GB', dateOptions)
            }
            setResponse(res);
        }
    }

    const validateOpCode = (opcode: string) => {
        const cleanedOpcode = opcode.replace(/^0x/i, '');
        const isValidHex = /^[0-9A-Fa-f]{2,6}$/.test(cleanedOpcode);

        if (isValidHex) {
            setOpcodeError('');
        } else {
            setOpcodeError('Opcode must be a hex string with 1 to 3 octets.');
        }
        return isValidHex;
    };

    const validateParameters = (parameters: string) => {
        const isValidHex = /^[0-9A-Fa-f]*$/.test(parameters);
        const isValidLength = parameters.length <= 758; // 379 octets = 758 hex chars

        if (isValidHex && isValidLength) {
            setParametersError('');
        } else {
            setParametersError('Parameters must be a hex string with 0 to 379 octets (0 to 758 hex characters).');
        }
        return isValidHex && isValidLength;
    };

    return (
        <View style={{ backgroundColor: Colors.lightGray }}>
            {/* Control */}
            <Text style={[styles.title,]}>Control</Text>
            <View style={[styles.controlContainer]}>
                <View style={[meshStyles.item, { height: 50 }]}>
                    <Text style={[meshStyles.subject]}>Opcode</Text>
                    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <Text>0x  </Text>
                        <TextInput
                            style={[styles.textInput]}
                            value={opcode}
                            onChangeText={(text) => {
                                setOpcode(text);
                                validateOpCode(text);
                            }}
                        />
                    </View>

                </View>
                <Divider />
                <View style={[meshStyles.item, { height: 50 }]}>
                    <Text style={[meshStyles.subject]}>Parameters</Text>
                    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <Text>0x  </Text>
                        <TextInput
                            style={[styles.textInput]}
                            value={parameters}
                            onChangeText={setParameters}
                        />
                    </View>
                </View>
                <Divider />
                <View style={[meshStyles.item, { height: 50, flex: 1, justifyContent: 'center' }]}>
                    <TouchableOpacity onPress={sendCommand} style={[styles.sendButton, { opacity: boundApplicationsKeys.length == 0 ? 0.2 : 1 }]} disabled={boundApplicationsKeys.length == 0}>
                        <Text style={[meshStyles.textButton, { marginRight: 5 }]}>Send</Text>
                        <Icon solid={true} name={'send-o'} size={16} color={Colors.blue} type="font-awesome" />
                    </TouchableOpacity>
                </View>
            </View>
            {/* Response */}
            <>
                <View style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', backgroundColor: Colors.lightGray }}>
                    <Text style={[styles.title]}>Response</Text>
                </View>
                <View style={[styles.controlContainer]}>
                    <View style={[meshStyles.item, { height: 50 }]}>
                        <Text style={[meshStyles.subject]}>Response</Text>
                        <Text >{response ? response.response : 'N/A'}</Text>
                    </View>
                    <Divider />
                    <View style={[meshStyles.item, { height: 50 }]}>
                        <Text style={[meshStyles.subject]}>Parameters</Text>
                        <Text >{response ? response.parameters : 'N/A'}</Text>
                    </View>
                    <Divider />
                    <View style={[meshStyles.item, { height: 50 }]}>
                        <Text style={[meshStyles.subject]}>Timestamp</Text>
                        <Text >{response ? response.timestamp : 'N/A'}</Text>
                    </View>
                </View>

            </>


        </View>
    );
};

const styles = StyleSheet.create({
    dataContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 25,
        paddingHorizontal: 20,
        paddingVertical: 10,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        fontWeight: '500',
        fontSize: 16,
        marginBottom: 10
    },
    name: {
        fontSize: 16
    },
    val: {
        fontWeight: '200',
        fontSize: 14
    },
    controlContainer: {
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    textInput: {
        borderColor: Colors.gray,
        borderRadius: 5,
        borderWidth: 1,
        padding: 5,
        backgroundColor: Colors.lightGray,
        width: 100,
    },
    sendButton: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5,
        minWidth: 100,
    },
    errorText: {
        color: 'red',
        fontSize: 12,
        marginTop: 5,
    }
});
