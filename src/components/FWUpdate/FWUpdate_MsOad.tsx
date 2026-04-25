/*
 * Copyright (c) 2023, Texas Instruments Incorporated
 * All rights reserved.
 *
 * MS-OAD (Multistep Over-the-Air Download) Module
 *
 * This module handles all MS-OAD specific logic for firmware updates,
 * separating it from the original OAD implementation for better maintainability.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { Platform, EventSubscription } from 'react-native';
import BleManager from 'react-native-ble-manager';
import { UUID } from './constants/Uuids';
import {
  OadEvent,
  OadProtocolOpCode,
  MsOadState,
  MsOadStateType,
  MsOadSpecificCommands
} from './constants/OpCodes';
import { OadStatus } from './constants/Statuses';
import { MsOadFileType, MsOadFileTypeValue, MsOadImageHalf } from './constants/MsOadFileTypes';
import { MS_OAD_CONSTANTS } from './constants/MsOadConstants';
import { buf2hex } from '../../hooks/convert';
import { downloadDataToLocalStorage } from '../../services/DownloadFileUtils';
import * as DocumentPicker from 'expo-document-picker';
import { useServiceViewContext } from '../../context/ServiceViewContext';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface MsOadState {
  enabled: boolean;
  state: MsOadStateType;
  currentStage: number;
  overallProgress: number;
  images: Record<MsOadFileTypeValue, Uint8Array | undefined>;
  fileNames: Record<MsOadFileTypeValue, string | undefined>;
}

export interface MsOadFunctions {
  logMsOad: (message: string) => void;
  exportMsOadLogs: () => Promise<void>;
  clearMsOadLogs: () => void;
  handleMsOadDeviceReset: (peripheralId: string) => Promise<unknown>;
  handleMsOadStateTransfer: (peripheralId: string, state: MsOadStateType) => Promise<void>;
  sendMsOadAck: (peripheralId: string) => Promise<void>;
  getMsOadState: () => Promise<MsOadStateType>;
  initMsOad: () => Promise<boolean>;
  getMsOadStateDescription: (state: MsOadStateType) => string;
  isMultistepOadMode: () => Promise<boolean>;
  sendImagUpdateReqMsOad: (
    peripheralId: string,
    fwImageByteArray: Uint8Array
  ) => Promise<{ success: boolean; blockSize?: number; numBlocks?: number; imageBytes?: Uint8Array }>;
  sendImageBlocksMsOad: (
    peripheralId: string,
    fwImageByteArray: Uint8Array,
    blockSize: number,
    numBlocks: number,
    charValueSubscription: React.MutableRefObject<EventSubscription | null>,
    currentStage: number
  ) => Promise<void>;
  addMsOadFile: (imageType: MsOadFileTypeValue) => Promise<void>;
  writeBlockMsOad: (
    peripheralId: string,
    blockRequested: number,
    blockData: Uint8Array,
    blockSize: number,
    numBlocks: number
  ) => Promise<void>;
}

export interface MsOadHookParams {
  peripheralId: string;
  setStatus: (status: string) => void;
  setProgress: (progress: number) => void;
  setUpdating: (updating: boolean) => void;
  writeWaitNotify: any;
  getSwVersion: () => Promise<string | undefined>;
  getImgVersionFromImg: (fwImageByteArray: Uint8Array | number[]) => string;
  setDeviceSwVersion: (version: string | undefined) => void;
}

// ============================================================================
// Custom Hook: useMsOad
// ============================================================================

export function useMsOad(params: MsOadHookParams) {
  const { peripheralId, setStatus, setProgress, setUpdating, writeWaitNotify, getSwVersion, getImgVersionFromImg, setDeviceSwVersion } = params;

  // State management
  const [msOadEnabled, setMsOadEnabled] = useState<boolean>(false);
  const [msOadState, setMsOadState] = useState<MsOadStateType>(MsOadState.MS_OAD_IDLE);
  const [msOadCurrentStage, setMsOadCurrentStage] = useState<number>(0);
  const [msOadOverallProgress, setMsOadOverallProgress] = useState<number>(0);
  const { updatePeripheral } = useServiceViewContext();

  // Lightweight state: only track which images are loaded (for UI), not the bytes
  // Users upload 2 complete firmware images, app splits them automatically
  const [msOadImagesLoaded, setMsOadImagesLoaded] = useState<Record<MsOadFileTypeValue, boolean>>({
    [MsOadFileType.ORIGINAL_V1]: false,
    [MsOadFileType.NEW_V2]: false,
  });

  const [msOadFileNames, setMsOadFileNames] = useState<Record<MsOadFileTypeValue, string | undefined>>({
    [MsOadFileType.ORIGINAL_V1]: undefined,
    [MsOadFileType.NEW_V2]: undefined,
  });

  // Firmware versions
  const [msOadVersions, setMsOadVersions] = useState<Record<MsOadFileTypeValue, string | undefined>>({
    [MsOadFileType.ORIGINAL_V1]: undefined,
    [MsOadFileType.NEW_V2]: undefined,
  });


  // Log collection
  const msOadLogs = useRef<string[]>([]);

  // Block transfer state
  const [blockSize, setBlockSize] = useState<number>(20);
  const [numBlocks, setNumBlocks] = useState<number>(0);
  const charValueSubscription = useRef<EventSubscription | null>(null);
  const currentImageRef = useRef<Uint8Array | null>(null);

  // Disconnect handling state
  const isExpectingDisconnect = useRef<boolean>(false);
  const isHandlingUnexpectedDisconnect = useRef<boolean>(false);
  const isUpdateComplete = useRef<boolean>(false);

  // Store complete firmware images (will be split into halves on-demand)
  // Each complete image is 0x76800 (485,376) bytes total
  const msOadImagesRef = useRef<Record<MsOadFileTypeValue, Uint8Array | undefined>>({
    [MsOadFileType.ORIGINAL_V1]: undefined,
    [MsOadFileType.NEW_V2]: undefined,
  });

  // ============================================================================
  // Logging Functions
  // ============================================================================

  function logMsOad(message: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    // msOadLogs.current.push(logEntry);
    console.log(message);
  }

  async function exportMsOadLogs() {
    if (msOadLogs.current.length === 0) {
      alert('No MS-OAD logs to export');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `ms-oad-logs-${timestamp}.txt`;
    const logsText = msOadLogs.current.join('\n');

    try {
      await downloadDataToLocalStorage(logsText, fileName, 'text/plain');
      alert(`MS-OAD logs exported: ${fileName}`);
    } catch (error) {
      console.error('Failed to export MS-OAD logs:', error);
      alert('Failed to export logs');
    }
  }

  function clearMsOadLogs() {
    msOadLogs.current = [];
    logMsOad('MS-OAD logs cleared');
  }

  // ============================================================================
  // Image Splitting Functions
  // ============================================================================

  /**
   * Splits a complete MS-OAD firmware image into first and second halves
   * Based on TI MS-OAD specification:
   * - First half (bootable):     0x00000 - 0x3B000 (241,664 bytes)
   * - SWAP_PAGE_SLOT (gap):      0x3B000 - 0x3B800 (2,048 bytes) - SKIPPED
   * - Second half (non-bootable): 0x3B800 - 0x76800 (241,664 bytes)
   *
   * @param completeImage - Complete firmware image (0x76800 = 485,376 bytes)
   * @returns Object with firstHalf and secondHalf Uint8Arrays
   */
  function splitFirmwareImage(completeImage: Uint8Array): { firstHalf: Uint8Array; secondHalf: Uint8Array } {
    const { IMAGE_HALF_SIZE, IMAGE_HALF_GAP, COMPLETE_IMAGE_SIZE } = MS_OAD_CONSTANTS;

    // Validate image size
    if (completeImage.length !== COMPLETE_IMAGE_SIZE) {
      throw new Error(
        `Invalid firmware image size!\n` +
        `Expected: ${COMPLETE_IMAGE_SIZE} bytes (0x${COMPLETE_IMAGE_SIZE.toString(16).toUpperCase()})\n` +
        `Actual: ${completeImage.length} bytes\n` +
        `Please upload a complete MS-OAD firmware image.`
      );
    }

    // Extract first half: bytes [0x00000 : 0x3B000]
    const firstHalf = completeImage.slice(0, IMAGE_HALF_SIZE);

    // Extract second half: bytes [0x3B800 : 0x76800]
    // Skip the SWAP_PAGE_SLOT gap (0x3B000 - 0x3B800)
    const secondHalfStart = IMAGE_HALF_SIZE + IMAGE_HALF_GAP;
    const secondHalf = completeImage.slice(secondHalfStart, secondHalfStart + IMAGE_HALF_SIZE);

    logMsOad(`Image split successful:`);
    logMsOad(`  Complete image: ${completeImage.length} bytes`);
    logMsOad(`  First half: ${firstHalf.length} bytes (0x0000 - 0x${IMAGE_HALF_SIZE.toString(16).toUpperCase()})`);
    logMsOad(`  Gap skipped: ${IMAGE_HALF_GAP} bytes (0x${IMAGE_HALF_SIZE.toString(16).toUpperCase()} - 0x${secondHalfStart.toString(16).toUpperCase()})`);
    logMsOad(`  Second half: ${secondHalf.length} bytes (0x${secondHalfStart.toString(16).toUpperCase()} - 0x${COMPLETE_IMAGE_SIZE.toString(16).toUpperCase()})`);

    return { firstHalf, secondHalf };
  }

  /**
   * Gets the appropriate image half for the current MS-OAD state
   * @param imageType - ORIGINAL_V1 or NEW_V2
   * @param half - FIRST_HALF or SECOND_HALF
   * @returns The requested image half as Uint8Array
   */
  function getImageHalf(imageType: MsOadFileTypeValue, half: MsOadImageHalf): Uint8Array | undefined {
    const completeImage = msOadImagesRef.current[imageType];
    if (!completeImage) {
      logMsOad(`ERROR: Complete image not loaded for ${imageType}`);
      return undefined;
    }

    try {
      const { firstHalf, secondHalf } = splitFirmwareImage(completeImage);
      return half === MsOadImageHalf.FIRST_HALF ? firstHalf : secondHalf;
    } catch (error) {
      logMsOad(`ERROR: Failed to split image - ${error}`);
      return undefined;
    }
  }

  // ============================================================================
  // Version Parsing Functions
  // ============================================================================

  async function getDeviceSwVersion(): Promise<string | undefined> {
    try {
      logMsOad('Querying device software version...');

      // Use the parent component's getSwVersion function which properly uses writeWaitNotify
      const version = await getSwVersion();
      if (version) {
        logMsOad(`Device software version: ${version}`);
        setDeviceSwVersion(version);
        return version;
      } else {
        logMsOad('ERROR: Failed to get device version - no version returned');
        return undefined;
      }
    } catch (error) {
      logMsOad(`ERROR: Failed to get device version - ${error}`);
      return undefined;
    }
  }

  // ============================================================================
  // Unexpected Disconnect Handler
  // ============================================================================

  async function handleUnexpectedDisconnect(peripheralId: string) {
    if (isHandlingUnexpectedDisconnect.current) {
      logMsOad('Already handling unexpected disconnect, ignoring duplicate');
      return;
    }

    isHandlingUnexpectedDisconnect.current = true;
    logMsOad('UNEXPECTED DISCONNECT detected - attempting recovery');
    setStatus('Connection lost! reconnecting...');

    try {
      // Wait a bit before reconnecting
      logMsOad(`Waiting ${MS_OAD_CONSTANTS.RECOVERY_DELAY_MS / 1000} seconds before reconnect attempt...`);
      await new Promise(resolve => setTimeout(resolve, MS_OAD_CONSTANTS.RECOVERY_DELAY_MS));

      // Attempt to reconnect
      logMsOad('Attempting to reconnect...');
      await BleManager.connect(peripheralId);
      const peripheralInfo = await BleManager.retrieveServices(peripheralId);
      updatePeripheral(peripheralInfo)

      logMsOad('Reconnected successfully!');

      // Query the current MS-OAD state from device
      logMsOad('Querying current MS-OAD state...');
      const currentState = await getMsOadState();
      logMsOad(`Device state after reconnect: ${getMsOadStateDescription(currentState)} (${currentState})`);

      // Continue from the current state
      setStatus('Reconnected - resuming update...');
      await handleMsOadStateTransfer(peripheralId, currentState);

    } catch (error) {
      logMsOad(`ERROR: Failed to recover from unexpected disconnect - ${error}`);
      setStatus('Failed to reconnect after disconnect');
      setUpdating(false);
      alert('Connection lost and failed to reconnect. Please restart the update process.');
    } finally {
      isHandlingUnexpectedDisconnect.current = false;
    }
  }

  // Set up global disconnect listener for unexpected disconnects
  useEffect(() => {
    if (!msOadEnabled) return;

    logMsOad('Setting up global disconnect listener for MS-OAD');

    const disconnectListener = BleManager.onDisconnectPeripheral(async (data: any) => {
      const disconnectedId = data?.peripheral || 'unknown';

      // Ignore if different device
      if (disconnectedId !== peripheralId && disconnectedId !== 'unknown') {
        return;
      }

      // Check if update is complete - don't handle disconnect after completion
      if (isUpdateComplete.current) {
        logMsOad('Disconnect after update complete - ignoring');
        return;
      }

      // Check if this is an expected disconnect (during planned reset)
      if (isExpectingDisconnect.current) {
        logMsOad('Expected disconnect (during reset) - ignoring in global handler');
        return;
      }

      // This is an unexpected disconnect - handle it
      logMsOad('Unexpected disconnect detected in global handler');
      await handleUnexpectedDisconnect(peripheralId);
    });

    return () => {
      logMsOad('Cleaning up global disconnect listener');
      disconnectListener.remove();
    };
  }, [msOadEnabled, peripheralId]);

  // ============================================================================
  // Device Reset Handler
  // ============================================================================

  async function handleMsOadDeviceReset(peripheralId: string) {
    return new Promise((resolve, reject) => {
      logMsOad('Waiting for device reset...');

      // Mark this as an expected disconnect
      isExpectingDisconnect.current = true;

      let resetHandled = false;
      let resetTimer: NodeJS.Timeout;

      const disconnectListener = BleManager.onDisconnectPeripheral(
        async (data: any) => {
          if (resetHandled) return;

          resetHandled = true;
          clearTimeout(resetTimer);

          const disconnectedId = data?.peripheral || 'unknown';

          if (disconnectedId !== peripheralId && disconnectedId !== 'unknown') {
            logMsOad(`Disconnect from different device (${disconnectedId}), ignoring`);
            return;
          }

          logMsOad('Device reset detected');
          setStatus('Device reset! reconnecting...');

          try {
            // wait 10 seconds before connecting
            logMsOad(`Waiting ${MS_OAD_CONSTANTS.RECONNECT_DELAY_MS / 1000} seconds before reconnecting...`)
            await new Promise(resolve => setTimeout(resolve, MS_OAD_CONSTANTS.RECONNECT_DELAY_MS));

            await BleManager.connect(peripheralId);
            let peripheralInfo = await BleManager.retrieveServices(peripheralId);
            updatePeripheral(peripheralInfo)

            logMsOad('Reconnected successfully');
            setStatus('Reconnected, querying state...');

            const newState = await getMsOadState();
            logMsOad(`State after reset: ${getMsOadStateDescription(newState)} (${newState})`);
            setStatus(`MS-OAD State: ${getMsOadStateDescription(newState)}`);

            disconnectListener.remove();

            if (Platform.OS === 'android') {
              await BleManager.requestConnectionPriority(peripheralId, 1);
              let mtu = await BleManager.requestMTU(peripheralId, 255);
              logMsOad(`MTU set to: ${mtu}`);
            }

            // Reset is complete, no longer expecting disconnect
            isExpectingDisconnect.current = false;

            await handleMsOadStateTransfer(peripheralId, newState);

            resolve(true);
          } catch (error) {
            logMsOad(`ERROR: Failed to reconnect after reset - ${error}`);
            disconnectListener.remove();
            // Reset failed, no longer expecting disconnect
            isExpectingDisconnect.current = false;
            reject(error);
          }
        }
      );

      resetTimer = setTimeout(async () => {
        if (resetHandled) return;

        logMsOad('ERROR: Device did not reset within 15 seconds - timeout');
        disconnectListener.remove();
        // Reset timeout, no longer expecting disconnect
        isExpectingDisconnect.current = false;
        alert('Device did not reset within 15 seconds. Please check device and try again.');
        reject('Reset timeout');
      }, 15000);
    });
  }

  // ============================================================================
  // Final Disconnect and Reconnect Handler (After ACK)
  // ============================================================================

  async function handleFinalDisconnectAndReconnect(peripheralId: string, isRevert: boolean = false) {
    return new Promise((resolve, reject) => {
      logMsOad('Waiting for device to disconnect after ACK...');

      let resetHandled = false;
      let resetTimer: NodeJS.Timeout;

      const disconnectListener = BleManager.onDisconnectPeripheral(
        async (data: any) => {
          if (resetHandled) return;

          resetHandled = true;
          clearTimeout(resetTimer);

          const disconnectedId = data?.peripheral || 'unknown';

          if (disconnectedId !== peripheralId && disconnectedId !== 'unknown') {
            logMsOad(`Disconnect from different device (${disconnectedId}), ignoring`);
            return;
          }

          logMsOad('Device disconnected after ACK');
          setStatus('Device reset after ACK! reconnecting...');

          try {
            // Wait 10 seconds before reconnecting
            logMsOad(`Waiting ${MS_OAD_CONSTANTS.RECONNECT_DELAY_MS / 1000} seconds before reconnecting...`);
            await new Promise(resolve => setTimeout(resolve, MS_OAD_CONSTANTS.RECONNECT_DELAY_MS));

            // Reconnect to device
            await BleManager.connect(peripheralId);
            let peripheralInfo = await BleManager.retrieveServices(peripheralId);
            updatePeripheral(peripheralInfo)

            logMsOad('Reconnected successfully!');

            // Verify we're in IDLE state
            const finalState = await getMsOadState();
            logMsOad(`Final state after reconnect: ${getMsOadStateDescription(finalState)} (${finalState})`);

            if (finalState === MsOadState.MS_OAD_IDLE) {
              // Get firmware version after update
              setStatus('Verifying firmware version...');
              const newVersion = await getSwVersion();
              if (newVersion) {
                logMsOad(`Firmware version after update: ${newVersion}`);
                setDeviceSwVersion(newVersion);
              }

              // Reset flags
              isExpectingDisconnect.current = false;

              // Update complete!
              if (isRevert) {
                logMsOad('=== MS-OAD REVERT COMPLETE ===');
                setStatus(`Successfully reverted to original firmware (v${newVersion || 'unknown'})`);
              } else {
                logMsOad('=== MS-OAD UPDATE COMPLETE ===');
                setStatus(`OAD completed successfully! New version: ${newVersion || 'unknown'}`);
              }
              setUpdating(false);
              setProgress(1);
              setMsOadOverallProgress(1);

              disconnectListener.remove();
              resolve(true);
            } else {
              logMsOad(`WARNING: Expected IDLE state but got ${getMsOadStateDescription(finalState)}`);
              setStatus(`Update complete, but device in unexpected state: ${getMsOadStateDescription(finalState)}`);
              setUpdating(false);
              disconnectListener.remove();
              isExpectingDisconnect.current = false;
              resolve(true);
            }
          } catch (error) {
            logMsOad(`ERROR: Failed to reconnect after ACK - ${error}`);
            disconnectListener.remove();
            isExpectingDisconnect.current = false;
            setStatus('Update complete, but failed to reconnect');
            setUpdating(false);
            setProgress(1);
            setMsOadOverallProgress(1);
            alert('Update complete but failed to reconnect to device. Please reconnect manually.');
            resolve(true); // Resolve anyway, update is complete
          }
        }
      );

      resetTimer = setTimeout(async () => {
        if (resetHandled) return;

        logMsOad('ERROR: Device did not disconnect within 15 seconds after ACK');
        disconnectListener.remove();
        isExpectingDisconnect.current = false;
        setStatus('Update may be complete, but device did not disconnect as expected');
        setUpdating(false);
        alert('Device did not disconnect after ACK. Update may be complete. Please check device.');
        resolve(true); // Resolve anyway
      }, 15000);
    });
  }

  // ============================================================================
  // State Transfer Handler
  // ============================================================================

  async function handleMsOadStateTransfer(peripheralId: string, state: MsOadStateType) {
    logMsOad(`Current state: ${getMsOadStateDescription(state)} (${state})`);

    let imageToSend: Uint8Array | undefined;
    let description = '';
    let stageNumber = 0;
    let statusMessage = '';

    switch (state) {
      case MsOadState.MS_OAD_UNINITIALIZED:
        logMsOad('Device in UNINITIALIZED state');
        return;

      case MsOadState.MS_OAD_IDLE:
        if (msOadCurrentStage === 0) {
          logMsOad('Device in IDLE state at start - initializing MS-OAD');
          setStatus('Initializing MS-OAD...');
          // Reset completion flag for new update
          isUpdateComplete.current = false;
          const idleResetPromise = handleMsOadDeviceReset(peripheralId);
          await initMsOad();
          await idleResetPromise;
          return;
        } else {
          logMsOad('=== MS-OAD PROCESS COMPLETE ===');
          setStatus('MS-OAD process complete');
          setUpdating(false);
          setProgress(1);
          setMsOadOverallProgress(1);
          return;
        }
      case MsOadState.MS_OAD_WAIT_FIRST_HALF:
        stageNumber = 1;
        setMsOadCurrentStage(1);
        imageToSend = getImageHalf(MsOadFileType.NEW_V2, MsOadImageHalf.FIRST_HALF);
        description = 'new image (first half)';
        statusMessage = 'Uploading new image first half...';
        logMsOad(statusMessage);

        break;

      case MsOadState.MS_OAD_WAIT_SECOND_HALF:
        stageNumber = 2;
        setMsOadCurrentStage(2);
        imageToSend = getImageHalf(MsOadFileType.NEW_V2, MsOadImageHalf.SECOND_HALF);
        description = 'new image (second half)';
        statusMessage = 'Uploading new image second half...';
        logMsOad(statusMessage);
        break;

      case MsOadState.MS_OAD_WAIT_FIRST_HALF_REVERT:
        stageNumber = 3;
        setMsOadCurrentStage(3);
        imageToSend = getImageHalf(MsOadFileType.ORIGINAL_V1, MsOadImageHalf.FIRST_HALF);
        description = 'original image (first half) - REVERTING';
        statusMessage = 'Reverting: Uploading original image first half...';
        logMsOad(statusMessage);

        break;

      case MsOadState.MS_OAD_WAIT_SECOND_HALF_REVERT:
        stageNumber = 4;
        setMsOadCurrentStage(4);
        imageToSend = getImageHalf(MsOadFileType.ORIGINAL_V1, MsOadImageHalf.SECOND_HALF);
        description = 'original image (second half) - REVERTING';
        statusMessage = 'Reverting: Uploading original image second half...';
        logMsOad(statusMessage);
        break;

      case MsOadState.MS_OAD_NEW_IMAGE_READY:
        logMsOad('PHASE 4: New image ready - sending ACK to commit');
        setStatus('Sending ACK...');
        setMsOadCurrentStage(5); // Mark as complete

        // Mark update as complete (prevents global disconnect handler from running)
        isUpdateComplete.current = true;

        // Mark disconnect as expected (device will reset after ACK)
        isExpectingDisconnect.current = true;

        await sendMsOadAck(peripheralId);

        // Wait for device to disconnect and reconnect
        await handleFinalDisconnectAndReconnect(peripheralId);
        return;

      case MsOadState.MS_OAD_IMAGE_READY_REVERT:
        logMsOad('REVERT COMPLETE: Sending ACK to commit revert');
        setStatus('Sending ACK (revert)...');
        setMsOadCurrentStage(5); // Mark as complete

        // Mark update as complete (prevents global disconnect handler from running)
        isUpdateComplete.current = true;

        // Mark disconnect as expected (device will reset after ACK)
        isExpectingDisconnect.current = true;

        await sendMsOadAck(peripheralId);

        // Wait for device to disconnect and reconnect
        await handleFinalDisconnectAndReconnect(peripheralId, true);
        return;

      default:
        logMsOad(`ERROR: Unknown MS-OAD state: ${state}`);
        setStatus('Unknown MS-OAD state');
        return;
    }

    if (!imageToSend) {
      logMsOad(`ERROR: No image available for state ${state} - ${getMsOadStateDescription(state)}`);
      return;
    }

    logMsOad(`=== Sending ${description} (${imageToSend.length} bytes) - Stage ${stageNumber} of 4 ===`);
    setStatus(statusMessage);

    // Prepare and send the image
    const result = await sendImagUpdateReqMsOad(peripheralId, imageToSend);
    if (result.success && result.blockSize && result.numBlocks && result.imageBytes) {

      // Image header accepted, now start block transfer
      logMsOad(`Starting block transfer for ${description}`);
      logMsOad(`Block size: ${result.blockSize} bytes, Num blocks: ${result.numBlocks}`);

      // Start block transfer and wait for DL_COMPLETE
      // This promise resolves when all blocks are sent
      await sendImageBlocksMsOad(
        peripheralId,
        result.imageBytes,
        result.blockSize,
        result.numBlocks,
        charValueSubscription,
        stageNumber
      );

      logMsOad('Waiting for device reset...');
      await handleMsOadDeviceReset(peripheralId);

    } else {
      logMsOad('ERROR: Failed to prepare image for transfer');
      setStatus('Error: Failed to prepare image for transfer');
      alert('Failed to prepare image for transfer. Please try again.');
    }
  }

  // ============================================================================
  // MS-OAD Commands
  // ============================================================================

  async function sendMsOadAck(peripheralId: string): Promise<void> {
    logMsOad('Sending OAD_MS_OAD_ACK (0x17) to commit update');

    const ackCmd = new Uint8Array([MsOadSpecificCommands.OAD_MS_OAD_ACK]);
    const cmdArray = Array.from(ackCmd);

    try {
      await BleManager.writeWithoutResponse(
        peripheralId,
        UUID.OadServiceUuid,
        UUID.ImageControlPointUuid,
        cmdArray,
        1
      );
      logMsOad('MS-OAD ACK sent successfully - device will commit and reset');
    } catch (error) {
      logMsOad(`ERROR: Failed to send MS-OAD ACK - ${error}`);
      throw error;
    }
  }

  async function getMsOadState(): Promise<MsOadStateType> {
    const OadModeCmd = new Uint8Array([MsOadSpecificCommands.OAD_REQ_GET_MS_STATE]);
    let rsp = await writeWaitNotify(
      peripheralId,
      UUID.OadServiceUuid,
      UUID.ImageControlPointUuid,
      true,
      OadModeCmd,
      1
    );

    const status = rsp[1];
    const state = (rsp[2] + (rsp[3] << 8) + (rsp[4] << 16) + (rsp[5] << 24)) as MsOadStateType;
    setMsOadState(state);
    return state;
  }

  async function initMsOad(): Promise<boolean> {
    logMsOad('Sending OAD_REQ_INIT_MS_OAD (0x15)');
    const InitializeCmd = new Uint8Array([MsOadSpecificCommands.OAD_REQ_INIT_MS_OAD]);

    try {
      await BleManager.writeWithoutResponse(
        peripheralId,
        UUID.OadServiceUuid,
        UUID.ImageControlPointUuid,
        Array.from(InitializeCmd),
        1
      );
      logMsOad('MS-OAD initialization command sent successfully - device will reset');
      setStatus('OAD initialization sent. Device will reset...');
      return true;
    } catch (error) {
      logMsOad(`ERROR: Failed to send MS-OAD init command - ${error}`);
      setStatus('Failed to send MS-OAD init command');
      return false;
    }
  }

  function getMsOadStateDescription(state: MsOadStateType): string {
    switch (state) {
      case MsOadState.MS_OAD_IDLE:
        return 'IDLE - Running most recent image';
      case MsOadState.MS_OAD_WAIT_FIRST_HALF:
        return 'Waiting for new image (first half)';
      case MsOadState.MS_OAD_WAIT_SECOND_HALF:
        return 'Waiting for new image (second half)';
      case MsOadState.MS_OAD_WAIT_FIRST_HALF_REVERT:
        return 'REVERT - Waiting for original image (first half)';
      case MsOadState.MS_OAD_WAIT_SECOND_HALF_REVERT:
        return 'REVERT - Waiting for original image (second half)';
      case MsOadState.MS_OAD_NEW_IMAGE_READY:
        return 'NEW IMAGE READY - Waiting for acknowledgment';
      case MsOadState.MS_OAD_IMAGE_READY_REVERT:
        return 'IMAGE READY REVERT - Waiting for acknowledgment';
      default:
        return 'Unknown state';
    }
  }

  async function isMultistepOadMode(): Promise<boolean> {
    const ImgControlPointCmd = new Uint8Array([MsOadSpecificCommands.OAD_REQ_IS_MS_SUPPORTED]);
    let rsp = await writeWaitNotify(
      peripheralId,
      UUID.OadServiceUuid,
      UUID.ImageControlPointUuid,
      true,
      ImgControlPointCmd,
      1
    );

    if (rsp[0] == MsOadSpecificCommands.OAD_REQ_IS_MS_SUPPORTED) {
      const supported = rsp[1];
      console.log('MS-OAD supported: ', supported == 0);
      setMsOadEnabled(supported == 0);
      return supported === 0;
    }

    return false;
  }

  // ============================================================================
  // Image Transfer Functions
  // ============================================================================
  function updateImgSizeInImgHeader(payload: Uint8Array, imgSize: number) {
    // console.log('payload before updating', buf2hex(payload))

    payload[12] = imgSize & 0xFF;
    payload[13] = (imgSize >> 8) & 0xFF;
    payload[14] = (imgSize >> 16) & 0xFF;
    payload[15] = (imgSize >> 24) & 0xFF;

    // console.log('payload after updating', buf2hex(payload))
    return payload;
  }

  async function sendImagUpdateReqMsOad(
    peripheralId: string,
    fwImageByteArray: Uint8Array,
  ): Promise<{ success: boolean; blockSize?: number; numBlocks?: number; imageBytes?: Uint8Array }> {

    await getSwVersion();

    if (Platform.OS === 'android') {
      await BleManager.requestConnectionPriority(peripheralId, 1);
      let mtu = await BleManager.requestMTU(peripheralId, 255);
      logMsOad(`MTU set to: ${mtu}`);
    }

    const buffer = new ArrayBuffer(32);
    let imgIdentifyPayload = new Uint8Array(buffer);

    /* Update image size to be real size instead of the size written in the input img */
    let imgLength = fwImageByteArray.length;
    imgIdentifyPayload = updateImgSizeInImgHeader(imgIdentifyPayload, imgLength)
    imgIdentifyPayload.set(fwImageByteArray.slice(0, 32));

    // Check MCUBoot header magic
    if (
      fwImageByteArray[0] != 0x3d ||
      fwImageByteArray[1] != 0xb8 ||
      fwImageByteArray[2] != 0xf3 ||
      (fwImageByteArray[3] != 0x96 && fwImageByteArray[3] != 0x97)
    ) {
      logMsOad('ERROR: Invalid MCUboot header magic');
      alert('Invalid MCUboot image header. Please select a valid MCUboot firmware image.');
      return { success: false };
    }

    logMsOad(`Image identify payload (32 bytes): ${buf2hex(imgIdentifyPayload)}`);

    // Find img version
    const versionString = getImgVersionFromImg(fwImageByteArray);
    logMsOad(`MCUboot image version: ${versionString}`);

    // Check MCUBoot swap magic (last 16 bytes)
    let mcuBootMapgicSwap =
      fwImageByteArray[fwImageByteArray.length - 16].toString(16) +
      fwImageByteArray[fwImageByteArray.length - 15].toString(16) +
      fwImageByteArray[fwImageByteArray.length - 14].toString(16) +
      fwImageByteArray[fwImageByteArray.length - 13].toString(16) +
      fwImageByteArray[fwImageByteArray.length - 12].toString(16) +
      fwImageByteArray[fwImageByteArray.length - 11].toString(16) +
      fwImageByteArray[fwImageByteArray.length - 10].toString(16) +
      fwImageByteArray[fwImageByteArray.length - 9].toString(16) +
      fwImageByteArray[fwImageByteArray.length - 8].toString(16) +
      fwImageByteArray[fwImageByteArray.length - 7].toString(16) +
      fwImageByteArray[fwImageByteArray.length - 6].toString(16) +
      fwImageByteArray[fwImageByteArray.length - 5].toString(16) +
      fwImageByteArray[fwImageByteArray.length - 4].toString(16) +
      fwImageByteArray[fwImageByteArray.length - 3].toString(16) +
      fwImageByteArray[fwImageByteArray.length - 2].toString(16) +
      fwImageByteArray[fwImageByteArray.length - 1].toString(16);

    if (mcuBootMapgicSwap != MS_OAD_CONSTANTS.MCUBOOT_SWAP_MAGIC) {
      logMsOad('Not a swap image - reading length from header');

      /* Length is read from header and must include header */
      imgLength =
        fwImageByteArray[12] +
        (fwImageByteArray[13] << 8) +
        (fwImageByteArray[14] << 16) +
        (fwImageByteArray[15] << 24);

      logMsOad(`MCUBoot image length from header: ${imgLength} bytes`);

      let headerLen =
        (fwImageByteArray[8] + (fwImageByteArray[9] << 8)) +
        (fwImageByteArray[10] + (fwImageByteArray[11] << 8));

      logMsOad(`TLV magic check - byte[0]: 0x${fwImageByteArray[imgLength + headerLen].toString(16)}, byte[1]: 0x${fwImageByteArray[imgLength + headerLen + 1].toString(16)}`);

      /* check TLV header Magic */
      if (
        fwImageByteArray[imgLength + headerLen + 1] != 0x69 ||
        (fwImageByteArray[imgLength + headerLen] != 0x07 &&
          fwImageByteArray[imgLength + headerLen] != 0x08)
      ) {
        logMsOad('ERROR: Invalid TLV magic');
        alert('Bad TLV Magic');
        return { success: false };
      }

      let tlvLength =
        fwImageByteArray[imgLength + headerLen + 2] +
        (fwImageByteArray[imgLength + headerLen + 3] << 8);

      logMsOad(`Header length: ${headerLen} bytes, TLV length: ${tlvLength} bytes`);

      /* add MCU Boot header and trailer size */
      imgLength += headerLen + tlvLength;
      logMsOad(`Total image length (with header & TLV): ${imgLength} bytes`);

      // Update imgIdentifyPayload with corrected length
      imgIdentifyPayload[12] = imgLength & 0x000000ff;
      imgIdentifyPayload[13] = (imgLength & 0x0000ff00) >> 8;
      imgIdentifyPayload[14] = (imgLength & 0x00ff0000) >> 16;
      imgIdentifyPayload[15] = (imgLength & 0xff000000) >> 24;

      // CRITICAL: Truncate image to actual length
      fwImageByteArray = fwImageByteArray.slice(0, imgLength);
      logMsOad(`Image truncated to actual length: ${fwImageByteArray.length} bytes`);
    }

    // Read the Block Size from device
    let currentBlockSize = 20;

    logMsOad('Requesting block size from device...');
    let ImgControlPointCmd = new Uint8Array([OadProtocolOpCode.OAD_REQ_GET_BLK_SZ]);
    const blkSizeRsp = await writeWaitNotify(
      peripheralId,
      UUID.OadServiceUuid,
      UUID.ImageControlPointUuid,
      true,
      ImgControlPointCmd,
      1
    );

    if (blkSizeRsp[0] == OadProtocolOpCode.OAD_REQ_GET_BLK_SZ) {
      currentBlockSize = blkSizeRsp[1] + (blkSizeRsp[2] << 8) - 4;
      const currentNumBlocks = Math.floor(imgLength / currentBlockSize);
      logMsOad(`Block size: ${currentBlockSize} bytes, Number of blocks: ${currentNumBlocks}`);

      // Store in state for UI display
      setBlockSize(currentBlockSize);
      setNumBlocks(currentNumBlocks);
      currentImageRef.current = fwImageByteArray;

      // Send image identify request
      const identifySuccess = await sendMsOadImageIdentifyRequest(
        peripheralId,
        fwImageByteArray,
        writeWaitNotify
      );

      if (identifySuccess) {
        // Start block notifications
        await BleManager.startNotification(
          peripheralId,
          UUID.OadServiceUuid,
          UUID.ImageControlPointUuid
        );

        // Return the queried values so they can be used immediately (state updates are async)
        return {
          success: true,
          blockSize: currentBlockSize,
          numBlocks: currentNumBlocks,
          imageBytes: fwImageByteArray
        };
      } else {
        return { success: false };
      }
    } else {
      logMsOad('ERROR: Block size response opcode mismatch');
      return { success: false };
    }
  }

  async function sendMsOadImageIdentifyRequest(
    peripheralId: string,
    imageBytes: Uint8Array,
    writeWaitNotify: any
  ): Promise<boolean> {

    try {
      let imgIdentifyPayload = imageBytes.slice(0, 32);
      let imgLength = imageBytes.length;
      imgIdentifyPayload = updateImgSizeInImgHeader(imgIdentifyPayload, imgLength)

      logMsOad(`Image identify payload: ${buf2hex(imgIdentifyPayload)}`);

      const rsp = await writeWaitNotify(
        peripheralId,
        UUID.OadServiceUuid,
        UUID.ImageIdentifyWriteUuid,
        true,
        imgIdentifyPayload,
        32
      );

      logMsOad(`Image identify response: ${rsp}`);

      if (rsp[0] === OadStatus.OAD_PROFILE_SUCCESS) {
        logMsOad('Image header accepted');
        return true;
      } else {
        logMsOad(`ERROR: Image header rejected, response: ${rsp}`);
        alert('Image header rejected by device. Please check the image file.');
        return false;
      }
    } catch (error) {
      logMsOad(`ERROR: Failed to send image identify request - ${error}`);
      return false;
    }
  }

  function sendImageBlocksMsOad(
    peripheralId: string,
    fwImageByteArray: Uint8Array,
    blockSize: number,
    numBlocks: number,
    charValueSubscription: React.MutableRefObject<EventSubscription | null>,
    currentStage: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      charValueSubscription.current?.remove();
      let prevProgress = 0;

      // Cleanup helper to ensure subscription is always removed
      const cleanup = () => {
        if (charValueSubscription.current) {
          charValueSubscription.current.remove();
          charValueSubscription.current = null;
        }
      };

      charValueSubscription.current = BleManager.onDidUpdateValueForCharacteristic(
        async ({ value, peripheral, characteristic, service }) => {
          try {
            logMsOad(`Received notification - Peripheral: ${peripheral}, Char: ${characteristic}, Value: [${value}]`);

            let blockRequested: number;
            let currentBlockSize = blockSize;

            // Block request
            if (
              characteristic.toUpperCase() === UUID.ImageControlPointUuid &&
              value[0] === OadProtocolOpCode.OAD_RSP_BLK_RSP_NOTIF
            ) {
              console.log('Previous Block Status: ', value[1].toString(16))
              console.log('Requested Block: ', value[2] + (value[3] << 8) + (value[4] << 16) + (value[5] << 24))

              // Download complete
              if (value[1] === OadStatus.OAD_PROFILE_DL_COMPLETE) {
                //  Send OAD_EVT_ENABLE_IMG
                logMsOad(`Stage ${currentStage} complete (got OAD_PROFILE_DL_COMPLETE) sending OAD_EVT_ENABLE_IMG to enable image`);
                let ImgControlPointCmd = new Uint8Array([OadEvent.OAD_EVT_ENABLE_IMG]);
                var ImgControlPointCmdArray = Array.from(ImgControlPointCmd);
                BleManager.writeWithoutResponse(
                  peripheralId,
                  UUID.OadServiceUuid,
                  UUID.ImageControlPointUuid,
                  ImgControlPointCmdArray,
                  1
                )
                  .then(() => {
                    logMsOad('OAD_EVT_ENABLE_IMG sent successfully - device will reset');
                    cleanup();
                    resolve();
                  })
                  .catch((error: string) => {
                    logMsOad(`ERROR: Failed to send OAD_EVT_ENABLE_IMG - ${error}`);
                    cleanup();
                    reject(error);
                  });

              }
              // Success - send next block
              else if (value[1] === OadStatus.OAD_PROFILE_SUCCESS) {
                blockRequested = value[2] + (value[3] << 8) + (value[4] << 16) + (value[5] << 24);

                // Calculate progress: first half 0-50%, second half 50-100%
                const currentStageProgress = blockRequested / numBlocks;
                let overallProgress = 0;

                if (currentStage === 1 || currentStage === 3) {
                  // First half (stage 1) or revert first half (stage 3): 0-50%
                  overallProgress = 0.5 * currentStageProgress;
                } else if (currentStage === 2 || currentStage === 4) {
                  // Second half (stage 2) or revert second half (stage 4): 50-100%
                  overallProgress = 0.5 + 0.5 * currentStageProgress;
                }

                // Update both progress and MS-OAD overall progress
                const progressUpdate = 0.98 * overallProgress;
                if (Math.floor(progressUpdate * 100) > prevProgress) {
                  setProgress(progressUpdate);
                  setMsOadOverallProgress(overallProgress);
                  logMsOad(
                    `Progress: ${(overallProgress * 100).toFixed(1)}% (Block ${blockRequested}/${numBlocks})`
                  );
                }
                prevProgress = Math.floor(progressUpdate * 100);

                const fwImageByteOffset = blockRequested * blockSize;

                // Last block - adjust size
                if (blockRequested === numBlocks) {
                  currentBlockSize = fwImageByteArray.length - blockSize * numBlocks;
                }

                console.log('Block Request[' + currentBlockSize + ']: ' + blockRequested + ' of ' + numBlocks);

                const blockData = fwImageByteArray.slice(
                  fwImageByteOffset,
                  fwImageByteOffset + currentBlockSize
                );

                // Send block data
                try {
                  await writeBlockMsOad(peripheralId, blockRequested, blockData, currentBlockSize, numBlocks);
                } catch (error) {
                  alert(error);
                }
              }
              // Error
              else {
                const statusHex = '0x' + value[1].toString(16).padStart(2, '0');
                logMsOad(`ERROR: Block transfer failed with status ${statusHex}`);
                setUpdating(false);
                cleanup();
                reject(`Block transfer failed with status ${statusHex}`);
              }
            }
          } catch (error) {
            // Catch any unhandled errors in the notification handler
            logMsOad(`ERROR: Unhandled error in block transfer notification handler - ${error}`);
            cleanup();
            reject(error);
          }
        }
      );

      let ImgControlPointCmd = new Uint8Array([OadEvent.OAD_EVT_START_OAD]);
      var ImgControlPointCmdArray = Array.from(ImgControlPointCmd);
      BleManager.writeWithoutResponse(
        peripheralId,
        UUID.OadServiceUuid,
        UUID.ImageControlPointUuid,
        ImgControlPointCmdArray,
        1
      );
    });
  }

  async function writeBlockMsOad(
    peripheralId: string,
    blockRequested: number,
    blockData: Uint8Array,
    blockSize: number,
    numBlocks: number
  ): Promise<void> {
    let BlockRspCmd = new Uint8Array(blockSize + 4);

    BlockRspCmd[3] = (blockRequested >> 24) & 0xff;
    BlockRspCmd[2] = (blockRequested >> 16) & 0xff;
    BlockRspCmd[1] = (blockRequested >> 8) & 0xff;
    BlockRspCmd[0] = blockRequested & 0xff;

    BlockRspCmd.set(blockData, 4);
    var BlockRspCmdArray = Array.from(BlockRspCmd);

    // For MS-OAD, log ALL blocks with complete data in hex format
    let hexLines: string[] = [];
    for (let i = 4; i < BlockRspCmd.length; i += 16) {
      const lineBytes = BlockRspCmd.slice(i, Math.min(i + 16, BlockRspCmd.length));
      const hexStr = Array.from(lineBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      hexLines.push(`  ${hexStr}`);
    }

    logMsOad(
      `Block ${blockRequested}/${numBlocks} (${blockData.length} bytes)`
    );

    return BleManager.write(
      peripheralId,
      UUID.OadServiceUuid,
      UUID.ImageBlockRequestUuid,
      BlockRspCmdArray,
      BlockRspCmd.length
    ).catch((error: any) => {
      logMsOad(`ERROR: Block write failed for block ${blockRequested} - ${error}`);
      throw error;
    });
  }

  // ============================================================================
  // File Management
  // ============================================================================

  const addMsOadFile = async (imageType: MsOadFileTypeValue) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      const fileName = file.name;
      const fileUri = file.uri;

      if (!fileUri) {
        throw new Error('File URI is undefined');
      }

      // Fetch the file as blob
      const response = await fetch(fileUri);
      const blob = await response.blob();

      // Convert blob to Uint8Array using FileReader
      const bytes = await new Promise<Uint8Array>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            resolve(new Uint8Array(reader.result as ArrayBuffer));
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      // Validate file size - expecting complete firmware image
      if (bytes.length !== MS_OAD_CONSTANTS.COMPLETE_IMAGE_SIZE) {
        alert(
          `Invalid firmware image size!\n\n` +
          `Expected: ${MS_OAD_CONSTANTS.COMPLETE_IMAGE_SIZE} bytes (0x${MS_OAD_CONSTANTS.COMPLETE_IMAGE_SIZE.toString(16).toUpperCase()})\n` +
          `Actual: ${bytes.length} bytes\n\n` +
          `Please upload a complete MS-OAD firmware image.\n\n` +
          `The app will automatically split it into:\n` +
          `  - First half (bootable): 0x0000-0x3B000 (241,664 bytes)\n` +
          `  - Second half (non-bootable): 0x3B800-0x76800 (241,664 bytes)`
        );
        return;
      }

      // Validate the image can be split correctly
      try {
        const { firstHalf, secondHalf } = splitFirmwareImage(bytes);
        logMsOad(`Image validation successful: ${firstHalf.length + secondHalf.length} bytes total (2 halves)`);
      } catch (error) {
        alert(`${error}`);
        return;
      }

      // Parse firmware version from image header
      const version = getImgVersionFromImg(bytes);
      if (version) {
        setMsOadVersions(prev => ({
          ...prev,
          [imageType]: version
        }));
        logMsOad(`Firmware version detected: ${version}`);
      } else {
        logMsOad(`WARNING: Could not parse firmware version from ${imageType}`);
      }

      // MEMORY OPTIMIZATION: Store complete image in ref (not state) to avoid re-renders with large arrays
      msOadImagesRef.current[imageType] = bytes;

      // Update lightweight loaded state (triggers re-render for UI)
      setMsOadImagesLoaded(prev => ({
        ...prev,
        [imageType]: true
      }));

      setMsOadFileNames(prev => ({
        ...prev,
        [imageType]: fileName
      }));

      logMsOad(`Loaded complete firmware image ${imageType}: ${bytes.length} bytes (${fileName})`);
      console.log(`Updated msOadImages ref:`, {
        ORIGINAL_V1: msOadImagesRef.current[MsOadFileType.ORIGINAL_V1] ? `${msOadImagesRef.current[MsOadFileType.ORIGINAL_V1]?.length} bytes` : 'NOT LOADED',
        NEW_V2: msOadImagesRef.current[MsOadFileType.NEW_V2] ? `${msOadImagesRef.current[MsOadFileType.NEW_V2]?.length} bytes` : 'NOT LOADED',
      });
    } catch (error) {
      console.error('Error loading MS-OAD file:', error);
      alert('Failed to load file: ' + error);
    }
  };

  const removeMsOadFile = (imageType: MsOadFileTypeValue) => {
    console.log(`Removing MS-OAD file: ${imageType}`);

    // MEMORY OPTIMIZATION: Clear from ref (not state)
    msOadImagesRef.current[imageType] = undefined;

    // Update lightweight loaded state (triggers re-render for UI)
    setMsOadImagesLoaded(prev => ({
      ...prev,
      [imageType]: false
    }));

    setMsOadFileNames(prev => ({
      ...prev,
      [imageType]: undefined
    }));

    logMsOad(`Removed ${imageType}`);
  };

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  // Helper function to access images from ref (memory-optimized)
  const getMsOadImage = useCallback((halfType: MsOadFileTypeValue): Uint8Array | undefined => {
    return msOadImagesRef.current[halfType];
  }, []);

  return {
    // State
    msOadEnabled,
    msOadState,
    msOadCurrentStage,
    msOadOverallProgress,
    msOadImagesLoaded,  // Memory optimization: Export lightweight boolean state instead of full images
    msOadFileNames,
    msOadVersions,      // Firmware versions from uploaded images
    setMsOadEnabled,
    setMsOadCurrentStage,
    setMsOadOverallProgress,

    // Functions
    logMsOad,
    exportMsOadLogs,
    clearMsOadLogs,
    handleMsOadDeviceReset,
    handleMsOadStateTransfer,
    sendMsOadAck,
    getMsOadState,
    initMsOad,
    getMsOadStateDescription,
    isMultistepOadMode,
    sendImagUpdateReqMsOad,
    sendImageBlocksMsOad,
    addMsOadFile,
    removeMsOadFile,
    writeBlockMsOad,
    sendMsOadImageIdentifyRequest,
    getMsOadImage,  // Helper to access complete image bytes from ref
    getImageHalf,   // Helper to get split image half (first or second)
    getDeviceSwVersion,     // Query device for current software version
  };
}
