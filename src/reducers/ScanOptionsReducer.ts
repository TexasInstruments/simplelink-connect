import { IScanOptionsState } from '../../types';

export type ScanOptionsActionType =
  | { type: 'scanOptions/scanDuration/set'; payload: number }
  | { type: 'scanOptions/legacyMode/set'; payload: boolean }
  | { type: 'scanOptions/scanPhy/set'; payload: number }
  | { type: 'scanOptions/connectionTimeout/set'; payload: number }
  | { type: 'scanOptions/connectionPhy/set'; payload: number };

function scanOptionsReducer(state: IScanOptionsState, action: ScanOptionsActionType): IScanOptionsState {
  const { type, payload } = action;

  switch (type) {
    case 'scanOptions/scanDuration/set': {
      return {
        ...state,
        scanDuration: payload as number,
      };
    }
    case 'scanOptions/legacyMode/set': {
      return {
        ...state,
        legacyMode: payload as boolean,
      };
    }
    case 'scanOptions/scanPhy/set': {
      return {
        ...state,
        scanPhy: payload as number,
      };
    }
    case 'scanOptions/connectionTimeout/set': {
      return {
        ...state,
        connectionTimeout: payload as number,
      };
    }
    case 'scanOptions/connectionPhy/set': {
      return {
        ...state,
        connectionPhy: payload as number,
      };
    }
    default:
      return state;
  }
}

export default scanOptionsReducer;
