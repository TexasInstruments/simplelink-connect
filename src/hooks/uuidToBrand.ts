import { brands } from '../assets/manufacturerData';
import { Brand } from '../../types';
import { Buffer } from 'buffer';

export const getIconByPeripheralInfo = (peripheral: any) => {

  let serviceDataUUIDs = peripheral.advertising?.serviceData;
  let serviceUUIDs: string[] | undefined = peripheral?.advertising?.serviceUUIDs;
  let manufacturerRawData = peripheral?.advertising?.manufacturerRawData;

  peripheral.serviceUUIDs = serviceUUIDs;

  let icon: { name: string; type: any } | null = null;

  if (serviceUUIDs && icon == null) {
    if (serviceUUIDs.length > 0) {
      let brand = getBrand(serviceUUIDs);
      if (brand) {
        icon = {
          name: brand.iconName!,
          type: 'brands',
        };
        peripheral.brand = brand.name!;
      }
    }
  }

  if (serviceDataUUIDs && icon == null) {
    let uuids = Object.keys(serviceDataUUIDs);
    if (uuids.length > 0) {
      let brand = getBrand(uuids);
      if (brand) {
        icon = {
          name: brand.iconName!,
          type: 'brands',
        };
        peripheral.brand = brand.name!;
      }
    }
  }

  if (manufacturerRawData?.bytes?.length >= 2 && icon == null) {
    let bytes = Buffer.from(manufacturerRawData.bytes);

    // react-native-ble-manager bug: uses Integer (4 bytes) instead of Short (2 bytes) for company ID
    // The library stores it as big-endian 4-byte integer: [0, 0, 0, 13] for company ID 13
    // Skip first 2 bytes and read as big-endian
    let offset = 0;
    let useBigEndian = false;
    if (bytes.length >= 4 && bytes[0] === 0 && bytes[1] === 0) {
      offset = 2;
      useBigEndian = true; // Read as big-endian after skipping
    }

    let uuid = useBigEndian
      ? bytes.readUInt16BE(offset).toString(16).padStart(4, '0').toUpperCase()
      : bytes.readUInt16LE(offset).toString(16).padStart(4, '0').toUpperCase();
    // let uuid = bytes.readUInt16LE(0).toString(16).padStart(4, '0').toUpperCase();

    let brandByBytes = getBrand(uuid);

    if (brandByBytes) {
      icon = {
        name: brandByBytes.iconName!,
        type: 'brands',
      };
      peripheral.brand = brandByBytes.name!;
    }
  }

  if (!icon) {
    icon = {
      name: 'devices',
      type: 'material',
    };
  }

  peripheral.icon = icon;

  return peripheral;
}

export const getBrand = (uuids: string | string[]): Brand | undefined => {
  if (Array.isArray(uuids)) {
    let foundArray: (Brand | undefined)[] = uuids
      .map((uuid) => {
        if (uuid.toUpperCase() in brands) {
          return brands[uuid.toUpperCase()];
        }
      })
      .filter((item) => item !== undefined);

    if (foundArray.length > 0) return foundArray[0];

    return undefined;
  } else if (typeof uuids === 'string') {
    let brand = brands[uuids.toUpperCase()];
    if (!brand || !brand.iconName || typeof brand === 'undefined') return undefined;
    return brand;
  }
};
