import { brands } from '../assets/manufacturerData';
import { Brand } from '../../types';
import { Buffer } from 'buffer';

export const getIconByPeripheralInfo = (peripheral: any) => {
  let serviceDataUUIDs = peripheral.advertising.serviceData;
  let serviceUUIDs: string[] | undefined = peripheral.advertising.serviceUUIDs;
  let manufacturerData = peripheral.advertising.manufacturerData;

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
        peripheral.brand = brand.iconName!;
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
        peripheral.brand = brand.iconName!;
      }
    }
  }

  if (manufacturerData && manufacturerData.bytes && icon == null) {
    let bytes = Buffer.from(manufacturerData.bytes);
    let uuid = bytes.readUInt16LE().toString(16).padStart(4, '0').toUpperCase();

    let brandByBytes = getBrand(uuid);

    if (brandByBytes) {
      icon = {
        name: brandByBytes.iconName!,
        type: 'brands',
      };
      peripheral.brand = brandByBytes.iconName!;
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
