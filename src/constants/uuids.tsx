export const TI_SIMPLE_PERIPHERAL_SERVICE = {
    uuid: 'fff0',

    // 1-byte value that can be read or written from a GATT client device
    simpleprofile_char1: 'FFF1',

    // 1-byte value that can be read from a GATT client device but cannot be written
    simpleprofile_char2: 'FFF2',

    // 1-byte value that can be written from a GATT client device but cannot be read
    simpleprofile_char3: 'FFF3',

    // 1-byte value that cannot be directly read or written from a GATT client device (This value is notifiable: This value can be configured for notifications to be sent to a GATT client device.)
    simpleprofile_char4: 'FFF4',

    simpleprofile_char5: 'FFF5',

}


export const TI_DATA_STREAM_SERVICE = {
    uuid: 'F000C0C0-0451-4000-B000-000000000000',

    data_in_char: 'F000C0C1-0451-4000-B000-000000000000',

    data_out_char: 'F000C0C2-0451-4000-B000-000000000000'
}

export const SUPPORTED_SPAECIFIC_SCREEN = ["matter light profile", "light sensor service", "wi-fi provisioning over ble", "ti ecg service", "ecg service", "glucose", "continuous glucose monitoring", "health thermometer", "ti terminal", "ti oad", "temp", "humidity", "barometer", "optical", "movement", "simple keys", "battery", "i/o", "control", "battery service", "ti accelerometer service"] as const;

export const CGM_PROFILE = {
    uuid: '181F',
    cgm_measurement: '2AA7',
    cgm_feature: '2AA8',
    cgm_status: '2AA9',
    cgm_session_start_time: '2AAA',
    cgm_session_run_time: '2AAB',
    record_access_cp: '2A52',
    cgm_specific_op_cp: '2AAC'
}

export const GLUCOSE_PROFILE = {
    uuid: '1808',
    glucose_measurement: '2A18',
    glucose_feature: '2a51',
    record_access_cp: '2A52',
}