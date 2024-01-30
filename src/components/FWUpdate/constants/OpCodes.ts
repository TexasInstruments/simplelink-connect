// Payloads of commands : https://software-dl.ti.com/lprf/simplelink_cc2640r2_latest/docs/blestack/ble_user_guide/html/oad-ble-stack-3.x/oad_profile.html#id7 
export const OadProtocolOpCode = {
    OAD_REQ_GET_BLK_SZ: 0x01,          // Get Block Size - This command is used by a peer to determine what is the largest block size the target can support.
    OAD_REQ_DISABLE_BLK_NOTIF: 0x06,   // Disable block notification - This command is used to disable the image block request notifications.
    OAD_REQ_GET_SW_VER: 0x07,          // Get software version - This command is used to query the OAD target device for its software version.
    OAD_REQ_GET_OAD_STAT: 0x08,        // Get oad  publiv state machine - This command is used to query the status of the OAD

    //t hese opcodes are not supported yet
    // OAD_REQ_GET_PROF_VER      : 0x09,  // Get profile version - This command is used to query the version of the OAD profile.
    // OAD_REQ_GET_DEV_TYPE      : 0x10,  // Get device type - This command is used to query type of the device the profile is running on.
    // OAD_REQ_GET_IMG_INFO      : 0x11,  // Get image info - This command is used to get the image info structure
    //corresponding to the the image asked for.

    OAD_RSP_BLK_RSP_NOTIF: 0x12,        // Send block request - This command is used to send a block request notification to the peer device.
    OAD_REQ_ERASE_BONDS: 0x13,          // Erase bonds - This command is used to erase all BLE bonding info on the device.
    OAD_RSP_CMD_NOT_SUPPORTED: 0xFF,    // Error code returned when an external control command is received with an invalid opcode.
} as const;

export const OadResetServiceOpCodes = {
    OAD_RESET_CMD_START_OAD: 0x01,      // Using OAD Reset Service start a new OAD operation OAD_RESET_CMD_START_OAD The target device will invalidate the current running image and begin the update process
} as const;

export const OadEvent = {
    OAD_EVT_IMG_IDENTIFY_REQ: 0x00,     // Image identify request - his event occurs when new oad process begin with new image request.
    OAD_EVT_BLOCK_REQ: 0x01,            // Block request - This event occurs when new block is arrived
    OAD_EVT_TIMEOUT: 0x02,              // Timeout - This event occurs by timeout clock interrupt
    OAD_EVT_START_OAD: 0x03,            // Start OAD - This command is used to tell the target device that the configuration stage has completed and it is time to start sending block requests
    OAD_EVT_ENABLE_IMG: 0x04,           // Enable image - This command is used to enable an image after download,  instructing the target to prepare the image to run and then reboot
    OAD_EVT_CANCEL_OAD: 0x05,           // Cancel OAD - This command is used to cancel the OAD process.
} as const;