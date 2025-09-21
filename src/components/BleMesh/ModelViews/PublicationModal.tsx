import { Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { StyleSheet, View, Alert, Modal } from 'react-native';
import Colors from '../../../constants/Colors';
import { useEffect, useState } from 'react';
import { ApplicationKey, callMeshModuleFunction, Group, meshStyles } from '../meshUtils';
import { RadioButton, TextInput } from 'react-native-paper';
import { Dropdown } from 'react-native-element-dropdown';
import { PublicationSettings } from './GenericModelView';

interface Props {
    setModalVisible: any;
    visible: boolean;
    unicastAddress: number;
    publicationSettings: PublicationSettings | undefined;
}
const publishAddresses = [
    { label: 'Unicast Address', value: 0x0001, type: 1 },
    { label: 'Groups', value: 0xC000, type: 2 },
    { label: 'All Proxies Address', value: 0xFFFC, type: 3 },
    { label: 'All Friends Address', value: 0xFFFD, type: 4 },
    { label: 'All Relays Addresses', value: 0xFFFE, type: 5 },
    { label: 'All Nodes Addresses', value: 0xFFFF, type: 6 },
];

export const PublicationModal: React.FC<Props> = ({ visible, setModalVisible, unicastAddress, publicationSettings }) => {

    const [appKeys, setAppKeys] = useState<ApplicationKey[]>();
    const [boundedKeys, setBoundedKeys] = useState<ApplicationKey[]>([]);
    const [selectedBoundKey, setSelectedBoundKey] = useState<ApplicationKey>();
    const [selectedAddressType, setSelectedAddressType] = useState<{ label: string, value: number, type: number }>(publishAddresses[0]);
    const [selectedAddress, setSelectedAddress] = useState<string>();
    const [ttl, setTTL] = useState<number>(publicationSettings?.ttl ? publicationSettings?.ttl : 7);
    const [publishPeriodResolution, setPublishPeriodResolution] = useState<'10 minutes' | '10 seconds' | '1 second' | '100 milliseconds' | 'disabled'>('disabled');
    const [publishPeriodInterval, setPublishPeriodInterval] = useState<number>(0);
    const [publishRetransmissionCount, setPublishRetransmissionCount] = useState(-1);
    const [publishRetransmissionInterval, setPublishRetransmissionInterval] = useState(0);
    const [useExistingGroup, setUseExistingGroup] = useState<boolean>(true);
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<Group>();
    const [newGroupName, setNewGroupName] = useState<string>('My Group');
    const [newGroupAddress, setNewGroupAddress] = useState<string>('');

    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        getAppKeys().then(() => {
            if (publicationSettings?.appKeyIndex != undefined) {
                const boundKey = appKeys?.find(key => key.index === publicationSettings?.appKeyIndex);
                if (boundKey) {
                    setSelectedBoundKey(boundKey);
                }
            }
            if (publicationSettings?.appKeyIndex != undefined) {
                const boundKey = appKeys?.find(key => key.index === publicationSettings?.appKeyIndex);
                if (boundKey) {
                    setSelectedBoundKey(boundKey);
                }
            }
            if (publicationSettings?.publicationSteps != undefined) {
                setPublishPeriodInterval(publicationSettings?.publicationSteps);
            }
            if (publicationSettings?.publishAddress != undefined && publicationSettings?.publishAddress != "Not Assigned") {
                setSelectedAddress(publicationSettings?.publishAddress.toString(16));
            }
            if (publicationSettings?.publishRetransmitCount != undefined) {
                if (publicationSettings?.publishRetransmitCount == 0){
                    setPublishRetransmissionCount(-1);
                }
                else{
                    setPublishRetransmissionCount(publicationSettings?.publishRetransmitCount);
                }
            }
            if (publicationSettings?.ttl != undefined) {
                setTTL(publicationSettings?.ttl);
            }
        })

        getGroups();
        generateGroupAddress();
        setIsLoading(false)

        return () => {
            setIsLoading(false)
        };

    }, [visible]);

    useEffect(() => {
        getBoundApplicationKey();
    }, [appKeys]);

    const getBoundApplicationKey = async () => {
        try {
            const boundKeysIndexes = await callMeshModuleFunction('getModelBoundKeys') as number[];

            // Use filter with includes to get bound keys
            const boundKeys = appKeys?.filter(key => boundKeysIndexes.includes(key.index));

            if (boundKeys && boundKeys.length > 0) {
                setSelectedBoundKey(boundKeys[0]);
                setBoundedKeys(boundKeys);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const getGroups = async () => {
        let groups = await callMeshModuleFunction('getGroups') as Group[];
        setGroups(groups);
        setNewGroupName('My Group ' + (groups.length + 1));
    };

    const generateGroupAddress = async () => {
        let address = await callMeshModuleFunction('generateGroupAddress', newGroupName) as number;
        if (address !== -1) {
            setNewGroupAddress(address.toString(16));
        }
    };

    const getAppKeys = async () => {
        try {
            const appKeys = await callMeshModuleFunction('getProvisionedNodeAppKeys', unicastAddress) as ApplicationKey[];
            if (appKeys) setAppKeys(appKeys);
        } catch (e) {
            console.error(e);
        }
    };

    const isFormValid = () => {
        return selectedBoundKey != null &&
            selectedAddressType != null &&
            selectedAddress != null &&
            ttl >= 0 && ttl <= 255 &&
            (
                // If using groups:
                (selectedAddressType?.label === 'Groups' &&
                    ((useExistingGroup && selectedGroup != null) || (!useExistingGroup && newGroupName && newGroupAddress)))
                ||
                // If not groups, any selectedAddress works
                selectedAddressType?.label !== 'Groups'
            );
    }


    const handleApply = async () => {
        setIsLoading(true)
        // Apply settings
        try {
            let address = selectedAddress;
            if (!selectedAddressType) {
                Alert.alert("Error", "Address type is required")
                return
            };
            if (selectedAddressType.label === 'Groups') {
                if (!useExistingGroup) {
                    let response = await callMeshModuleFunction('createNewGroup', newGroupName, parseInt(newGroupAddress, 16)) as { success: boolean, address: number, error?: string };
                    if (response.success) {
                        address = response.address.toString(16);
                        setSelectedAddress(address);
                    }
                    else {
                        Alert.alert('Failed to apply publication', response.error ?? 'Unknown error');
                        setIsLoading(false)
                        return
                    }
                }
                else {
                    if (selectedGroup) {
                        address = selectedGroup?.address.toString(16);
                        setSelectedAddress(address);
                    }
                }

            }
            if (ttl < 0 || ttl > 255) {
                Alert.alert("Error", "TTL must be between 0 and 255.");
                return;
            }

            let addressType = selectedAddressType.type;

            await callMeshModuleFunction('setPublication',
                unicastAddress,
                addressType,
                selectedBoundKey?.index,
                ttl,
                address?.padStart(4, '0'),
                publishPeriodInterval,
                publishPeriodResolution,
                publishRetransmissionCount,
                publishRetransmissionInterval,
            )

            setModalVisible(!visible);
        } catch (e) {
            console.log(e)
            Alert.alert('Failed to apply publication', e instanceof Error ? e.message : String(e));
            setIsLoading(false)
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
                        <Text style={meshStyles.title}>Set Publication</Text>
                        {/* Address */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>

                                <Text style={styles.label}>Publish Address</Text>
                                <Dropdown
                                    style={[meshStyles.dropdown]}
                                    placeholderStyle={meshStyles.placeholderStyle}
                                    selectedTextStyle={meshStyles.selectedTextStyle}
                                    data={publishAddresses}
                                    maxHeight={200}
                                    labelField="label"
                                    valueField="value"
                                    placeholder=''
                                    value={selectedAddressType}
                                    onChange={(item) => {
                                        setSelectedAddressType(item);
                                        setSelectedAddress(item.value.toString(16));
                                    }}
                                />
                            </View>

                            {selectedAddressType?.label !== 'Groups' && (
                                <View style={{ flexDirection: 'column' }}>
                                    <Text style={styles.label}>Address (hex)</Text>
                                    <TextInput
                                        mode='outlined'
                                        style={[styles.textInput, { marginLeft: 10 }]}
                                        value={selectedAddress}
                                        onChangeText={setSelectedAddress}
                                        underlineColor="gray"
                                        activeOutlineColor={Colors.active}
                                        disabled={selectedAddressType?.label !== 'Unicast Address'}
                                    />
                                </View>
                            )}

                        </View>

                        {selectedAddressType?.label === 'Groups' && (
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
                                            onPress={() => setUseExistingGroup(false)} />

                                    </View>
                                    <Text>Create new group to subscribe</Text>

                                </View>

                                {
                                    !useExistingGroup && (
                                        <View style={{ marginLeft: 30, marginBottom: 10 }}>
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

                        {/* App key */}
                        <Text style={styles.label}>App Key </Text>
                        <Dropdown
                            style={[meshStyles.dropdown]}
                            placeholderStyle={meshStyles.placeholderStyle}
                            selectedTextStyle={meshStyles.selectedTextStyle}
                            data={boundedKeys}
                            maxHeight={200}
                            labelField="name"
                            valueField="index"
                            placeholder='Key'
                            value={selectedBoundKey}
                            onChange={(item) => setSelectedBoundKey(item)}
                        />
                        {/* TTL */}
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>TTL</Text>
                            <TextInput
                                mode='outlined'
                                keyboardType='number-pad'
                                returnKeyType="done"
                                style={styles.textInput}
                                value={ttl.toString()}
                                onChangeText={(v) => setTTL(Number(v))}
                                underlineColor="gray"
                                activeOutlineColor={Colors.active}
                            />
                        </View>

                        {/* Publish Period */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <Text style={styles.label}>Resolution</Text>
                                <Dropdown
                                    style={[meshStyles.dropdown]}
                                    placeholderStyle={meshStyles.placeholderStyle}
                                    selectedTextStyle={meshStyles.selectedTextStyle}
                                    data={[
                                        { name: 'disabled' },
                                        { name: '10 minutes' },
                                        { name: '10 seconds' },
                                        { name: '1 second' },
                                        { name: '100 milliseconds' }
                                    ]}
                                    maxHeight={200}
                                    labelField="name"
                                    valueField="name"
                                    placeholder='Resolution'
                                    value={publishPeriodResolution}
                                    onChange={(item) => setPublishPeriodResolution(item.name)}
                                    dropdownPosition='top'

                                />
                            </View>
                            <View style={{ flex: 1 }} >
                                <Text style={styles.label}> Publish Period Interval</Text>
                                <TextInput
                                    mode='outlined'
                                    keyboardType='number-pad'
                                    returnKeyType="done"
                                    style={styles.textInput}
                                    value={publishPeriodInterval.toString()}
                                    onChangeText={(v) => setPublishPeriodInterval(Number(v))}
                                    underlineColor="gray"
                                    activeOutlineColor={Colors.active}
                                    disabled={publishPeriodResolution == 'disabled'}

                                />
                            </View>

                        </View>


                        {/* Publish Retransmission Count and Interval */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <Text style={styles.label}>Retransmission Count</Text>
                                <Dropdown
                                    style={[meshStyles.dropdown]}
                                    placeholderStyle={meshStyles.placeholderStyle}
                                    selectedTextStyle={[meshStyles.selectedTextStyle]}
                                    data={[
                                        { name: 'disabled', value: -1 },
                                        { name: '1', value: 1 },
                                        { name: '2', value: 2 },
                                        { name: '3', value: 3 },
                                        { name: '4', value: 4 },
                                        { name: '5', value: 5 },
                                        { name: '6', value: 6 },
                                        { name: '7', value: 7 },
                                    ]}
                                    maxHeight={200}
                                    labelField="name"
                                    valueField="value"
                                    value={publishRetransmissionCount}
                                    onChange={(item) => setPublishRetransmissionCount(item.value)}
                                    dropdownPosition='top'
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Interval [ms]</Text>
                                <TextInput
                                    keyboardType='number-pad'
                                    returnKeyType="done"
                                    mode='outlined'
                                    style={styles.textInput}
                                    value={publishRetransmissionInterval?.toString()}
                                    onChangeText={(v) => setPublishRetransmissionInterval(Number(v))}
                                    underlineColor="gray"
                                    activeOutlineColor={Colors.active}
                                    disabled={publishRetransmissionCount == -1}
                                />
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}>
                            <TouchableOpacity onPress={() => setModalVisible(!visible)}>
                                <Text style={[meshStyles.modalTextButton]}>Close</Text>
                            </TouchableOpacity>
                            {!isLoading ? (
                                <TouchableOpacity onPress={handleApply} disabled={!isFormValid()}>
                                    <Text style={[meshStyles.modalTextButton, { opacity: isFormValid() ? 1 : 0.2 }]}>Apply</Text>
                                </TouchableOpacity>
                            ) :
                                (
                                    <ActivityIndicator size="small" color={Colors.blue} />
                                )}

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
        borderRadius: 15,
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

export default PublicationModal;
