import { Text, TouchableOpacity } from '../../Themed';
import { StyleSheet, View, Alert, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Colors from '../../../constants/Colors';
import { TextInput } from 'react-native-paper';
import { useEffect, useState } from 'react';
import { callMeshModuleFunction, meshStyles } from '../meshUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
    setModalVisible: any;
    visible: boolean;
    netKeys: any[];
    setNetKeys: any;
}

export const AddNetworkKeyDialog: React.FC<Props> = ({ visible, setNetKeys, netKeys, setModalVisible }) => {

    const insets = useSafeAreaInsets();
    const [newKeyName, setNewKeyName] = useState<string>('');
    const [newKeyVal, setNewKeyVal] = useState<string>('');

    useEffect(() => {
        if (visible) {
            generateNewKey();
        }
    }, [visible])

    const generateNewKey = async () => {
        try {
            const newKey = await callMeshModuleFunction('generateNetworksKey') as { key: string, name: string };
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
                const newNetKey = await callMeshModuleFunction('addNetworksKey', newKeyName, newKeyVal) as { key: string, name: string };
                const timestamp = newNetKey.timestamp;
                const dateStr = new Date(Platform.OS === 'android' ? Number(timestamp) : Number(timestamp * 1000)).toLocaleString();
                newNetKey.timestamp = dateStr;

                // Update the state with the new key if necessary
                setNetKeys([...netKeys, newNetKey]);
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
                <View style={[styles.modalContainer, { paddingBottom: 10 + insets.bottom }]}>
                    <ScrollView contentContainerStyle={styles.modalView}>
                        <Text style={meshStyles.modalTitle}>Add Network Key</Text>
                        <TextInput
                            mode='outlined'
                            style={styles.textInput}
                            label={'Name'}
                            value={newKeyName}
                            onChangeText={setNewKeyName}
                            underlineColor="gray"
                            activeOutlineColor={Colors.active}
                            numberOfLines={1}
                            multiline={false}
                            accessibilityLabel="name"
                        />
                        <TextInput
                            mode='outlined'
                            style={styles.textInput}
                            label={'Key'}
                            value={newKeyVal}
                            onChangeText={setNewKeyVal}
                            underlineColor="gray"
                            activeOutlineColor={Colors.active}
                            numberOfLines={1}
                            multiline={false}
                            onFocus={() => console.log("Focused on Key Input")}
                        />
                        <View style={styles.row}>
                            <TouchableOpacity onPress={() => setModalVisible(!visible)}>
                                <Text style={[meshStyles.modalTextButton]}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { addNewKey(); setModalVisible(false); }} accessibilityLabel="save">
                                <Text style={[meshStyles.modalTextButton]}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',  // Darkens the background
    },
    modalContainer: {
        width: '100%',
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 35,
    },
    modalView: {
        flexGrow: 1,
        justifyContent: 'flex-start',
    },
    row: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 10,
    },
    textInput: {
        borderColor: 'gray',
        backgroundColor: 'white',
        marginBottom: 15,
        fontSize: 16,
        overflow: 'hidden',
        height: 50
    },
    closeText: {
        textAlign: 'center',
        color: Colors.blue,
    },
    saveText: {
        textAlign: 'center',
        color: Colors.blue,
    },
});
