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
        CHARACTERISTIC_LIST = data.default
        return data.default
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