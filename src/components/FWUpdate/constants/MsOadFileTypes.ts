// MS-OAD File Types
// Users upload 2 complete firmware images (V1 original and V2 new)
// The app automatically splits each into two halves
export const MsOadFileType = {
  ORIGINAL_V1: 'original_v1',
  NEW_V2: 'new_v2',
} as const;

export type MsOadFileTypeValue = typeof MsOadFileType[keyof typeof MsOadFileType];

// Internal enum for tracking which half is being transferred
export enum MsOadImageHalf {
  FIRST_HALF = 1,
  SECOND_HALF = 2,
}
