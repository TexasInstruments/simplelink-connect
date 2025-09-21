import { Text, TouchableOpacity } from '../../Themed';
import { StyleSheet, View, Alert, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Colors from '../../../constants/Colors';
import { TextInput } from 'react-native-paper';
import { useEffect, useState } from 'react';
import { callMeshModuleFunction, Group, meshStyles } from '../meshUtils';

interface Props {
    setModalVisible: any;
    visible: boolean;
    groups: Group[];
}

export const CreateGroupDialog: React.FC<Props> = ({ visible, groups, setModalVisible }) => {

    const [groupName, setGroupName] = useState<string>('My Group ' + (groups.length + 1));
    const [groupAddress, setGroupAddress] = useState<string>('');

    useEffect(() => {
        if (visible) {
            generateNewGroup();
        }
    }, [visible])

    const generateNewGroup = async () => {
        try {
            const address = await callMeshModuleFunction('generateGroupAddress', groupName) as number;
            if (address !== -1) {
                setGroupAddress(address.toString(16));
                setGroupName('My Group ' + (groups.length + 1));
            }
        }
        catch (e) { console.error(e) }
    };

    const addGroup = async () => {
        if (groupAddress && groupName) {
            if (!/^[0-9A-Fa-f]+$/.test(groupAddress)) {
                Alert.alert("Invalid Address", "Address need to contain only hexadecimal characters (0-9, A-F).");
                return;
            }
            try {
                let res = await callMeshModuleFunction('createNewGroup', groupName, parseInt(groupAddress, 16)) as { success: boolean, address: number, error?: string };
                if (!res.success) {
                    const errorMessage = res.error || "An unknown error occurred";
                    Alert.alert("Error Creating Group", errorMessage);
                }
            } catch (e) {
                const errorMessage = e.message || "An unknown error occurred";
                Alert.alert("Error Creating Group", errorMessage);
            }
        } else {
            Alert.alert("Error Creating Group", "Please generate a key first");
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
                        <Text style={meshStyles.modalTitle}>Create New Group</Text>
                        <TextInput
                            mode='outlined'
                            style={styles.textInput}
                            label={'Name'}
                            value={groupName}
                            onChangeText={setGroupName}
                            underlineColor="gray"
                            activeOutlineColor={Colors.active}
                            numberOfLines={1}
                            multiline={false}
                        />
                        <TextInput
                            mode='outlined'
                            style={styles.textInput}
                            label={'Address (hex)'}
                            value={groupAddress}
                            onChangeText={setGroupAddress}
                            underlineColor="gray"
                            activeOutlineColor={Colors.active}
                            numberOfLines={1}
                            multiline={false}
                        />
                        <View style={styles.row}>
                            <TouchableOpacity onPress={() => setModalVisible(!visible)}>
                                <Text style={meshStyles.modalTextButton}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { addGroup(); setModalVisible(false); }}>
                                <Text style={meshStyles.modalTextButton}>Save</Text>
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
});
