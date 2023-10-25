import { brands } from '../assets/manufacturerData';
import { Brand } from '../types';

export const getBrand = (uuids: string | string[]): Brand | undefined => {
  if (Array.isArray(uuids)) {
    let foundArray: (Brand | undefined)[] = uuids
      .map((uuid) => {
        if (uuid in brands) {
          return brands[uuid];
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
