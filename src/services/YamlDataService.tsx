import axios from 'axios';
import yaml from 'js-yaml';

const TI_CHAR = [
    { name: 'Characteristic 1', uuid: 'FFF1', },
    { name: 'Characteristic 2', uuid: 'FFF2', },
    { name: 'Characteristic 3', uuid: 'FFF3', },
    { name: 'Characteristic 4', uuid: 'FFF4', },
    { name: 'Characteristic 5', uuid: 'FFF5', },
    { name: 'SSID', uuid: 'CC01', },
    { name: 'Password', uuid: 'CC02', },
    { name: 'Connection', uuid: 'CC03', },
    { name: 'Data', uuid: 'f000aa65-0451-4000-b000-000000000000', },
    { name: 'Configuration', uuid: 'f000aa66-0451-4000-b000-000000000000', },
    { name: 'Configuration', uuid: 'f000aa02-0451-4000-b000-000000000000', },
    { name: 'Period', uuid: 'f000aa03-0451-4000-b000-000000000000', },
    { name: 'Data', uuid: 'ffe1', },
    { name: 'Data', uuid: 'f000aa01-0451-4000-b000-000000000000' },
    { name: 'OAD Image Identify Write', uuid: 'f000ffc1-0451-4000-b000-000000000000' },
    { name: 'OAD Image Block Request', uuid: 'f000ffc2-0451-4000-b000-000000000000' },
    { name: 'OAD Image Control Point', uuid: 'f000ffc5-0451-4000-b000-000000000000' },
    { name: 'Write Data', uuid: 'f000c0c1-0451-4000-B000-000000000000' },
    { name: 'Server Data', uuid: 'f000c0c2-0451-4000-B000-000000000000' },
    { name: 'Battery Level', uuid: 'f0002a19-0451-4000-b000-000000000000' },
    // Matter Light Profile
    { name: 'Light On/Off', uuid: '11A1' }, // Set Light State to On (1) or Off (0)
    { name: 'Light On/Off', uuid: 'f00011a1-0451-4000-b000-000000000000' }, // Set Light State to On (1) or Off (0)
    { name: 'Light Toggle', uuid: '11A2' }, // Light Toggle (1 to toggle)
    { name: 'Light Toggle', uuid: 'f00011a2-0451-4000-b000-000000000000' }, // Light Toggle (1 to toggle)
    { name: 'Light State', uuid: '11A3' },  // Read current light state On (1) or Off (0)
    { name: 'Light State', uuid: 'f00011a3-0451-4000-b000-000000000000' },  // Read current light state On (1) or Off (0)
    // Matter Diagnostic Profile 
    { name: 'Application Heap Free', uuid: '11B1' }, // Read total RAM free in heap
    { name: 'Application Heap Free', uuid: 'f00011b1-0451-4000-b000-000000000000' }, // Read total RAM free in heap
    { name: 'Application Heap Used', uuid: '11B2' }, // Read total RAM used by heap
    { name: 'Application Heap Used', uuid: 'f00011b2-0451-4000-b000-000000000000' }, // Read total RAM used by heap
    { name: 'Thread Network key', uuid: '11B3' },  // Read current Thread Network key
    { name: 'Thread Network key', uuid: 'f00011b3-0451-4000-b000-000000000000' },  // Read current Thread Network key
    { name: 'Thread Network Channel', uuid: '11B4' },  // Read current Thread Network Channel
    { name: 'Thread Network Channel', uuid: 'f00011b4-0451-4000-b000-000000000000' },  // Read current Thread Network Channel
    { name: 'Thread Network PAN ID', uuid: '11B5' },  // Thread Network PAN ID
    { name: 'Thread Network PAN ID', uuid: 'f00011b5-0451-4000-b000-000000000000' },  // Thread Network PAN ID
    { name: 'Refresh Data', uuid: '11B6' },  // Start BLE Throughput Test
    { name: 'Refresh Data', uuid: 'f00011b6-0451-4000-b000-000000000000' },  // Start BLE Throughput Test
    { name: 'Refresh Period', uuid: '11B7' },  // Start BLE Throughput Test
    { name: 'Refresh Period', uuid: 'f00011b7-0451-4000-b000-000000000000' },  // Start BLE Throughput Test
]


const TI_PROFILES = [
    { name: 'Data Stream', uuid: 'F000C0C0-0451-4000-B000-000000000000', },
]

const YAML_FILE_URL_CHAR =
    'https://bitbucket.org/bluetooth-SIG/public/raw/main/assigned_numbers/uuids/characteristic_uuids.yaml';

const YAML_FILE_URL_PROFILES =
    'https://bitbucket.org/bluetooth-SIG/public/raw/main/assigned_numbers/uuids/service_uuids.yaml';

let CHARACTERISTIC_LIST: any[] | undefined = undefined

export const fetchCharacteristicData = async () => {
    if (CHARACTERISTIC_LIST) {
        return CHARACTERISTIC_LIST
    }

    try {
        const responsePromise = axios.get(YAML_FILE_URL_CHAR);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error("Fetching timed out"));
            }, 10000);
        });

        const response = await Promise.race([responsePromise, timeoutPromise]);

        const yamlData = yaml.load(response.data);

        const yamlDataAsHex = [...TI_CHAR, ...yamlData.uuids.map((characteristic: any) => ({ ...characteristic, uuid: characteristic.uuid.toString(16) }))]
        CHARACTERISTIC_LIST = yamlDataAsHex;

        return yamlDataAsHex;
    } catch (error) {
        console.error('Error fetching YAML file:', error);
        let data = await import('../assets/characteristics');
        CHARACTERISTIC_LIST = [...TI_CHAR, ...data.default]
        return CHARACTERISTIC_LIST
    }
};

let PROFILE_LIST: any[] | undefined = undefined


function sortByName(objArray: { name: string, uuid: string }[]) {
    return objArray.sort(function (a, b) {
        var textA = a.name;
        var textB = b.name;
        return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
    });
}

export const fetchProfileList = async () => {
    if (PROFILE_LIST) {
        return PROFILE_LIST
    }

    try {
        const responsePromise = axios.get(YAML_FILE_URL_PROFILES);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error("Fetching timed out"));
            }, 10000);
        });

        const response = await Promise.race([responsePromise, timeoutPromise]);

        const yamlData = yaml.load(response.data);

        const yamlDataAsHex = [...TI_PROFILES, ...yamlData.uuids.map((characteristic: any) => ({ ...characteristic, uuid: characteristic.uuid.toString(16) }))]
        PROFILE_LIST = yamlDataAsHex;
        return sortByName(yamlDataAsHex);

    } catch (error) {
        console.error('Error fetching YAML file:', error);
        let data = [
            { name: 'Continuous Glucose', uuid: '181F' },
            { name: 'Data Stream', uuid: 'F000C0C0-0451-4000-B000-000000000000' },
            { name: 'Glucose', uuid: '1808' },
            { name: 'Health Thermometer', uuid: '1809' },
        ]
        PROFILE_LIST = sortByName(data);
        return PROFILE_LIST;
    }
};