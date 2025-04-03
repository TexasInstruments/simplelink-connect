import { Text, TouchableOpacity } from '../Themed';
import { StyleSheet, View, Modal } from 'react-native';
import Colors from '../../constants/Colors';
import { TextInput } from 'react-native-paper';
import { useEffect, useState } from 'react';
import { meshStyles } from './meshUtils';

export interface GenericModalData {
    title: string;
    currentValue: string;
    onClickSave: (val: any) => void;
    label: string;
}

interface Props extends GenericModalData {
    setModalVisible: any;
    visible: boolean;
}
export const GenericMeshModal: React.FC<Props> = ({ visible, title, currentValue, setModalVisible, onClickSave, label }) => {

    const [value, setValue] = useState<string>(currentValue);

    useEffect(() => {
        setValue(currentValue);
    }, [currentValue]);

    return (
        <Modal
            transparent={true}
            visible={visible}
            onRequestClose={() => {
                setModalVisible(!visible);
            }}>
            <View style={[meshStyles.modelsCenteredView]}>
                <View style={styles.modalView}>
                    <Text style={meshStyles.modalTitle}>{title}</Text>
                    <TextInput
                        mode='outlined'
                        style={[styles.textInput]}
                        numberOfLines={1}
                        label={label}
                        value={value}
                        onChangeText={setValue}
                        underlineColor="gray"
                        activeOutlineColor={Colors.active}
                    />
                    <View style={[styles.row, { marginTop: 10 }]}>
                        <TouchableOpacity onPress={() => setModalVisible(!visible)}>
                            <Text style={[styles.buttonText]}>Close</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { onClickSave(value); setModalVisible(false); }}>
                            <Text style={[styles.buttonText]}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )
};

const styles = StyleSheet.create({
    modalView: {
        width: '80%',
        alignSelf: 'center',
        backgroundColor: 'white',
        padding: 20,
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
    },
    row: {
        display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%'
    },
    textInput: {
        borderColor: 'gray',
        borderRadius: 0,
        backgroundColor: 'white',
        marginBottom: 15,
        fontSize: 16,
    },
    buttonText: {
        textAlign: 'center',
        color: Colors.blue
    }
});