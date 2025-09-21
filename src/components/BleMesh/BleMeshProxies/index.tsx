import React, { useEffect, useRef, useState } from 'react';
import {
    Text,
    TouchableOpacity,
    StyleSheet,
    View,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Modal,
    TextInput,
    ScrollView,
    NativeEventEmitter,
    NativeModules,
    EmitterSubscription,
    Switch,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { callMeshModuleFunction, Group, meshStyles } from '../meshUtils';
import Colors from '../../../constants/Colors';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CheckBox from '@react-native-community/checkbox';
import FontAwesome5 from '@expo/vector-icons/build/FontAwesome5';
import { Snackbar } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FilterTypes = [
    { label: 'Inclusion List', value: 0x00 },
    { label: 'Exclusion List', value: 0x01 },
    // { label: 'Disable', value: null },
];

const KnownAddresses = [
    { label: 'All Proxies Address', value: 0xFFFC },
    { label: 'All Friends Address', value: 0xFFFD },
    { label: 'All Relays Addresses', value: 0xFFFE },
    { label: 'All Nodes Addresses', value: 0xFFFF },
];

const BleMeshProxies: React.FC = () => {

    const { MeshModule } = NativeModules;
    const bleMeshEmitter = new NativeEventEmitter(MeshModule);

    const [isProxyConnected, setIsProxyConnected] = useState<boolean>(false);
    const [selectedFilterType, setSelectedFilterType] = useState<number | null>();
    const [addresses, setAddresses] = useState<number[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [customAddresses, setCustomAddresses] = useState<number[]>([]);
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
    const [modalSelectedAddresses, setModalSelectedAddresses] = useState<number[]>([]);
    const [customAddress, setCustomAddress] = useState<string>('');
    const [proxy, setProxy] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');
    const [statusVisible, setStatusVisible] = useState(false);

    const [automaticConnection, setAutomaticConnection] = useState(true);

    const typeListener = useRef<EmitterSubscription>();
    const addressesListener = useRef<EmitterSubscription>();

    useEffect(() => {

        bleMeshEmitter.addListener('onNodeConnected', handleProxyConnected);

        const checkAutoConnection = async () => {
            let autoConnect = await AsyncStorage.getItem('@proxyAutoConnect')
            setAutomaticConnection(autoConnect === 'true')
        }

        checkAutoConnection();

        getProxyStatus();
        getGroups();

        return () => {
            bleMeshEmitter.removeAllListeners("onNodeConnected")
        }

    }, []);

    const handleProxyConnected = () => {
        getProxyStatus();
    }

    const handleAddressFilterUpdated = (data: any) => {
        setStatus(`Filter addresses updated, list size: ${data.listSize}`)
        setStatusVisible(true);
        if (addressesListener.current != undefined) addressesListener.current.remove();
    }

    const handleFilterTypeUpdated = (data: any) => {
        setStatus(`Filter Type updated: ${data.type === 0 ? "Inclusion List" : "Exclusion List"}`)
        setStatusVisible(true);
        if (typeListener.current != undefined) typeListener.current.remove();
    }

    const getGroups = async () => {
        let groups = await callMeshModuleFunction('getGroups') as Group[];
        setGroups(groups);
    };

    const getProxyStatus = async () => {
        let data = (await callMeshModuleFunction('getProxyStatus')) as any;

        setIsProxyConnected(data.isConnected);

        if (data.isConnected) {
            setProxy(data.proxyName)
        }
    };

    const addFilterAddresses = async (addresses: number[]) => {
        addressesListener.current = bleMeshEmitter.addListener('onProxyFilterUpdated', handleAddressFilterUpdated);

        await callMeshModuleFunction('addProxyFilterAddresses', addresses.map(address => address.toString(16)));
    };

    const updateFilterType = async (filterType: number) => {
        typeListener.current = bleMeshEmitter.addListener('onProxyFilterUpdated', handleFilterTypeUpdated);
        await callMeshModuleFunction('setProxyFilterType', filterType);
    };

    const removeAddress = async (address: number) => {
        addressesListener.current = bleMeshEmitter.addListener('onProxyFilterUpdated', handleAddressFilterUpdated);

        setAddresses(prev => prev.filter(item => item !== address));
        await callMeshModuleFunction('removeProxyFilterAddress', address.toString(16));
    };

    const toggleSelection = (value: number) => {
        if (modalSelectedAddresses.includes(value)) {
            setModalSelectedAddresses(modalSelectedAddresses.filter((item) => item !== value));
        } else {
            setModalSelectedAddresses([...modalSelectedAddresses, value]);
        }
    };

    const addCustomAddress = () => {
        // Split input on commas so user can add multiple addresses
        const addressStrings = customAddress
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        let validAddresses: number[] = [];

        addressStrings.forEach(addrStr => {
            // Parse as hexadecimal if the string starts with '0x', otherwise parse as decimal
            const parsed = addrStr.startsWith('0x')
                ? parseInt(addrStr, 16)
                : parseInt(addrStr, 10);

            // Check if parsed value is a number
            if (isNaN(parsed)) {
                Alert.alert('Invalid Address', `The address "${addrStr}" is invalid.`);
            } else if (parsed < 0 || parsed > 65535) {
                // Check if the number is within the UInt16 range
                Alert.alert('Invalid Address', `The address "${addrStr}" is out of range (0 - 65535).`);
            } else {
                validAddresses.push(parsed);
            }
        });

        // Avoid duplicates in both modal selection and custom address list
        setModalSelectedAddresses(prev => [...new Set([...prev, ...validAddresses])]);
        setCustomAddresses(prev => [...new Set([...prev, ...validAddresses])]);
        setCustomAddress('');

    };

    const onModalDone = () => {
        setAddresses(prev => [...new Set([...modalSelectedAddresses, ...prev])]);
        addFilterAddresses(modalSelectedAddresses);
        setModalSelectedAddresses([]);
        setCustomAddress('');
        setIsModalVisible(false);
    };

    const AddFilterAddressModal = () => (
        <Modal visible={isModalVisible} animationType="slide" transparent>
            <View style={styles.modalWrapper}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Add Filter Address</Text>
                    <ScrollView >
                        <Text style={styles.sectionTitle}>Add Address</Text>
                        <View style={styles.customAddressRow}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter custom address"
                                value={customAddress}
                                onChangeText={setCustomAddress}
                            />
                            <TouchableOpacity onPress={addCustomAddress} style={styles.iconButton}>
                                <Icon name="add-circle-outline" size={28} />
                            </TouchableOpacity>
                        </View>
                        {customAddresses.length > 0 && (
                            <>
                                <Text style={styles.sectionTitle}>Custom Addresses</Text>

                                {customAddresses.map((address, index) => (
                                    <View key={index} style={[styles.row, styles.modalItem, { justifyContent: 'flex-start' }]}>
                                        <CheckBox
                                            value={modalSelectedAddresses.includes(address)}
                                            onValueChange={() => {
                                                toggleSelection(address)
                                            }} />
                                        <Text style={styles.textOption}>
                                            0x{address.toString(16).toUpperCase()}
                                        </Text>
                                    </View>
                                ))}
                            </>

                        )}
                        {groups.length > 0 && (
                            <>
                                <Text style={styles.sectionTitle}>Existing Groups</Text>
                                {groups.map((item, index) => (
                                    <View key={index} style={[styles.row, styles.modalItem, { justifyContent: 'flex-start' }]} >
                                        <CheckBox
                                            value={modalSelectedAddresses.includes(item.address)}
                                            onValueChange={() => {
                                                toggleSelection(item.address)
                                            }} />
                                        <Text style={styles.textOption}>
                                            {item.name} (0x{item.address.toString(16).toUpperCase()})
                                        </Text>
                                    </View>

                                ))}
                            </>
                        )}
                        <Text style={styles.sectionTitle}>Known Addresses</Text>
                        {KnownAddresses.map((item, index) => (

                            <View key={index} style={[styles.row, styles.modalItem, { justifyContent: 'flex-start' }]}>
                                <CheckBox
                                    value={modalSelectedAddresses.includes(item.value)}
                                    onValueChange={() => {
                                        toggleSelection(item.value)
                                    }} />
                                <Text style={styles.textOption}>
                                    {item.label} (0x{item.value.toString(16).toUpperCase()})
                                </Text>
                            </View>
                        ))}


                    </ScrollView>

                    <View style={styles.modalButtonRow}>
                        <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                            <Text style={[meshStyles.textButton, { fontSize: 16 }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onModalDone}>
                            <Text style={[meshStyles.textButton, { fontSize: 16 }]}>Done</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </View>
        </Modal>
    );

    const openModal = () => {
        setIsModalVisible(true);
    };

    const onAutoConnectionChanged = () => {
        let autoConnect = !automaticConnection
        callMeshModuleFunction('updateAutomaticConnection', autoConnect);
        AsyncStorage.setItem('@proxyAutoConnect', autoConnect ? 'true' : 'false')
        setAutomaticConnection(autoConnect);
    }

    return (
        <KeyboardAvoidingView
            style={meshStyles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={100}
        >

            <Text style={[meshStyles.title, { marginBottom: 5 }]}>Proxy Configuration</Text>
            <View style={{ flex: 1 }}>
                {proxy && (
                    <Text style={{ marginBottom: 20, fontWeight: '600', color: Colors.gray, fontSize: 16 }}>Connected Proxy: {proxy} </Text>
                )}

                {/* Automatic Connection */}
                {/* {Platform.OS == 'ios' && (
                    <View style={[styles.autoContainer]}>
                        <Text style={[styles.autoText]}>Automatic Proxy Connection</Text>
                        <Switch
                            value={automaticConnection}
                            onChange={onAutoConnectionChanged}
                        />
                    </View>
                )} */}

                {!isProxyConnected && (
                    <View style={styles.warningContainer}>
                        <Text style={styles.warningTitle}>Error !</Text>
                        <Text style={styles.warningText}>
                            There is no connected proxy. Go back to the main view, select a proxy node,
                            connect it, and then come back!
                        </Text>
                    </View>
                )}

                {isProxyConnected && (
                    <>
                        {/* Filter Type */}
                        <View style={{ flexDirection: 'column' }}>
                            <Text style={[styles.label, { marginBottom: 5 }]}>Filter Type</Text>
                            <Dropdown
                                style={[meshStyles.dropdown, { flex: undefined, backgroundColor: 'white', borderWidth: 0, marginBottom: 30 }]}
                                placeholderStyle={meshStyles.placeholderStyle}
                                selectedTextStyle={meshStyles.selectedTextStyle}
                                data={FilterTypes}
                                maxHeight={200}
                                labelField="label"
                                valueField="value"
                                placeholder="Select Type"
                                value={selectedFilterType}
                                onChange={(item) => {
                                    setSelectedFilterType(item.value);
                                    updateFilterType(item.value);
                                }}
                            />
                        </View>

                        <View style={{ flexDirection: 'column' }}>
                            <View style={[styles.row, { marginBottom: 5 }]}>
                                <Text style={styles.label}>Filter Addresses</Text>
                                <TouchableOpacity onPress={openModal} disabled={selectedFilterType == null} style={{ opacity: selectedFilterType == null ? 0.5 : 1 }}>
                                    <Text style={meshStyles.textButton}>Add address</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ height: 300 }}>

                                <ScrollView>
                                    {addresses.map((address, index) => {
                                        return (
                                            <View style={styles.dataContainer} key={index}>
                                                <Text>
                                                    0x{address.toString(16).toUpperCase()} ({address})
                                                </Text>
                                                <TouchableOpacity onPress={() => removeAddress(address)}>
                                                    <FontAwesome5 name="trash-alt" size={18} color={Colors.primary} />
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                    {addresses.length == 0 && (
                                        <View style={styles.dataContainer}>
                                            <Text>
                                                No addresses
                                            </Text>
                                        </View>
                                    )}
                                </ScrollView>
                            </View>
                        </View>
                        <Snackbar
                            visible={statusVisible}
                            onDismiss={() => setStatusVisible(false)}
                            duration={5000}
                        >
                            <View style={{ flexDirection: 'row' }}>
                                <Icon name="info" size={20} color={'white'} />
                                <Text style={{ alignSelf: 'center', textAlignVertical: 'center', marginLeft: 5, fontWeight: '600', color: 'white' }}>
                                    {status}
                                </Text>
                            </View>
                        </Snackbar>
                    </>
                )}

                {AddFilterAddressModal()}
            </View>

        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    row: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        marginBottom: 5,
        fontWeight: '500',
    },
    dataContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 5,
        height: 50,
        paddingHorizontal: 20,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    // Modal styles
    modalWrapper: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        maxHeight: '80%',
        width: '100%',
        padding: 20,
        backgroundColor: 'white',
        borderTopRightRadius: 10,
        borderTopLeftRadius: 10,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 10,
    },
    sectionTitle: {
        marginTop: 15,
        fontSize: 20,
        fontWeight: '500',
    },
    modalItem: {
        padding: 5
    },
    customAddressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    input: {
        flex: 1,
        padding: 10,
        borderWidth: 0.5,
        borderRadius: 5,
        backgroundColor: 'white',
    },
    iconButton: {
        marginLeft: 10,
    },
    modalButtonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 40,

    },
    warningContainer: {
        backgroundColor: 'white',
        borderLeftWidth: 5,
        borderLeftColor: Colors.primary,
        padding: 10,
        margin: 10,
        marginTop: 10,
        borderRadius: 5,

    },
    warningTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 5,
    },
    warningText: {
        fontSize: 16,
        color: '#333',
    },
    textOption: {
        marginLeft: 7,
        fontSize: 16
    },
    autoContainer: {
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        marginBottom: 30
    },
    autoText: {
        fontSize: 16,
        fontWeight: '500'
    }

});

export default BleMeshProxies;
