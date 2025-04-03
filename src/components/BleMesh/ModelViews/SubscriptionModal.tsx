import { Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { StyleSheet, NativeModules, View, Alert, Modal, NativeEventEmitter } from 'react-native';
import Colors from '../../../constants/Colors';
import { useEffect, useState } from 'react';
import { callMeshModuleFunction, Group, meshStyles } from '../meshUtils';
import { RadioButton, TextInput } from 'react-native-paper';
import { Dropdown } from 'react-native-element-dropdown';

interface Props {
    setModalVisible: any;
    visible: boolean;
    unicastAddress: number;
}

const SubscriptionAddresses = [
    { label: 'Groups', value: 0xC000, type: 2 },
    // { label: 'Unicast Address', value: 0x0001, type: 1 },
    { label: 'All Proxies', value: 0xFFFC, type: 3 },
    { label: 'All Friends', value: 0xFFFD, type: 4 },
    { label: 'All Relays', value: 0xFFFE, type: 5 },
    // { label: 'Virtual Address', value: 0x0001, type: 7 },
];

export const SubscriptionModal: React.FC<Props> = ({ visible, setModalVisible, unicastAddress }) => {

    const [selectedAddressType, setSelectedAddressType] = useState(SubscriptionAddresses[0]);
    const [selectedAddress, setAddress] = useState<number>(SubscriptionAddresses[0].value);
    const [useExistingGroup, setUseExistingGroup] = useState<boolean>(true);
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<Group>();
    const [newGroupName, setNewGroupName] = useState<string>('My Group');
    const [newGroupAddress, setNewGroupAddress] = useState<string>('');


    useEffect(() => {
        getGroups();
        generateGroupAddress();
    }, [visible]);

    const getGroups = async () => {
        let groups = await callMeshModuleFunction('getGroups') as Group[];
        setGroups(groups);
        setNewGroupName('My Group ' + (groups.length + 1));
    }

    const handleApply = async () => {
        // Apply settings
        try {
            let addressType = selectedAddressType.type;
            if (addressType === 2) { // GROUPS
                if (useExistingGroup) {
                    await callMeshModuleFunction('subscribeToExistingGroup', unicastAddress, selectedGroup?.address);
                }
                else {
                    let groupAddress = parseInt(newGroupAddress, 16);
                    await callMeshModuleFunction('subscribeToNewGroup', unicastAddress, newGroupName, groupAddress);
                }
            }
            else {
                await callMeshModuleFunction('subscribe', unicastAddress, selectedAddress);

            }
            setModalVisible(false);

        } catch (e) {
            Alert.alert('Error', 'Failed to apply subscription: ' + e);
        }
    }

    const generateGroupAddress = async () => {
        let address = await callMeshModuleFunction('generateGroupAddress', newGroupName) as number;
        if (address !== -1) {
            setNewGroupAddress(address.toString(16));
        }
    }

    return (
        <Modal
            transparent={true}
            visible={visible}
            onRequestClose={() => {
                setModalVisible(!visible);
            }}>
            <KeyboardAvoidingView
                style={styles.centeredView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} >
                <View style={styles.modalContainer}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <Text style={[meshStyles.title, { marginBottom: 0 }]}>Subscribe</Text>
                        <Text style={[meshStyles.text, { marginBottom: 20 }]}> Subscription address for this model</Text>
                        {/* Address */}
                        <Text style={styles.label}>Address Type</Text>
                        <Dropdown
                            style={[meshStyles.dropdown]}
                            placeholderStyle={meshStyles.placeholderStyle}
                            selectedTextStyle={meshStyles.selectedTextStyle}
                            data={SubscriptionAddresses}
                            maxHeight={200}
                            labelField="label"
                            valueField="value"
                            placeholder='Select address type'
                            value={selectedAddressType}
                            onChange={(item) => {
                                setSelectedAddressType(item);
                                setAddress(item.value);
                            }}
                        />
                        {selectedAddressType.label === 'Groups' && (
                            <View>
                                <View style={[styles.radioButtonContainer]}>
                                    <View
                                        style={{
                                            borderWidth: Platform.OS === 'ios' ? 1 : 0,
                                            borderColor: '#007BFF',
                                            borderRadius: 100,
                                            transform: [{ scale: 0.75 }]
                                        }}
                                    >
                                        <RadioButton
                                            color="#007BFF"
                                            value="first"
                                            status={useExistingGroup ? 'checked' : 'unchecked'}
                                            onPress={() => setUseExistingGroup(true)}
                                        />
                                    </View>

                                    <Text> Use existing group</Text>

                                </View>

                                {
                                    useExistingGroup && (
                                        <Dropdown
                                            style={[meshStyles.dropdown, { marginLeft: 30 }]}
                                            placeholderStyle={meshStyles.placeholderStyle}
                                            selectedTextStyle={meshStyles.selectedTextStyle}
                                            data={groups}
                                            maxHeight={200}
                                            labelField="name"
                                            valueField="address"
                                            placeholder='Select group'
                                            value={selectedGroup}
                                            onChange={(item) => {
                                                setSelectedGroup(item);
                                            }}
                                        />
                                    )
                                }

                                <View style={[styles.radioButtonContainer]}>
                                    <View
                                        style={{
                                            borderWidth: Platform.OS === 'ios' ? 1 : 0,
                                            borderColor: '#007BFF',
                                            borderRadius: 100,
                                            transform: [{ scale: 0.75 }]
                                        }}
                                    >
                                        <RadioButton
                                            color="#007BFF"
                                            value="second"
                                            status={!useExistingGroup ? 'checked' : 'unchecked'}
                                            onPress={() => setUseExistingGroup(false)}
                                        />
                                    </View>
                                    <Text>Create new group to subscribe</Text>

                                </View>

                                {
                                    !useExistingGroup && (
                                        <View style={{ marginLeft: 30 }}>
                                            <Text style={styles.label}>Name</Text>
                                            <TextInput
                                                mode='outlined'
                                                style={[styles.textInput]}
                                                value={newGroupName}
                                                onChangeText={setNewGroupName}
                                                underlineColor="gray"
                                                activeOutlineColor={Colors.active}
                                            />

                                            <Text style={styles.label}>Address</Text>
                                            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                                <Text>0x</Text>
                                                <TextInput
                                                    mode='outlined'
                                                    style={[styles.textInput, { marginLeft: 5, marginBottom: 0, flex: 1 }]}
                                                    value={newGroupAddress}
                                                    onChangeText={setNewGroupAddress}
                                                    underlineColor="gray"
                                                    activeOutlineColor={Colors.active}
                                                />
                                            </View>
                                        </View>
                                    )
                                }
                            </View>

                        )}

                        {selectedAddressType.label !== 'Groups' && (
                            <>

                                <Text style={styles.label}>Address</Text>
                                <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                    <Text>0x</Text>
                                    <TextInput
                                        mode='outlined'
                                        style={[styles.textInput, { marginLeft: 5, marginBottom: 0, flex: 1 }]}
                                        value={selectedAddress.toString(16).toLocaleUpperCase()}
                                        onChangeText={(v) => setAddress(Number(v))}
                                        underlineColor="gray"
                                        activeOutlineColor={Colors.active}
                                        disabled={selectedAddressType.label !== 'Unicast Address' && selectedAddressType.label !== 'Groups'}
                                    />
                                </View>

                            </>
                        )}


                        {/* Actions Buttons */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 }}>
                            <TouchableOpacity onPress={() => setModalVisible(!visible)}>
                                <Text style={{ textAlign: 'center', color: Colors.blue }}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleApply}>
                                <Text style={{ textAlign: 'center', color: Colors.blue }}>Apply</Text>
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        flexGrow: 1,
        justifyContent: 'flex-start',
    },
    modalContainer: {
        width: '100%',
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 35,
        paddingBottom: 50,
    },
    scrollContent: {
        // paddingBottom: 40,
    },
    label: {
        fontSize: 14,
        marginBottom: 5,
        fontWeight: '500'
    },
    textInput: {
        borderColor: 'gray',
        borderRadius: 8,
        backgroundColor: 'white',
        marginBottom: 15,
        fontSize: 14,
        height: 50,
    },
    radioButtonContainer: {
        display: 'flex',
        flexDirection: 'row',
        marginBottom: 10,
        alignItems: 'center'
    }
});

