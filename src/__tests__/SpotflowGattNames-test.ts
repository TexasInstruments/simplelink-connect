import axios from 'axios';
import { GattProfile } from '@spotflow/react-native-ble-gateway';
import mappedServices from '../assets/services';
import { uuidToCharacteristicName } from '../hooks/uuidToName';
import { fetchCharacteristicData } from '../services/YamlDataService';

jest.mock('axios', () => ({ get: jest.fn() }));

jest.mock('@spotflow/react-native-ble-gateway', () => ({
  GattProfile: {
    SERVICE: '26530001-81e5-4861-82ae-2c92e6887922',
    CAPABILITIES: '26530002-81e5-4861-82ae-2c92e6887922',
    DEVICE_ID: '26530003-81e5-4861-82ae-2c92e6887922',
    SESSION_METADATA: '26530004-81e5-4861-82ae-2c92e6887922',
    TX_STREAM: '26530005-81e5-4861-82ae-2c92e6887922',
    RX_STREAM: '26530006-81e5-4861-82ae-2c92e6887922',
    INGEST_KEY: '26530007-81e5-4861-82ae-2c92e6887922',
  },
}));

test('registers Spotflow Observability in the service catalog', () => {
  expect(mappedServices).toContainEqual(expect.objectContaining({
    serviceUuid: GattProfile.SERVICE,
    serviceName: 'Spotflow Observability',
  }));
});

test('looks up Spotflow and standard characteristics through the existing catalog', async () => {
  jest.useFakeTimers();
  try {
    jest.mocked(axios.get).mockResolvedValueOnce({
      data: 'uuids:\n  - uuid: 0x2A19\n    name: Battery Level\n',
    });
    const catalog = await fetchCharacteristicData();

    expect(uuidToCharacteristicName(GattProfile.CAPABILITIES.toUpperCase(), catalog)).toBe('Capabilities');
    expect(uuidToCharacteristicName(GattProfile.DEVICE_ID, catalog)).toBe('Device ID');
    expect(uuidToCharacteristicName(GattProfile.SESSION_METADATA, catalog)).toBe('Session Metadata');
    expect(uuidToCharacteristicName(GattProfile.TX_STREAM, catalog)).toBe('TX Stream');
    expect(uuidToCharacteristicName(GattProfile.RX_STREAM, catalog)).toBe('RX Stream');
    expect(uuidToCharacteristicName(GattProfile.INGEST_KEY, catalog)).toBe('Ingest Key');
    expect(uuidToCharacteristicName('2A19', catalog)).toBe('Battery Level');
  } finally {
    jest.useRealTimers();
  }
});
