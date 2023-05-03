To flash images for LP_EM_CC2340R5 (PG1) :-

Using uniflash (minimum version v8.2.0.4220), (https://www.ti.com/tool/UNIFLASH)

For on-chip OAD (only On-Chip OAD is supported):-

1.  Erase on-chip flash
2.  Program
    - Image 1 - [mcuboot_LP_EM_CC2340R5_nortos_ticlang.hex](mcuboot_LP_EM_CC2340R5_nortos_ticlang.hex) at location AUTO
    - Image 2 - [persistent_app_LP_EM_CC2340R5_freertos_ticlang-v1.0.0.bin](persistent_app_LP_EM_CC2340R5_freertos_ticlang-v1.0.0.bin) as binary at location 0x6000
    - Image 3 - the app [basic_ble_oad_LP_EM_CC2340R5_freertos_ticlang-v1.0.0.bin](basic_ble_oad_LP_EM_CC2340R5_freertos_ticlang-v1.0.0.bin) as binary at location 0x34000 (optional)

