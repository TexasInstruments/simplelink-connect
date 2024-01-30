/*
 * Copyright (c) 2023, Texas Instruments Incorporated
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * *  Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * *  Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * *  Neither the name of Texas Instruments Incorporated nor the names of
 *    its contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

//IR Temperature Sensor
export const IR_TEMPERATURE_SENSOR = {
  service: 'f000aa00-0451-4000-b000-000000000000',
  data: 'f000aa01-0451-4000-b000-000000000000',
  notification: 'f000aa01-0451-4000-b000-000000000000',
  configuration: 'f000aa02-0451-4000-b000-000000000000',
  period: 'f000aa03-0451-4000-b000-000000000000',
} as const;

//Movement Sensor
export const MOVEMENT_SENSOR = {
  service: 'f000aa80-0451-4000-b000-000000000000',
  data: 'f000aa81-0451-4000-b000-000000000000',
  notification: 'f000aa81-0451-4000-b000-000000000000',
  configuration: 'f000aa82-0451-4000-b000-000000000000',
  period: 'f000aa83-0451-4000-b000-000000000000',
} as const;

//Movement Sensor
export const HUMIDITY_SENSOR = {
  service: 'f000aa20-0451-4000-b000-000000000000',
  data: 'f000aa21-0451-4000-b000-000000000000',
  notification: 'f000aa21-0451-4000-b000-000000000000',
  configuration: 'f000aa22-0451-4000-b000-000000000000',
  period: 'f000aa23-0451-4000-b000-000000000000',
} as const;

//Barometric Pressure Sensor
export const BAROMETRIC_SENSOR = {
  service: 'f000aa40-0451-4000-b000-000000000000',
  data: 'f000aa41-0451-4000-b000-000000000000',
  notification: 'f000aa41-0451-4000-b000-000000000000',
  configuration: 'f000aa42-0451-4000-b000-000000000000',
  period: 'f000aa44-0451-4000-b000-000000000000',
} as const;

//Optical Sensor
export const OPTICAL_SENSOR = {
  service: 'f000aa70-0451-4000-b000-000000000000',
  data: 'f000aa71-0451-4000-b000-000000000000',
  notification: 'f000aa71-0451-4000-b000-000000000000',
  configuration: 'f000aa72-0451-4000-b000-000000000000',
  period: 'f000aa73-0451-4000-b000-000000000000',
} as const;

//IO Service
export const IO_SERVICE = {
  service: 'f000aa64-0451-4000-b000-000000000000',
  data: 'f000aa65-0451-4000-b000-000000000000',
  configuration: 'f000aa66-0451-4000-b000-000000000000',
} as const;

//Battery Service
export const BATTERY_LEVEL = {
  service: '180f',
  data: '2a19',
} as const;

//Simple Keys Service
export const SIMPLE_KEYS_SERVICE = {
  service: 'ffe0',
  data: 'ffe1',
} as const;

export const CONNECTION_CONTROL_SERVICE = {
  service: 'f000ccc0-0451-4000-b000-000000000000',
  connection_params: 'f000ccc1-0451-4000-b000-000000000000',
  notification: 'f000ccc1-0451-4000-b000-000000000000',
  request_conn_params: 'f000ccc2-0451-4000-b000-000000000000',
  request_disconnect: 'f000ccc3-0451-4000-b000-000000000000',
} as const;

export const SUPPORTED_SPAECIFIC_SCREEN = ["ti terminal", "ti oad", "temp", "humidity", "barometer", "optical", "movement", "simple keys", "battery", "i/o", "control"] as const;
