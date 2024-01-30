import axios from 'axios';
import yaml from 'js-yaml';

const TI_CHAR = [
    { name: 'Characteristic 1', uuid: 'FFF1', },
    { name: 'Characteristic 2', uuid: 'FFF2', },
    { name: 'Characteristic 3', uuid: 'FFF3', },
    { name: 'Characteristic 4', uuid: 'FFF4', },
    { name: 'Characteristic 5', uuid: 'FFF5', },
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
]

const YAML_FILE_URL =
    'https://bitbucket.org/bluetooth-SIG/public/raw/main/assigned_numbers/uuids/characteristic_uuids.yaml';

let CHARACTERISTIC_LIST: any[] | undefined = undefined

export const fetchCharacteristicData = async () => {
    if (CHARACTERISTIC_LIST) {
        return CHARACTERISTIC_LIST
    }
    try {
        const response = await axios.get(YAML_FILE_URL);
        const yamlData = yaml.load(response.data);
        const yamlDataAsHex = [...TI_CHAR, ...yamlData.uuids.map((characteristic: any) => ({ ...characteristic, uuid: characteristic.uuid.toString(16) }))]
        CHARACTERISTIC_LIST = yamlDataAsHex
        return yamlDataAsHex;
    } catch (error) {
        console.error('Error fetching YAML file:', error);
        let data = await import('../assets/characteristics');
        CHARACTERISTIC_LIST = data.default
        return data.default
    }
};
