import { Text, TouchableOpacity } from '../../Themed';
import { StyleSheet, View, Modal, FlatList } from 'react-native';
import Colors from '../../../constants/Colors';
import { TextInput } from 'react-native-paper';
import { useEffect, useState } from 'react';
import { AddressRange, meshStyles, SceneAddress } from '../meshUtils';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

export interface SceneRangeModalData {
    title: string;
    currentValue: SceneAddress[];
    onClickSave: (val: any) => void;
}

interface Props extends SceneRangeModalData {
    setModalVisible: any;
    visible: boolean;
}
export const SceneRangeMeshModal: React.FC<Props> = ({ visible, title, currentValue, setModalVisible, onClickSave }) => {

    const [low, setLow] = useState('');
    const [high, setHigh] = useState('');
    const [currentRanges, setCurrentRanges] = useState<SceneAddress[]>([]);

    useEffect(() => {
        setCurrentRanges(currentValue);

    }, [visible])

    const isValidHex = (hex: string) => /^[0-9A-Fa-f]+$/.test(hex);

    const handleAdd = () => {
        if (!isValidHex(low.padStart(3, '0')) || !isValidHex(high.padStart(3, '0')) || parseInt(low, 16) > parseInt(high, 16)) {
            alert("Invalid range. Must be between 0x0001 and 0x7FFF.");
            return;
        }
        const newLow = parseInt(low, 16);
        const newHigh = parseInt(high, 16);

        // Check if the new range overlaps with any existing ranges
        const isOverlapping = currentRanges.some(range =>
            newLow >= range.firstScene && newHigh <= range.lastScene
        );

        if (isOverlapping) {
            alert("The new range overlaps with an existing range.");
            return;
        }
        setCurrentRanges(prev => [...prev, { firstScene: newLow, lastScene: newHigh }]);
        setLow('');
        setHigh('');
    };

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

                    {/* Existing Ranges List */}
                    <Text style={styles.subTitle}>Current Ranges</Text>
                    <View style={{ maxHeight: 220 }}>

                        <FlatList
                            data={currentRanges}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item, index }) => (
                                <View style={styles.rangeItem}>
                                    <Text style={styles.rangeText}>0x{item.firstScene.toString(16).padStart(4, '0').toLocaleUpperCase()} - 0x{item.lastScene.toString(16).padStart(4, '0').toLocaleUpperCase()}</Text>

                                    <TouchableOpacity
                                        style={{ alignSelf: 'center', marginRight: 10 }}
                                        onPress={() => setCurrentRanges(prev => prev.filter(r => !(r.firstScene === item.firstScene && r.lastScene === item.lastScene)))}
                                    >
                                        <FontAwesome5 name="trash-alt" size={20} color={Colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            )}
                            style={{ marginBottom: 20 }}

                        />
                    </View>
                    {/* Add New Range */}
                    <Text style={styles.subTitle}>Add New Range</Text>

                    <View style={styles.inputRow}>
                        <TextInput
                            mode='outlined'
                            label="Start"
                            value={low}
                            onChangeText={setLow}
                            style={styles.textInput}
                            underlineColor="gray"
                            activeOutlineColor={Colors.active}
                        />
                        <Text style={{ alignSelf: 'center', fontSize: 40 }}> - </Text>
                        <TextInput
                            mode='outlined'
                            label="End"
                            value={high}
                            onChangeText={setHigh}
                            style={styles.textInput}
                            underlineColor="gray"
                            activeOutlineColor={Colors.active}
                        />
                        <TouchableOpacity onPress={handleAdd} style={[styles.addButton, meshStyles.shadow]}>
                            <MaterialCommunityIcons
                                name={'plus'}
                                size={25}
                                color={Colors.blue}
                                style={{ alignSelf: 'center' }}
                                onPress={handleAdd}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.row, { marginTop: 30 }]}>
                        <TouchableOpacity onPress={() => setModalVisible(!visible)}>
                            <Text style={[styles.buttonText]}>Close</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { onClickSave(currentRanges); setModalVisible(false); }}>
                            <Text style={[styles.buttonText]}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )
};

const styles = StyleSheet.create({
    bullet: {
        fontSize: 25,  // Adjust the bullet size
        marginRight: 5, // Space between bullet and the text
    },
    modalView: {
        width: '85%',
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
        fontSize: 16,
        width: '35%',
        height: 40
    },
    buttonText: {
        textAlign: 'center',
        color: Colors.blue,
        fontSize: 16,
    },
    rangeItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: Colors.lightGray,
        marginBottom: 5,
        padding: 10,
        borderRadius: 50
    },
    rangeText: {
        fontSize: 16,
        alignSelf: 'center',
        marginLeft: 10
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    addButton: {
        justifyContent: 'center',
        alignSelf: 'center',
        borderColor: Colors.blue,
        borderWidth: 2,
        marginLeft: 10,
        borderRadius: 50,
        width: 30,
        height: 30,
    },
    subTitle: {
        fontWeight: "500",
        fontSize: 16,
        marginBottom: 5
    }
});