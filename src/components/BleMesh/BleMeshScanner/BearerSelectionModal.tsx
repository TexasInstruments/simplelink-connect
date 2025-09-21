import { Text, TouchableOpacity } from '../../Themed';
import { StyleSheet, View, Modal } from 'react-native';
import Colors from '../../../constants/Colors';
import { useEffect, useState } from 'react';
import { meshStyles } from '../meshUtils';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

interface ModalData {
    setModalVisible: any;
    visible: boolean;
    onSelectBearer: any;
    bearerOptions: string[] | undefined;
}

export const BearerSelectionModal: React.FC<ModalData> = ({
    visible,
    setModalVisible,
    onSelectBearer,
    bearerOptions
}) => {
    const [selectedBearer, setSelectedBearer] = useState<string>();

    useEffect(() => {
        if (bearerOptions && bearerOptions.length > 0) {
            setSelectedBearer(bearerOptions[0]);
        }
    }, [bearerOptions]);

    return (
        <Modal
            transparent={true}
            visible={visible}
            onRequestClose={() => {
                setModalVisible(!visible);
            }}>
            <View style={[meshStyles.modelsCenteredView]}>
                <View style={styles.modalView}>
                    <Text style={meshStyles.modalTitle}>Select Bearer</Text>

                    {bearerOptions?.map((option, index) => (
                        <View key={index} style={styles.radioButtonContainer}>
                            <TouchableOpacity onPress={() => setSelectedBearer(option)}>
                                {selectedBearer === option ? (
                                    <MaterialCommunityIcons
                                        name="check-circle"
                                        size={27}
                                        color={Colors.blue}
                                        style={styles.checkIcon}
                                    />
                                ) : (
                                    <MaterialIcons
                                        name="circle"
                                        size={20}
                                        color="white"
                                        style={[styles.checkIcon, { borderColor: Colors.blue, borderWidth: 1, borderRadius: 11, margin: 4 }]}
                                    />
                                )}
                            </TouchableOpacity>
                            <Text style={styles.radioLabel}>{option}</Text>
                        </View>
                    ))}

                    <View style={[styles.row, { marginTop: 20 }]}>
                        <TouchableOpacity onPress={() => setModalVisible(!visible)}>
                            <Text style={styles.buttonText}>Close</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                            if (selectedBearer) {
                                onSelectBearer(bearerOptions?.indexOf(selectedBearer));
                                setModalVisible(false);
                            }
                        }}>
                            <Text style={styles.buttonText}>Select</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalView: {
        width: '80%',
        alignSelf: 'center',
        backgroundColor: 'white',
        padding: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    buttonText: {
        textAlign: 'center',
        color: Colors.blue,
    },
    radioButtonContainer: {
        display: 'flex',
        flexDirection: 'row',
        marginBottom: 10,
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    checkIcon: {
        marginRight: 10,
    },
    radioLabel: {
        fontSize: 16,
        color: 'black',
        flex: 1
    },
});

