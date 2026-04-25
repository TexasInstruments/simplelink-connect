/*
 * Copyright (c) 2023, Texas Instruments Incorporated
 * All rights reserved.
 *
 * MS-OAD Protocol Constants
 *
 * This file contains all timing, size, and protocol-specific constants
 * for the MS-OAD (Multistep Over-the-Air Download) implementation.
 * Based on TI Multistep OAD specification and empirical testing.
 */

/**
 * MS-OAD Protocol Constants
 * All timing values are in milliseconds, all sizes in bytes
 */
export const MS_OAD_CONSTANTS = {
  // ============================================================================
  // Timing Constants
  // ============================================================================

  /**
   * Device boot time after reset (ms)
   * Time to wait for device to fully reboot and become connectable after reset
   */
  RECONNECT_DELAY_MS: 10000,

  /**
   * Delay before reconnect attempt after unexpected disconnect (ms)
   * Gives device time to stabilize before attempting reconnection
   */
  RECOVERY_DELAY_MS: 5000,

  // ============================================================================
  // Image Size Constants
  // ============================================================================

  /**
   * Size of each MS-OAD image half (bytes)
   * 0x3B000 = 241,664 bytes per half
   * Total firmware image = 2 halves = 483,328 bytes
   */
  IMAGE_HALF_SIZE: 0x3B000,

  /**
   * Gap between first and second half (bytes)
   * 0x800 = 2,048 bytes reserved for metadata/header
   */
  IMAGE_HALF_GAP: 0x800,

  /**
   * Expected total size of complete firmware image (bytes)
   * First half: 0x00000 - 0x3B000 (241,664 bytes)
   * Gap:        0x3B000 - 0x3B800 (2,048 bytes) - skipped
   * Second half: 0x3B800 - 0x76800 (241,664 bytes)
   * Gap:         0x76800 - 0x77000 (2,048 bytes)  - included in file
   **/
  COMPLETE_IMAGE_SIZE: 0x77000,

  // ============================================================================
  // Validation Constants
  // ============================================================================

  /**
   * MCUboot swap magic value for bootable image validation
   * This magic number appears in the image header to indicate a valid
   * MCUboot-compatible bootable image
   */
  MCUBOOT_SWAP_MAGIC: '77c295f360d2ef7f355250f2cb67980',
} as const;

// Type for the constants object (useful for type checking)
export type MsOadConstants = typeof MS_OAD_CONSTANTS;
