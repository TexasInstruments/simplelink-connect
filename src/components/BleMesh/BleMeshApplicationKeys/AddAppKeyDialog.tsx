import { Text, TouchableOpacity } from '../../Themed';
import { StyleSheet, View, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Colors from '../../../constants/Colors';
import { TextInput } from 'react-native-paper';
import { useEffect, useState } from 'react';
import { ApplicationKey, callMeshModuleFunction, meshStyles } from '../meshUtils';

interface Props {
    setModalVisible: any;
    visible: boolean;
    appKeys: any[];
    setAppKeys: any;
}
export const AddAppKeyDialog: React.FC<Props> = ({ visible, setAppKeys, appKeys, setModalVisible }) => {

    const [newKeyName, setNewKeyName] = useState<string>('');
    const [newKeyVal, setNewKeyVal] = useState<string>('');

    useEffect(() => {
        if (visible) {
            generateNewKey();
        }
    }, [visible])

    const generateNewKey = async () => {
        try {
            const newKey = await callMeshModuleFunction('generateAppKey') as ApplicationKey;
            if (newKey) {
                setNewKeyVal(newKey.key);
                setNewKeyName(newKey.name);
                return newKey;
            }
            return null;
        }
        catch (e) { console.error(e) }
    };

    const addNewKey = async () => {

        if (newKeyName && newKeyVal) {
            if (!/^[0-9A-Fa-f]+$/.test(newKeyVal)) {
                Alert.alert("Invalid Key", "The key must contain only hexadecimal characters (0-9, A-F).");
                return;
            }
            if (newKeyVal.length != 32) {
                Alert.alert("Invalid Key", "The key must be 16 bytes");
                return;
            }
            try {
                const newAppKey = await callMeshModuleFunction('addAppKey', newKeyName, newKeyVal) as ApplicationKey;

                // Update the state with the new key if necessary
                setAppKeys([...appKeys, newAppKey]);
            } catch (e) {
                const errorMessage = e.message || "An unknown error occurred";
                Alert.alert("Error", errorMessage);
            }
        } else {
            Alert.alert("Error", "Please generate a key first");
        }
    };

    return (
        <Modal
            transparent={true}
            visible={visible}
            onRequestClose={() => {
                setModalVisible(!visible);
            }}>
            <KeyboardAvoidingView
                style={styles.centeredView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // Adjust behavior for iOS and Android
            >
                <View style={styles.modalContainer}>
                    <ScrollView contentContainerStyle={styles.modalView}>

                        <Text style={meshStyles.modalTitle}>Add Application Key</Text>
                        <TextInput
                            mode='outlined'
                            style={[styles.textInput]}
                            label={'Name'}
                            value={newKeyName}
                            onChangeText={setNewKeyName}
                            underlineColor="gray"
                            activeOutlineColor={Colors.active}
                        />
                        <TextInput
                            mode='outlined'
                            style={[styles.textInput]}
                            label={'Key'}
                            value={newKeyVal}
                            onChangeText={setNewKeyVal}
                            underlineColor="gray"
                            activeOutlineColor={Colors.active}
                        />
                        <View style={[styles.row, { marginTop: 10 }]}>
                            <TouchableOpacity onPress={() => setModalVisible(!visible)} style={[meshStyles.modalButton]}>
                                <Text style={[meshStyles.modalTextButton]}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { addNewKey(); setModalVisible(false); }} style={[meshStyles.modalButton]}>
                                <Text style={[meshStyles.modalTextButton]}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>

                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: '100%',
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 35,
        paddingBottom: 50,
    },
    modalView: {
        flexGrow: 1,
        justifyContent: 'flex-start',
    },
    row: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%'
    },
    container: {
        height: '100%',
        padding: 30,
        backgroundColor: Colors.lightGray
    },
    text: {
        color: Colors.gray
    },
    textInput: {
        borderColor: 'gray',
        borderRadius: 0,
        backgroundColor: 'white',
        marginBottom: 15,
        fontSize: 16,
        overflow: 'hidden',
        height: 50
    },

});