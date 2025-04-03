import Colors from "../../constants/Colors";
import { StyleSheet, NativeModules, Dimensions, View, Platform } from 'react-native';
import { Text, TouchableOpacity } from '../Themed';


export const CONFIGURATION_SERVER = 0x0000;
export const CONFIGURATION_CLIENT = 0x0001;
export const HEALTH_SERVER_MODEL = 0x0002;
export const HEALTH_CLIENT_MODEL = 0x0003;

export const REMOTE_PROVISIONING_SERVER = 0x0004;
export const REMOTE_PROVISIONING_CLIENT = 0x0005;
export const MESH_PRIVATE_BEACON_SERVER = 0x000A;
export const MESH_PRIVATE_BEACON_CLIENT = 0x000B;
export const ON_DEMAND_PRIVATE_PROXY_SERVER = 0x000C;
export const ON_DEMAND_PRIVATE_PROXY_CLIENT = 0x000D;
export const SAR_CONFIGURATION_SERVER = 0x000E;
export const SAR_CONFIGURATION_CLIENT = 0x000F;
export const OPCODES_AGGREGATOR_SERVER = 0x0010;
export const OPCODES_AGGREGATOR_CLIENT = 0x0011;
export const LARGE_COMPOSITION_DATA_SERVER = 0x0012;
export const LARGE_COMPOSITION_DATA_CLIENT = 0x0013;
export const SOLICITATION_PDU_RPL_CONFIGURATION_SERVER = 0x0014;
export const SOLICITATION_PDU_RPL_CONFIGURATION_CLIENT = 0x0015;

export const GENERIC_ON_OFF_SERVER = 0x1000;
export const GENERIC_ON_OFF_CLIENT = 0x1001;
export const GENERIC_LEVEL_SERVER = 0x1002;
export const GENERIC_LEVEL_CLIENT = 0x1003;

export const GENERIC_DEFAULT_TRANSITION_TIME_SERVER = 0x1004;
export const GENERIC_DEFAULT_TRANSITION_TIME_CLIENT = 0x1005;
export const GENERIC_POWER_ON_OFF_SERVER = 0x1006;
export const GENERIC_POWER_ON_OFF_SETUP_SERVER = 0x1007;
export const GENERIC_POWER_ON_OFF_CLIENT = 0x1008;
export const GENERIC_POWER_LEVEL_SERVER = 0x1009;
export const GENERIC_POWER_LEVEL_SETUP_SERVER = 0x100A;
export const GENERIC_POWER_LEVEL_CLIENT = 0x100B;
export const GENERIC_BATTERY_SERVER = 0x100C;
export const GENERIC_BATTERY_CLIENT = 0x100D;
export const GENERIC_LOCATION_SERVER = 0x100E;
export const GENERIC_LOCATION_SETUP_SERVER = 0x100F;
export const GENERIC_LOCATION_CLIENT = 0x1010;
export const GENERIC_ADMIN_PROPERTY_SERVER = 0x1011;
export const GENERIC_MANUFACTURER_PROPERTY_SERVER = 0x1012;
export const GENERIC_USER_PROPERTY_SERVER = 0x1013;
export const GENERIC_CLIENT_PROPERTY_SERVER = 0x1014;
export const GENERIC_PROPERTY_CLIENT = 0x1015;

// SIG Sensors, Mesh Model Spec
export const SENSOR_SERVER = 0x1100;
export const SENSOR_SETUP_SERVER = 0x1101;
export const SENSOR_CLIENT = 0x1102;

//SIG Time and Scene, Mesh Model Spec;
export const TIME_SERVER = 0x1200;
export const TIME_SETUP_SERVER = 0x1201;
export const TIME_CLIENT = 0x1202;
export const SCENE_SERVER = 0x1203;
export const SCENE_SETUP_SERVER = 0x1204;
export const SCENE_CLIENT = 0x1205;
export const SCHEDULER_SERVER = 0x1206;
export const SCHEDULER_SETUP_SERVER = 0x1207;
export const SCHEDULER_CLIENT = 0x1208;

// SIG Lightning, Mesh Model Spec
export const LIGHT_LIGHTNESS_SERVER = 0x1300;
export const LIGHT_LIGHTNESS_SETUP_SERVER = 0x1301;
export const LIGHT_LIGHTNESS_CLIENT = 0x1302;
export const LIGHT_CTL_SERVER = 0x1303;
export const LIGHT_CTL_SETUP_SERVER = 0x1304;
export const LIGHT_CTL_CLIENT = 0x1305;
export const LIGHT_CTL_TEMPERATURE_SERVER = 0x1306;
export const LIGHT_HSL_SERVER = 0x1307;
export const LIGHT_HSL_SETUP_SERVER = 0x1308;
export const LIGHT_HSL_CLIENT = 0x1309;
export const LIGHT_HSL_HUE_SERVER = 0x130A;
export const LIGHT_HSL_SATURATION_SERVER = 0x130B;
export const LIGHT_XYL_SERVER = 0x130C;
export const LIGHT_XYL_SETUP_SERVER = 0x130D;
export const LIGHT_XYL_CLIENT = 0x130E;
export const LIGHT_LC_SERVER = 0x130F;
export const LIGHT_LC_SETUP_SERVER = 0x1310;
export const LIGHT_LC_CLIENT = 0x1311;

// BLOB
export const BLOB_TRANSFER_SERVER = 0x1400;
export const BLOB_TRANSFER_CLIENT = 0x1401;

// Firmware Update
export const FIRMWARE_UPDATE_SERVER = 0x1402;
export const FIRMWARE_UPDATE_CLIENT = 0x1403;
export const FIRMWARE_DISTRIBUTION_SERVER = 0x1404;
export const FIRMWARE_DISTRIBUTION_CLIENT = 0x1405;

export const Feature = ({ feature }: { feature: string }) => {
    return (
        <View style={[styles.featureAvatar, { backgroundColor: getBackgroundFeature(feature) }]}>
            <Text style={styles.featureText}>
                {feature}
            </Text>
        </View>
    );
}

export const getBackgroundFeature = (feature: string) => {
    switch (feature) {
        case 'F':
            return '#A500FA'
        case 'N':
            return `#568ECC`
        case 'R':
            return `#000000`
        case 'LP':
            return `#EB9C28`
        case 'P':
            return `#FD251D`
        default:
            return Colors.primary
    }
}

const styles = StyleSheet.create({
    featureAvatar: {
        width: 30,
        height: 30,
        marginLeft: -6,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        color: 'white',
        fontSize: 17,
        textAlign: 'center',
        fontWeight: 'bold',
    },
});


export interface Group {
    name: string,
    address: number,
    meshUuid: string,
}

export interface ProvisionedNode {
    unicastAddress: number,
    name: string,
    addedNetworkKeysNum: number,
    addedApplicationKeysNum: number,
    numberOfElement: number,
    features: string[],
    ttl: number,
    elements: Element[];
    company: string;
    deviceKey: string;
}

export interface Element {
    address: number;
    models: Model[];
    name: string;
};

export interface Model {
    name: string;
    id: number;
    type: string;
}

export interface MeshNode {
    name: string,
    company: string,
    unicastAddress: number,
    numberOfElements: number,
    numberOfModels: number,
    features: string[]
}

export interface NetworkKey {
    key: string,
    name: string,
    index: number,
    timestamp: string,
};

export interface MeshNetwork {
    name: string;
    nodes: MeshNode[];
    networkKeys: NetworkKey[];
};

export interface ApplicationKey {
    expand?: boolean,
    index: number,
    key: string,
    name: string,
}

export interface AddressRange {
    highAddress: number,
    lowAddress: number,
}

export interface SceneAddress {
    firstScene: number,
    lastScene: number,
}

export interface ProvisionerNode {
    unicastAddress: string,
    name: string,
    isCurrent: boolean,
    allocatedSceneAddress: SceneAddress[],
    allocatedUnicastAddress: AddressRange[],
    allocatedGroupsAddress: AddressRange[],
    expand?: boolean,
    ttl: number | "N/A",
    deviceKey: string
}

export async function callMeshModuleFunction(functionName: string, ...args: any[]) {
    return new Promise((resolve, reject) => {
        if (Platform.OS === 'ios') {
            // Use callback pattern for iOS
            NativeModules.MeshModule[functionName](...args, (error: any, result: unknown) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        } else {
            // Use promise pattern for Android
            NativeModules.MeshModule[functionName](...args)
                .then(resolve)
                .catch(reject);
        }
    });
}

export const meshStyles = StyleSheet.create({
    container: {
        height: '100%',
        padding: 20,
        paddingBottom: 0,
        paddingTop: 30,
        backgroundColor: Colors.lightGray
    },
    title: {
        fontSize: 24,
        fontWeight: '500',
        marginBottom: 15,
    },
    button: {
        marginTop: 50,
        alignSelf: 'center',
        backgroundColor: 'white', // Ensure this contrasts with your shadow
        borderRadius: 50,
        paddingHorizontal: 15,
        paddingVertical: 5,
        display: 'flex',
        justifyContent: 'center',
        alignContent: 'center',
    },
    textButton: {
        textAlign: 'center',
        color: Colors.blue,
        alignSelf: 'center',
    },
    optionsBox: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 15,
    },
    subject: {
        fontSize: 16,
        fontWeight: '500',
        marginRight: 15,
    },
    topic: {
        fontSize: 14,
        fontWeight: '500',
    },
    item: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        minHeight: 55,
        borderRadius: 10
    },
    text: {
        color: Colors.gray
    },
    infoContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 15,
        flexDirection: 'row',
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: {
            height: 3,
            width: 0,
        },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 8,
    },
    deviceInfoIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: Colors.gray,
        borderWidth: 2,
        marginRight: 10,
        backgroundColor: 'white',
    },
    deviceName: {
        fontWeight: 'bold',
        fontSize: 20,
        flex: 1,
    },
    dropdownContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        borderColor: 'gray',
    },
    dropdown: {
        height: 50,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 20,
        flex: 1,
        borderColor: 'gray',

    },
    icon: {
        marginRight: 5,
    },
    placeholderStyle: {
        fontSize: 14,
    },
    selectedTextStyle: {
        fontSize: 14,
    },
    iconStyle: {
        width: 20,
        height: 20,
    },
    shadow: {
        // Shadow for iOS
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        // Shadow for Android
        elevation: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 40,
        right: 20,
        backgroundColor: Colors.blue,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    fabText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600'
    },
    modelsCenteredView: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',  // Darkens the background
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '500',
        marginBottom: 20,
    }
});
