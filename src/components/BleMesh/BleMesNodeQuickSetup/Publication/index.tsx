import React, { useEffect, useState } from 'react';
import {
    Text,
    TouchableOpacity,
    StyleSheet,
    View,
    ScrollView,
    NativeEventEmitter,
    NativeModules,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { ApplicationKey, callMeshModuleFunction, Element, Group, meshStyles, Model } from '../../meshUtils';
import Colors from '../../../../constants/Colors';
import { MaterialCommunityIcons, MaterialIcons, Octicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TextInput } from 'react-native-paper';
import ModelSelectionList from '../ModelSelectionList';
import StatusesPopup from '../StatusesPopup';

export interface NetworkKey {
    expand?: boolean;
    index: number;
    key: string;
    name: string;
    timestamp: string;
}


const BleMeshSetPublicationModelsScreen: React.FC = ({ route }) => {
    const { MeshModule } = NativeModules;
    const bleMeshEmitter = new NativeEventEmitter(MeshModule);
    const { unicastAddr, elements } = route.params;

    const [applicationKeys, setApplicationKeys] = useState<ApplicationKey[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [selectedAddress, setSelectedAddress] = useState<string>();
    const [selectedModels, setSelectedModels] = useState<{ modelId: number, elementId: number, modelType: string }[]>([]);
    const [selectedApplicationKeyIdx, setSelectedApplicationKeyIdx] = useState<number>();
    const [isVisible, setIsVisible] = useState(false);
    const [results, setResults] = useState<{ task: string, success: boolean }[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [useExistingGroup, setUseExistingGroup] = useState<boolean>(true);
    const [newGroupName, setNewGroupName] = useState<string>('My Group');
    const [newGroupAddress, setNewGroupAddress] = useState<string>('');
    const [ttl, setTTL] = useState<number>(7);
    const [publishPeriodResolution, setPublishPeriodResolution] = useState<'10 minutes' | '10 seconds' | '1 second' | '100 milliseconds' | 'disabled'>('disabled');
    const [publishPeriodInterval, setPublishPeriodInterval] = useState<number>(0);
    const [publishRetransmissionCount, setPublishRetransmissionCount] = useState<number>(-1);
    const [publishRetransmissionInterval, setPublishRetransmissionInterval] = useState(0);

    const navigation = useNavigation();

    useEffect(() => {
        const listener = bleMeshEmitter.addListener('onPublicationDone', handlePublicationDone);
        setLoading(false);

        getGroups();
        checkConnectionStatus();
        getApplicationKeys();

        return () => {
            listener.remove();
        };
    }, []);

    const getApplicationKeys = async () => {
        const keys = await callMeshModuleFunction('getMeshApplicationsKeys') as ApplicationKey[];
        setApplicationKeys(keys);
        setSelectedApplicationKeyIdx(keys[0].index);
    };

    const checkConnectionStatus = async () => {
        try {
            let isConnected = await callMeshModuleFunction('isDeviceConnected', unicastAddr) as boolean;
            if (!isConnected) {
                Alert.alert("Device disconnected")
                navigation.navigate('BleMesh')
            }

        } catch (e) {
            console.error(e)
        }

    };

    const generateGroupAddress = async () => {
        let address = await callMeshModuleFunction('generateGroupAddress', newGroupName) as number;
        if (address !== -1) {
            setNewGroupAddress(address.toString(16));
        }
    };

    const handlePublicationDone = (data: any) => {
        getGroups();
        setResults(data);
        setIsVisible(true);
        setLoading(false);
    };

    const getGroups = async () => {
        let groups = await callMeshModuleFunction('getGroups') as Group[];
        setGroups(groups);
        generateGroupAddress();
        setNewGroupName('My Group ' + (groups.length + 1));

        if (groups.length <= 0) {
            setUseExistingGroup(false);
        }
        else {
            setSelectedGroup(groups[0]);
            setUseExistingGroup(true);
        }
    };

    const handleSetPublicationModels = async () => {
        try {
            setLoading(true);
            let address = selectedAddress;

            if (!useExistingGroup) {
                if (!/^[0-9A-Fa-f]{1,4}$/.test(newGroupAddress)) {
                    alert("Invalid group address! Must be a hex value (0xC000 - 0xFEFF).");
                    setLoading(false);
                    return;
                }

                const parsedAddress = parseInt(newGroupAddress, 16);
                if (isNaN(parsedAddress) || parsedAddress < 0xC000 || parsedAddress > 0xFEFF) {
                    alert("Invalid group address! Must be within 0xC000 - 0xFEFF.");
                    setLoading(false);
                    return;
                }

                let res = await callMeshModuleFunction('createNewGroup', newGroupName, parseInt(newGroupAddress, 16)) as { success: boolean, address: number, error?: string };
                if (res.success) {
                    address = res.address.toString(16);
                    setSelectedAddress(address);
                }
                else {
                    Alert.alert(res.error || "Error creating new group");
                    setLoading(false);
                    return
                }
            }
            else {
                if (selectedGroup) {
                    address = selectedGroup?.address.toString(16);
                    setSelectedAddress(address);
                }
            }

            if (ttl < 0 || ttl > 255) {
                Alert.alert("Error", "TTL must be between 0 and 255.");
                setLoading(false);

                return;
            }

            let message = await callMeshModuleFunction('setPublicationToModelList',
                unicastAddr,
                address,
                selectedModels,
                selectedApplicationKeyIdx,
                ttl,
                publishPeriodInterval,
                publishPeriodResolution,
                publishRetransmissionCount,
                publishRetransmissionInterval,
            )

        } catch (err) {
            Alert.alert(err.toString());
        }
    }

    const disabledModels = () => {
        let disabledModels: Model[] = []
        elements.map((element: Element) => {
            element.models.map((model) => {
                if (!model.isPublishSupported) {
                    disabledModels.push(model)
                }
            })
        })
        return disabledModels
    }

    return (
        <SafeAreaView
            style={meshStyles.container} edges={['left', 'right', 'bottom']}
        >
            <Text style={meshStyles.title}>Models Publication</Text>

            <ScrollView style={{ height: '100%' }} contentContainerStyle={{ paddingBottom: 50 }}>
                <View style={{ flexDirection: 'column' }}>
                    <Text style={[styles.label, { marginBottom: 5 }]}>Select Destination Groups </Text>
                    <View style={{ marginBottom: 20, }}>
                        {
                            !(groups.length > 0) && (
                                <Text style={{ marginBottom: 5, fontWeight: '600', color: Colors.gray, fontSize: 14 }}>There are no groups in your network, please create one</Text>
                            )
                        }
                        <View>
                            {groups.length > 0 && (
                                <>
                                    <View style={[styles.radioButtonContainer]}>
                                        <TouchableOpacity onPress={() => setUseExistingGroup(!useExistingGroup)}>
                                            {useExistingGroup ? (
                                                <MaterialCommunityIcons name="check-circle" size={20} color={Colors.blue} style={styles.checkIcon} />
                                            ) : (
                                                <MaterialIcons name="circle" size={20} color='white' style={styles.checkIcon} />
                                            )}
                                        </TouchableOpacity>
                                        <Text>Use existing group</Text>
                                    </View>

                                    {
                                        useExistingGroup && (
                                            <Dropdown
                                                style={[meshStyles.dropdown, { marginLeft: 30, backgroundColor: 'white', borderWidth: 0, marginBottom: 10 }]}
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
                                </>
                            )}

                            <View style={[styles.radioButtonContainer]}>
                                <TouchableOpacity onPress={() => setUseExistingGroup(!useExistingGroup)}>
                                    {!useExistingGroup ? (
                                        <MaterialCommunityIcons name="check-circle" size={20} color={Colors.blue} style={styles.checkIcon} />
                                    ) : (
                                        <MaterialIcons name="circle" size={20} color='white' style={styles.checkIcon} />
                                    )}
                                </TouchableOpacity>
                                <Text>Create new group to subscribe</Text>
                            </View>
                            {
                                !useExistingGroup && (
                                    <View style={{ marginLeft: 30 }}>
                                        <TextInput
                                            mode='flat'
                                            label={'Name'}
                                            style={[styles.textInput]}
                                            value={newGroupName}
                                            onChangeText={setNewGroupName}
                                            activeUnderlineColor={Colors.active}
                                            underlineColor={Colors.lightGray}
                                        />

                                        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                            <Text>0x</Text>
                                            <TextInput
                                                mode='flat'
                                                label={'Group Address'}
                                                style={[styles.textInput, { marginLeft: 5, marginBottom: 0, flex: 1 }]}
                                                value={newGroupAddress}
                                                onChangeText={(text) => {
                                                    const hexOnly = text.replace(/[^0-9A-Fa-f]/g, ""); // Remove non-hex characters
                                                    setNewGroupAddress(hexOnly);
                                                }}
                                                underlineColor={Colors.lightGray}
                                                activeUnderlineColor={Colors.active}
                                            />
                                        </View>
                                    </View>
                                )
                            }
                        </View>
                    </View>
                    <Text style={[styles.label, { marginBottom: 5 }]}>Select Publication Settings </Text>
                    {/* App key */}
                    <Dropdown
                        style={[meshStyles.dropdown, { backgroundColor: 'white', borderWidth: 0, marginBottom: 10, borderRadius: 4 }]}
                        placeholderStyle={meshStyles.placeholderStyle}
                        selectedTextStyle={[meshStyles.selectedTextStyle]}
                        data={applicationKeys}
                        maxHeight={200}
                        labelField="name"
                        valueField="index"
                        placeholder='Key'
                        value={selectedApplicationKeyIdx}
                        onChange={(item) => setSelectedApplicationKeyIdx(item.index)}
                    />
                    {/* TTL */}
                    <TextInput
                        mode='flat'
                        keyboardType='number-pad'
                        returnKeyType="done"
                        label={'TTL'}
                        style={[styles.textInput, { marginBottom: 10, flex: 1 }]}
                        activeUnderlineColor={Colors.active}
                        value={ttl.toString()}
                        onChangeText={(v) => setTTL(Number(v))}
                        underlineColor={Colors.lightGray}
                        contentStyle={{ fontWeight: 'bold' }}
                    />

                    {/* Publish Period */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.dropdownLabel}>Period Resolution</Text>
                            <Dropdown
                                style={[meshStyles.dropdown, { backgroundColor: 'white', borderWidth: 0, marginBottom: 0, borderRadius: 4, marginRight: 10 }]}
                                placeholderStyle={meshStyles.placeholderStyle}
                                selectedTextStyle={[meshStyles.selectedTextStyle, {
                                    marginTop: 16,
                                    marginLeft: 6, fontWeight: 'bold'
                                }]}
                                data={[
                                    { label: 'disabled', value: 'disabled' },
                                    { label: '10 minutes', value: '10 minutes' },
                                    { label: '10 seconds', value: '10 seconds' },
                                    { label: '1 second', value: '1 second' },
                                    { label: '100 milliseconds', value: '100 milliseconds' },
                                ]}
                                maxHeight={200}
                                labelField="label"
                                valueField="value"
                                value={publishPeriodResolution}
                                onChange={(item) => setPublishPeriodResolution(item.value)}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <TextInput
                                mode='flat'
                                keyboardType='number-pad'
                                returnKeyType="done"
                                label={'Period Interval'}
                                style={[styles.textInput, { marginBottom: 0, flex: 1 }]}
                                contentStyle={{ fontWeight: 'bold' }}
                                activeUnderlineColor={Colors.active}
                                value={publishPeriodInterval.toString()}
                                onChangeText={(v) => setPublishPeriodInterval(Number(v))}
                                activeOutlineColor={Colors.active}
                                underlineColor={Colors.lightGray}
                                disabled={publishPeriodResolution == 'disabled'}
                            />
                        </View>
                    </View>
                    {/* Publish Retransmission Count and Interval */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.dropdownLabel}>Retransmission Count</Text>
                            <Dropdown
                                style={[meshStyles.dropdown, { backgroundColor: 'white', borderWidth: 0, marginBottom: 0, borderRadius: 4, marginRight: 10 }]}
                                placeholderStyle={meshStyles.placeholderStyle}
                                selectedTextStyle={[meshStyles.selectedTextStyle, {
                                    marginTop: 20, marginLeft: 8, fontWeight: 'bold'
                                }]}
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
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <TextInput
                                mode='flat'
                                keyboardType='number-pad'
                                returnKeyType="done"
                                label={'Interval [ms]'}
                                style={[styles.textInput, { marginBottom: 0, flex: 1 }]}
                                value={publishRetransmissionInterval?.toString()}
                                onChangeText={(v) => setPublishRetransmissionInterval(Number(v))}
                                activeOutlineColor={Colors.active}
                                activeUnderlineColor={Colors.active}
                                underlineColor={Colors.lightGray}
                                disabled={publishRetransmissionCount == -1}
                                contentStyle={{ fontWeight: 'bold' }}
                            />
                        </View>
                    </View>
                </View>

                <View style={{ flexDirection: 'column' }}>
                    <Text style={styles.label}>Select Models</Text>
                    <ModelSelectionList elements={elements} disabledModels={disabledModels()} selectedModels={selectedModels} setSelectedModels={setSelectedModels} />

                </View>
            </ScrollView>

            {
                loading ? (
                    <TouchableOpacity
                        style={meshStyles.fab}
                        disabled
                    >
                        <ActivityIndicator size={25} color="white" />

                    </TouchableOpacity>

                ) : (
                    <TouchableOpacity
                        style={[meshStyles.fab, { opacity: selectedModels.length == 0 ? 0.3 : 1 }]}
                        disabled={selectedModels.length == 0}
                        onPress={handleSetPublicationModels}
                    >
                        <MaterialCommunityIcons
                            name="check-all"
                            size={23}
                            color="white"
                            style={{ marginRight: 8 }}
                        />
                        <Text style={[meshStyles.fabText]}>Set Publication</Text>
                    </TouchableOpacity>)
            }
            <StatusesPopup unicastAddr={unicastAddr} results={results} isVisible={isVisible} setIsVisible={setIsVisible} title={'Set Publication Completed'} />
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    label: {
        fontSize: 16,
        marginBottom: 10,
        fontWeight: '500',
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
    },
    checkIcon: {
        marginRight: 10,
        // backgroundColor: 'white',
        borderColor: 'black',

    },
    dropdownLabel: {
        color: Colors.darkGray,
        position: 'absolute',
        // backgroundColor: 'white',
        left: 8,
        top: 12,
        zIndex: 999,
        marginHorizontal: 5,
        // marginBottom:3,
        // paddingHorizontal: 8,
        fontSize: 12,
    },
});

export default BleMeshSetPublicationModelsScreen;
