import { IFilterSortState } from '../../types';

export type EnablerActionTypes =
  | 'sort/rssi/set/enabled'
  | 'sort/app_name/set/enabled'
  | 'filter/rssi/set/enabled'
  | 'filter/connectable/set/enabled'
  | 'filter/app_name/set/enabled'
  | 'filter/removeInactiveOutDevices/set/enabled';

export type ValueActionTypes = 'filter/rssi/set/value' | 'filter/app_name/set/value';

export type ActionType =
  | { type: 'sort/rssi/set/enabled'; payload: boolean }
  | { type: 'sort/app_name/set/enabled'; payload: boolean }
  | { type: 'filter/rssi/set/enabled'; payload: boolean }
  | { type: 'filter/connectable/set/enabled'; payload: boolean }
  | { type: 'filter/app_name/set/enabled'; payload: boolean }
  | { type: 'filter/rssi/set/value'; payload: string }
  | { type: 'filter/app_name/set/value'; payload: string }
  | { type: 'filter/removeInactiveOutDevices/set/enabled'; payload: boolean };

function filterSortReducer(state: IFilterSortState, action: ActionType): IFilterSortState {
  let { type, payload } = action;

  switch (type) {
    case 'sort/rssi/set/enabled': {
      return {
        ...state,
        sort: {
          ...state.sort,
          rssi: payload as boolean,
        },
      };
    }
    case 'sort/app_name/set/enabled': {
      return {
        ...state,
        sort: {
          ...state.sort,
          app_name: payload as boolean,
        },
      };
    }
    case 'filter/rssi/set/enabled': {
      return {
        ...state,
        filter: {
          ...state.filter,
          rssi: {
            ...state.filter.rssi,
            enabled: payload as boolean,
          },
        },
      };
    }
    case 'filter/connectable/set/enabled': {
      return {
        ...state,
        filter: {
          ...state.filter,
          connectable: payload as boolean,
        },
      };
    }
    case 'filter/app_name/set/enabled': {
      return {
        ...state,
        filter: {
          ...state.filter,
          app_name: {
            ...state.filter.app_name,
            enabled: payload as boolean,
          },
        },
      };
    }
    case 'filter/rssi/set/value': {
      return {
        ...state,
        filter: {
          ...state.filter,
          rssi: {
            ...state.filter.rssi,
            value: payload as string,
          },
        },
      };
    }
    case 'filter/app_name/set/value': {
      return {
        ...state,
        filter: {
          ...state.filter,
          app_name: {
            ...state.filter.app_name,
            value: payload as string,
          },
        },
      };
    }
    case 'filter/removeInactiveOutDevices/set/enabled': {
      return {
        ...state,
        filter: {
          ...state.filter,
          removeInactiveOutDevices: payload as boolean,
        },
      };
    }
    default:
      return state;
  }
}

export default filterSortReducer;
