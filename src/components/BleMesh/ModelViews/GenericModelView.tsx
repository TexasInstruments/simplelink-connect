import React, { useEffect, useRef } from 'react';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, NativeEventEmitter, NativeModules, Platform, StyleSheet } from 'react-native';
import { Text, TouchableOpacity, View } from '../../Themed';
import { callMeshModuleFunction, meshStyles, Model, SENSOR_SERVER } from '../meshUtils';
import Colors from '../../../constants/Colors';
import Spacing from '../../Spacing';
import ModelIcon from './ModelIcon';
import { FontAwesome5, } from '@expo/vector-icons';
import { BleMeshNodeModelScreenProps } from '../../../../types';
import { ApplicationKey } from '../BleMeshApplicationKeys';
import { BindAppKeyModal } from './BindAppKeyModal';
import { Divider } from 'react-native-paper';
import { PublicationModal } from './PublicationModal';
import { ScrollView } from 'react-native-gesture-handler';
import { SubscriptionModal } from './SubscriptionModal';
import { SensorServer } from './SensorServer';
import { VendorModel } from './VendorModel';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props extends BleMeshNodeModelScreenProps { };

export interface PublicationSettings {
    publicationSteps: number;
    appKeyIndex: number | "Unavailable";
    publishAddress: number | "Not Assigned";
    ttl: number;
    publishRetransmitCount: number;
    publishRetransmitInterval: number;
    initial: boolean;
}

export const GenericModelView: React.FC<Props> = ({ route }: any) => {
    const { unicastAddr, model } = route.params as { unicastAddr: number, model: Model };

    const { MeshModule } = NativeModules;
    const bleMeshEmitter = new NativeEventEmitter(MeshModule);

    const [isBindAppKeyModalVisible, setIsBindAppKeyModalVisible] = useState(false);
    const [isPublicationModalVisible, setIsPublicationModalVisible] = useState(false);
    const [isSubscriptionModalVisible, setIsSubscriptionModalVisible] = useState(false);

    const [applicationsKeys, setApplicationsKeys] = useState<ApplicationKey[]>([]);
    const [boundApplicationsKeys, setBoundApplications] = useState<number[]>([]);
    const [publicSettings, setPublicSettings] = useState<PublicationSettings>();
    const [subscriptionList, setSubscriptionList] = useState<number[]>([]);

    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        bleMeshEmitter.addListener('onModelKeyUpdated', handleModelKeyUpdated);
        bleMeshEmitter.addListener('onPublicationUpdated', handlePublicationUpdated);
        bleMeshEmitter.addListener('onSubscriptionReceived', handleSubscriptionReceived);
        bleMeshEmitter.addListener('onSubscriptionAdded', handleSubscriptionAdded);
        bleMeshEmitter.addListener('onSubscriptionFailed', handleSubscriptionFailed);
        getAppKeys();
        getBoundApplicationKey();
        getPublicSettings();
        getSubscriptions();

        return () => {
            bleMeshEmitter.removeAllListeners('onNetworkKeyAdded');
            bleMeshEmitter.removeAllListeners('onPublicationUpdated');
            bleMeshEmitter.removeAllListeners('onSubscriptionReceived');
            bleMeshEmitter.removeAllListeners('onSubscriptionAdded');
            bleMeshEmitter.removeAllListeners('onSubscriptionFailed');
        };
    }, []);

    const getAppKeys = async () => {
        try {
            const appKeys = await callMeshModuleFunction('getProvisionedNodeAppKeys', unicastAddr) as ApplicationKey[];
            setApplicationsKeys(appKeys);
        }
        catch (e) { console.error(e) }
    }

    const getBoundApplicationKey = async () => {
        try {
            if (model.isBindingSupported) {
                const boundKeys = await callMeshModuleFunction('getModelBoundKeys') as number[];
                setBoundApplications(boundKeys);
            }
        }
        catch (e) { console.error(e) }
    }

    const handlePublicationUpdated = (message: any) => {
        if (typeof (message) === 'string') {
            Alert.alert("Get Publication Failed:", message);
        }
        else {
            setPublicSettings(message);
        }
    }

    const handleSubscriptionFailed = (message: any) => {
        Alert.alert("Subscription Failed", message);
    }

    const handleSubscriptionReceived = (message: any) => {
        if (typeof (message) === 'string') {
            Alert.alert("Subscription received failed", message);
        }
        else {
            setSubscriptionList(message);
        }
    }

    const handleSubscriptionAdded = (message: any) => {
        if (typeof (message) === 'string') {
            Alert.alert("Subscription failed", message);
        }
        else {
            getSubscriptions();
        }
    }

    const getPublicSettings = async () => {
        try {
            if (model.isPublishSupported) {
                await callMeshModuleFunction('getPublicationSettings', unicastAddr);
            }
        }
        catch (e) { console.error(e) }
    }

    const getSubscriptions = async () => {
        try {
            if (model.isSubscribeSupported) {
                await callMeshModuleFunction('getSubscriptions', unicastAddr);
            }

        }
        catch (e) { console.error(e) }
    }

    const handleModelKeyUpdated = (message: string) => {
        if (message !== "Success") {
            // Alert.alert("Bind application key failed", message);
            return;
        }
        getBoundApplicationKey();
    }

    const unbindAppKey = async (appKeyIndex: number) => {

        Alert.alert('Unbind Application Key', 'Are you sure you want to unbind key?', [
            {
                text: 'Yes',
                onPress: async () => await callMeshModuleFunction('unbindAppKey', appKeyIndex, unicastAddr),
                style: 'destructive',
            },
            { text: 'Cancel', onPress: () => console.log('Cancel Pressed') },
        ]);
    }

    const unsubscribe = async (index: number) => {

        Alert.alert('Delete Subscription', `Are you sure you want to delete subscription to 0x${subscriptionList[index].toString(16)}?`, [
            {
                text: 'Yes',
                onPress: async () => await callMeshModuleFunction('unsubscribe', index, unicastAddr),
                style: 'destructive',
            },
            { text: 'Cancel', onPress: () => console.log('Cancel Pressed') },
        ]);
    }

    const DisplayBoundKey = ({ keyIndex }: { keyIndex: number }) => {
        let appKey = applicationsKeys.find((key) => key.index == keyIndex);
        if (!appKey) return null;
        return (
            <View style={[styles.dataContainer,]} key={keyIndex}>
                <View style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text style={[styles.name]}>{appKey?.name}</Text>
                    <Text style={[styles.val]}>{appKey?.key}</Text>
                </View>
                <TouchableOpacity onPress={() => unbindAppKey(keyIndex)} >
                    <FontAwesome5 name="trash-alt" size={20} color={Colors.primary} />
                </TouchableOpacity>
            </View>
        );
    }

    const removePublication = async () => {
        await callMeshModuleFunction('removePublication', unicastAddr);
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.lightGray }} edges={['left', 'right', 'bottom']}>
            <View style={styles.container}>
                {/* Header */}
                <View style={[meshStyles.infoContainer, { backgroundColor: Colors.lightGray }]}>
                    <View style={[meshStyles.deviceInfoIconContainer]}>
                        <ModelIcon model={model} />
                    </View>
                    <Spacing spaceT={10} />
                    <View style={{ display: 'flex', flexDirection: 'column', backgroundColor: Colors.lightGray, flex: 1 }}>
                        <Text style={[styles.modelName]}>{model.name}</Text>
                        <Text style={[styles.modelId]}>Model ID: 0x{model.id.toString(16).toLocaleUpperCase()}</Text>
                    </View>
                </View>

                {/* Data */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        style={{ marginTop: 20 }}
                        contentContainerStyle={{
                            marginHorizontal: 20,
                            backgroundColor: Colors.lightGray,
                            paddingBottom: 0,
                        }}
                    >
                        {/* Bind Application Key */}
                        <View style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', backgroundColor: Colors.lightGray }}>
                            <Text style={[styles.title]}>Bound Application Keys</Text>
                            <TouchableOpacity onPress={() => setIsBindAppKeyModalVisible(true)} disabled={!model.isBindingSupported}>
                                <Text style={[meshStyles.textButton,
                                { opacity: !model.isBindingSupported ? 0.4 : 1 }
                                ]}>Bind key</Text>
                            </TouchableOpacity>
                        </View>
                        {boundApplicationsKeys.map((appIndex, index) => (
                            <DisplayBoundKey key={index} keyIndex={appIndex} />
                        ))}
                        {boundApplicationsKeys.length === 0 && (
                            <View style={[styles.dataContainer]}>
                                <Text style={[styles.name]}>No keys</Text>
                            </View>
                        )}

                        {/* Publish */}
                        <View style={{ marginBottom: 20, backgroundColor: Colors.lightGray }}>
                            <View style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', backgroundColor: Colors.lightGray }}>
                                <Text style={[styles.title]}>Publish</Text>
                                <TouchableOpacity
                                    onPress={() => setIsPublicationModalVisible(true)}
                                    disabled={boundApplicationsKeys.length === 0 || !model.isPublishSupported}
                                >
                                    <Text
                                        style={[
                                            meshStyles.textButton,
                                            { opacity: boundApplicationsKeys.length === 0 || !model.isPublishSupported ? 0.4 : 1 },
                                        ]}
                                    >
                                        Set publication
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {publicSettings ? (
                                <View style={[styles.publishContainer]}>
                                    <View style={[styles.publishContainer]}>
                                        <View style={[meshStyles.item, { height: 50 }]}>
                                            <Text style={[meshStyles.subject]}>Address</Text>
                                            <Text>0x{(publicSettings.publishAddress ?? 0).toString(16).toLocaleUpperCase()}</Text>
                                        </View>
                                        <Divider />
                                        <View style={[meshStyles.item, { height: 50 }]}>
                                            <Text style={[meshStyles.subject]}>App Key Index</Text>
                                            <Text>{publicSettings?.appKeyIndex ?? "N/A"}</Text>
                                        </View>
                                        <Divider />
                                        <View style={[meshStyles.item, { height: 50 }]}>
                                            <Text style={[meshStyles.subject]}>TTL</Text>
                                            <Text>{publicSettings?.ttl ?? "N/A"}</Text>
                                        </View>
                                        <Divider />
                                        <View style={[meshStyles.item, { height: 50 }]}>
                                            <Text style={[meshStyles.subject]}>Retransmit Count</Text>
                                            {
                                                publicSettings.publishRetransmitCount ? (
                                                    <Text>{publicSettings.publishRetransmitCount}</Text>
                                                ) : (
                                                    <Text>Disabled</Text>
                                                )
                                            }
                                        </View>
                                        <Divider />
                                        <View style={[meshStyles.item, { height: 50 }]}>
                                            <Text style={[meshStyles.subject]}>Retransmit Interval</Text>
                                            {
                                                <Text>{publicSettings?.publishRetransmitInterval ?? "N/A"}</Text>
                                            }
                                        </View>
                                        <Divider />
                                        <View style={[meshStyles.item, { height: 50 }]}>
                                            <Text style={[meshStyles.subject]}>Publication Steps</Text>
                                            {
                                                publicSettings.publicationSteps ? (
                                                    <Text>{publicSettings?.publicationSteps ?? "N/A"}</Text>
                                                ) : (
                                                    <Text>Disabled</Text>
                                                )
                                            }
                                        </View>
                                        <TouchableOpacity style={[styles.removeButton]} onPress={removePublication}>
                                            <Text style={[styles.removeText]}>Remove Publication</Text>
                                            <FontAwesome5 name="trash-alt" size={16} color={Colors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View style={[styles.dataContainer, { marginBottom: 0 }]}>
                                    <Text style={[styles.name]}>
                                        {publicSettings ? 'No Publication Available' : 'Get Publication Failed'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Subscription */}
                        <View style={{ backgroundColor: Colors.lightGray, marginBottom: 20 }}>
                            <View style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', backgroundColor: Colors.lightGray }}>
                                <Text style={[styles.title]}>Subscriptions</Text>
                                <TouchableOpacity
                                    onPress={() => setIsSubscriptionModalVisible(true)}
                                    disabled={boundApplicationsKeys.length === 0 || !model.isSubscribeSupported}
                                >
                                    <Text
                                        style={[
                                            meshStyles.textButton,
                                            { opacity: boundApplicationsKeys.length === 0 || !model.isSubscribeSupported ? 0.4 : 1 },
                                        ]}
                                    >
                                        Subscribe
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {subscriptionList.length === 0 ? (
                                <View style={[styles.dataContainer, { marginBottom: 0 }]}>
                                    <Text style={[styles.name]}>Not subscribed to any addresses yet</Text>
                                </View>
                            ) : (
                                subscriptionList.map((subscription, index) => (
                                    <View style={[styles.dataContainer, { marginBottom: 5 }]} key={index}>
                                        <Text style={[styles.name]}>0x{subscription.toString(16).toLocaleUpperCase()}</Text>
                                        <TouchableOpacity onPress={() => unsubscribe(index)} >
                                            <FontAwesome5 name="trash-alt" size={16} color={Colors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                        </View>

                        {model.id === SENSOR_SERVER && (
                            <SensorServer boundApplicationsKeys={boundApplicationsKeys} unicastAddr={unicastAddr} />
                        )}

                        {model.type !== "Bluetooth SIG" && (
                            <VendorModel scrollViewRef={scrollViewRef} boundApplicationsKeys={boundApplicationsKeys} nodeUnicastAddress={unicastAddr} />
                        )}

                        <BindAppKeyModal
                            setModalVisible={setIsBindAppKeyModalVisible}
                            visible={isBindAppKeyModalVisible}
                            unicastAddress={unicastAddr}
                        />

                        <PublicationModal
                            setModalVisible={setIsPublicationModalVisible}
                            visible={isPublicationModalVisible}
                            unicastAddress={unicastAddr}
                            publicationSettings={publicSettings}
                        />

                        <SubscriptionModal
                            setModalVisible={setIsSubscriptionModalVisible}
                            visible={isSubscriptionModalVisible}
                            unicastAddress={unicastAddr}
                        />
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </SafeAreaView>
    )
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.lightGray,
    },
    modelName: {
        fontWeight: 'bold',
        fontSize: 20,
        letterSpacing: 0.3,
    },
    modelId: {
        fontSize: 14,
        fontWeight: '300',
        letterSpacing: 0.3,
    },
    dataContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 25,
        paddingHorizontal: 20,
        paddingVertical: 10,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    publishContainer: {
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    title: {
        fontWeight: '500',
        fontSize: 16,
        marginBottom: 10,
    },
    name: {
        fontSize: 16,
    },
    removeButton: {
        alignSelf: 'center',
        justifyContent: 'center',
        height: 50,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'row',
        marginVertical: 10
    },
    removeText: {
        color: Colors.primary,
        fontSize: 16,
        marginRight: 5,
    },
});