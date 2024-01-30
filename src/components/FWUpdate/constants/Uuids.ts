export const UUID = {

    // https://software-dl.ti.com/lprf/simplelink_cc2640r2_latest/docs/blestack/ble_user_guide/html/oad-ble-stack-3.x/oad_profile.html#oad-service-0xffc0
    OadServiceUuid: 'F000FFC0-0451-4000-B000-000000000000',

    // https://software-dl.ti.com/lprf/simplelink_cc2640r2_latest/docs/blestack/ble_user_guide/html/oad-ble-stack-3.x/oad_profile.html#oad-image-identify-0xffc1
    ImageIdentifyWriteUuid: 'F000FFC1-0451-4000-B000-000000000000',

    // https://software-dl.ti.com/lprf/simplelink_cc2640r2_latest/docs/blestack/ble_user_guide/html/oad-ble-stack-3.x/oad_profile.html#oad-image-block-characteristic-0xffc2
    ImageBlockRequestUuid: 'F000FFC2-0451-4000-B000-000000000000',

    //https://software-dl.ti.com/lprf/simplelink_cc2640r2_latest/docs/blestack/ble_user_guide/html/oad-ble-stack-3.x/oad_profile.html#oad-control-point-characteristic-0xffc5
    ImageControlPointUuid: 'F000FFC5-0451-4000-B000-000000000000',

    OadResetServiceUuid: 'F000FFD0-0451-4000-B000-000000000000',
    OadResetCharUuid: 'F000FFD1-0451-4000-B000-000000000000'
} as const;
