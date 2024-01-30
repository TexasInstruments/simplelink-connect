// https://software-dl.ti.com/lprf/simplelink_cc2640r2_latest/docs/blestack/ble_user_guide/html/oad-ble-stack-3.x/oad_profile.html#oad-return-values 

export const OadStatus = {
    OAD_PROFILE_SUCCESS: 0,             // OAD succeeded.
    OAD_PROFILE_VALIDATION_ERR: 1,      // Downloaded image header doesn't match.
    OAD_PROFILE_FLASH_ERR: 2,           // Flash function failure (int, ext).
    OAD_PROFILE_BUFFER_OFL: 3,          // Block Number doesn't match requested.
    OAD_PROFILE_ALREADY_STARTED: 4,     // OAD is already is progress.
    OAD_PROFILE_NOT_STARTED: 5,         // OAD has not yet started.
    OAD_PROFILE_DL_NOT_COMPLETE: 6,     // An OAD is ongoing.
    OAD_PROFILE_NO_RESOURCES: 7,        // If memory allocation fails.
    OAD_PROFILE_IMAGE_TOO_BIG: 8,       // Candidate image is too big.
    OAD_PROFILE_INCOMPATIBLE_IMAGE: 9,  // Image signing failure, boundary mismatch.
    OAD_PROFILE_INVALID_FILE: 10,       // If Invalid image ID received.
    OAD_PROFILE_INCOMPATIBLE_FILE: 11,  // BIM/MCUBOOT or FW mismatch.
    OAD_PROFILE_AUTH_FAIL: 12,          // Authorization failed.
    OAD_PROFILE_EXT_NOT_SUPPORTED: 13,  // Ctrl point command not supported.
    OAD_PROFILE_DL_COMPLETE: 14,        // OAD image payload download complete.
    OAD_PROFILE_CCCD_NOT_ENABLED: 15,   // CCCD is not enabled, notif can't be sent.
    OAD_PROFILE_IMG_ID_TIMEOUT: 16,     // Image identify timed out, too many failures.
    OAD_PROFILE_APP_STOP_PROCESS: 17,   // Target app cancel oad
    OAD_PROFILE_ERROR: 18,              // General internal error of the module
} as const;
