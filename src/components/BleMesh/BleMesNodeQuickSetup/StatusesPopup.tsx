import React from 'react';
import {
    Text,
    TouchableOpacity,
    StyleSheet,
    View,
    Modal,
    FlatList,
} from 'react-native';
import { meshStyles } from '../meshUtils';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

interface ModelSelectionListProps {
    results: { task: string, success: boolean }[],
    isVisible: boolean,
    setIsVisible: any,
    title: string,
    unicastAddr: number
}

const StatusesPopup: React.FC<ModelSelectionListProps> = ({
    results,
    isVisible,
    setIsVisible,
    title,
    unicastAddr

}) => {

    const navigation = useNavigation()

    return (
        <Modal visible={isVisible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.header}>{title}</Text>
                    <Text style={{ marginBottom: 10, }}>{results.filter(r => r.success).length} / {results.length} successes</Text>

                    <FlatList
                        data={results}
                        keyExtractor={(item, index) => `${item.task}-${index}`}
                        renderItem={({ item }) => (
                            <View style={styles.itemRow}>
                                <Icon
                                    name={item.success ? 'check-circle' : 'error'}
                                    size={24}
                                    color={item.success ? 'green' : 'red'}
                                />
                                <Text style={styles.itemText}>{item.task}</Text>
                            </View>

                        )}
                        contentContainerStyle={{ flexGrow: 1, width: "100%" }}
                        style={{ width: "100%" }}
                        horizontal={false}
                    />
                    <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                        <TouchableOpacity onPress={() => setIsVisible(false)} style={[meshStyles.button, { alignSelf: 'flex-end', marginTop: 30 }]}>
                            <Text style={meshStyles.textButton}>Close</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => { setIsVisible(false); navigation.navigate('BleMeshConfigureNode', { unicastAddr: unicastAddr, isConnecting: false }) }} style={[meshStyles.button, { alignSelf: 'flex-end', marginTop: 30 }]}>
                            <Text style={meshStyles.textButton}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '85%',
        maxHeight: '80%', // Restrict modal height to 80%
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        alignItems: 'flex-start',
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginVertical: 5,
    },
    itemText: {
        fontSize: 14,
        marginLeft: 10,
        flex: 1,
        alignSelf: 'center'
    },
});
export default StatusesPopup;
