import { useEffect, useState } from 'react';
import { CONFIGURATION_CLIENT, CONFIGURATION_SERVER, GENERIC_BATTERY_CLIENT, GENERIC_BATTERY_SERVER, GENERIC_DEFAULT_TRANSITION_TIME_CLIENT, GENERIC_DEFAULT_TRANSITION_TIME_SERVER, GENERIC_LEVEL_CLIENT, GENERIC_LEVEL_SERVER, GENERIC_ON_OFF_CLIENT, GENERIC_ON_OFF_SERVER, GENERIC_POWER_LEVEL_CLIENT, GENERIC_POWER_LEVEL_SERVER, GENERIC_POWER_ON_OFF_CLIENT, GENERIC_POWER_ON_OFF_SERVER, HEALTH_SERVER_MODEL, Model, SENSOR_CLIENT, SENSOR_SERVER, SENSOR_SETUP_SERVER } from '../meshUtils';
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


interface Props {
    model: Model
}

export const ModelIcon: React.FC<Props> = ({ model }) => {
    const [iconName, setIconName] = useState<string>('access-point');
    const [iconType, setIconType] = useState<string>('MaterialCommunityIcons');

    useEffect(() => {
        if (!model.type.includes('SIG')) {
            setIconName('build');  // vendor icon
            setIconType('MaterialIcons');
            return;
        }

        switch (model.id) {
            case HEALTH_SERVER_MODEL:
                setIconName('healing');
                setIconType('MaterialIcons');
                break;
            case SENSOR_SERVER:
            case SENSOR_CLIENT:
            case SENSOR_SETUP_SERVER:
                setIconName('access-point');
                setIconType('MaterialCommunityIcons');
                break;
            case GENERIC_POWER_ON_OFF_CLIENT:
            case GENERIC_POWER_ON_OFF_SERVER:
                setIconName('power-plug');
                setIconType('MaterialCommunityIcons');
                break;
            case CONFIGURATION_CLIENT:
            case CONFIGURATION_SERVER:
                setIconName('settings');
                setIconType('MaterialIcons');
                break;
            case GENERIC_ON_OFF_CLIENT:
            case GENERIC_ON_OFF_SERVER:
                setIconName('lightbulb');
                setIconType('MaterialCommunityIcons');
                break;
            case GENERIC_LEVEL_CLIENT:
            case GENERIC_LEVEL_SERVER:
                setIconName('equalizer');
                setIconType('MaterialCommunityIcons');
                break;
            case GENERIC_DEFAULT_TRANSITION_TIME_CLIENT:
            case GENERIC_DEFAULT_TRANSITION_TIME_SERVER:
                setIconName('timer');
                setIconType('MaterialCommunityIcons');
                break;
            case GENERIC_BATTERY_CLIENT:
            case GENERIC_BATTERY_SERVER:
                setIconName('battery-charging');
                setIconType('MaterialCommunityIcons');
                break;

            default:
                setIconName('help-outline');  // default icon
                setIconType('MaterialIcons');
        }


    }, [model.id]);

    if (iconType === 'MaterialIcons') {
        return <MaterialIcons name={iconName} size={32} />

    }
    else if (iconType === 'MaterialCommunityIcons') {
        return <MaterialCommunityIcons name={iconName} size={32} />
    }
    return null;
};

export default ModelIcon;
