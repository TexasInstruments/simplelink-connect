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

export type MappedService = {
  serviceName: string;
  serviceUuid: string;
  icon?: {
    type: 'font-awesome' | 'svg' | 'font-awesome-5';
    iconName: string;
  };
  serviceSpecificScreen?: string;
};

export default [
  /* Known TI Services */
  {
    serviceName: 'TI Simple Peripheral Service',
    serviceUuid: 'FFF0',
    icon: {
      type: 'font-awesome-5',
      iconName: 'tablet',
    },
  },
  {
    serviceName: 'TI OAD',
    serviceUuid: 'f000ffc0-0451-4000-b000-000000000000',
    icon: {
      type: 'font-awesome-5',
      iconName: 'download',
    },
    serviceSpecificScreen: 'FwUpdateServiceModel',
  },
  {
    serviceName: 'TI OAD Reset',
    serviceUuid: 'f000ffd0-0451-4000-b000-000000000000',
    icon: {
      type: 'font-awesome-5',
      iconName: 'sync-alt',
    },
    serviceSpecificScreen: 'FwUpdateServiceModel',
  },
  {
    serviceName: 'TI Terminal',
    serviceUuid: 'f000c0c0-0451-4000-b000-000000000000',
    icon: {
      type: 'font-awesome-5',
      iconName: 'tv',
    },
    serviceSpecificScreen: 'TerminalServiceModel',
  },
  /* Known Standard Services */
  {
    serviceName: 'Alert Notification Service',
    serviceUuid: '1811',
    icon: {
      type: 'font-awesome-5',
      iconName: 'exclamation-triangle',
    },
  },
  {
    serviceName: 'Automation IO',
    serviceUuid: '1815',
    icon: {
      type: 'font-awesome-5',
      iconName: 'robot',
    },
  },
  {
    serviceName: 'Battery Service',
    serviceUuid: '180F',
    icon: {
      type: 'font-awesome-5',
      iconName: 'battery-three-quarters',
    },
  },
  {
    serviceName: 'Blood Pressure',
    serviceUuid: '1810',
    icon: {
      type: 'font-awesome-5',
      iconName: 'heartbeat',
    },
  },
  {
    serviceName: 'Body Composition',
    serviceUuid: '181B',
    icon: {
      type: 'font-awesome-5',
      iconName: 'th',
    },
  },
  {
    serviceName: 'Bond Management Service',
    serviceUuid: '181E',
    icon: {
      type: 'font-awesome-5',
      iconName: 'handshake',
    },
  },
  {
    serviceName: 'Continuous Glucose Monitoring',
    serviceUuid: '181F',
    icon: {
      type: 'font-awesome-5',
      iconName: 'wave-square',
    },
  },
  {
    serviceName: 'Current Time Service',
    serviceUuid: '1805',
    icon: {
      type: 'font-awesome-5',
      iconName: 'plug',
    },
  },
  {
    serviceName: 'Cycling Power',
    serviceUuid: '1818',
    icon: {
      type: 'font-awesome-5',
      iconName: 'biking',
    },
  },
  {
    serviceName: 'Cycling Speed and Cadence',
    serviceUuid: '1816',
    icon: {
      type: 'font-awesome-5',
      iconName: 'biking',
    },
  },
  {
    serviceName: 'Device Information',
    serviceUuid: '180A',
    icon: {
      type: 'font-awesome-5',
      iconName: 'info-circle',
    },
  },
  {
    serviceName: 'Environmental Sensing',
    serviceUuid: '181A',
    icon: {
      type: 'font-awesome-5',
      iconName: 'wind',
    },
  },
  {
    serviceName: 'Fitness Machine',
    serviceUuid: '1826',
    icon: {
      type: 'font-awesome-5',
      iconName: 'running',
    },
  },
  {
    serviceName: 'Generic Access',
    serviceUuid: '1800',
    icon: {
      type: 'font-awesome-5',
      iconName: 'lock-open',
    },
  },
  {
    serviceName: 'Generic Attribute',
    serviceUuid: '1801',
    icon: {
      type: 'font-awesome-5',
      iconName: 'th',
    },
  },
  {
    serviceName: 'Glucose',
    serviceUuid: '1808',
    icon: {
      type: 'font-awesome-5',
      iconName: 'syringe',
    },
  },
  {
    serviceName: 'Health Thermometer',
    serviceUuid: '1809',
    icon: {
      type: 'font-awesome-5',
      iconName: 'thermometer-half',
    },
  },
  {
    serviceName: 'Heart Rate',
    serviceUuid: '180D',
    icon: {
      type: 'font-awesome-5',
      iconName: 'heartbeat',
    },
  },
  {
    serviceName: 'HTTP Proxy',
    serviceUuid: '1823',
    icon: {
      type: 'font-awesome-5',
      iconName: 'network-wired',
    },
  },
  {
    serviceName: 'Human Interface Device',
    serviceUuid: '1812',
    icon: {
      type: 'font-awesome-5',
      iconName: 'male',
    },
  },
  {
    serviceName: 'Immediate Alert',
    serviceUuid: '1802',
    icon: {
      type: 'font-awesome-5',
      iconName: 'bell',
    },
  },
  {
    serviceName: 'Indoor Positioning',
    serviceUuid: '1821',
    icon: {
      type: 'font-awesome-5',
      iconName: 'map-pin',
    },
  },
  {
    serviceName: 'Internet Protocol Support Service',
    serviceUuid: '1820',
    icon: {
      type: 'font-awesome-5',
      iconName: 'network-wired',
    },
  },
  {
    serviceName: 'Link Loss',
    serviceUuid: '1803',
    icon: {
      type: 'font-awesome-5',
      iconName: 'wifi',
    },
  },
  {
    serviceName: 'Location and Navigation',
    serviceUuid: '1819',
    icon: {
      type: 'font-awesome-5',
      iconName: 'location-arrow',
    },
  },
  {
    serviceName: 'Next DST Change Service',
    serviceUuid: '1807',
    icon: {
      type: 'font-awesome-5',
      iconName: 'cloud-sun',
    },
  },
  {
    serviceName: 'Object Transfer Service',
    serviceUuid: '1825',
    icon: {
      type: 'font-awesome-5',
      iconName: 'exchange-alt',
    },
  },
  {
    serviceName: 'Phone Alert Status Service',
    serviceUuid: '180E',
    icon: {
      type: 'font-awesome-5',
      iconName: 'signal',
    },
  },
  {
    serviceName: 'Pulse Oximeter Service',
    serviceUuid: '1822',
    icon: {
      type: 'font-awesome-5',
      iconName: 'wave-square',
    },
  },
  {
    serviceName: 'Reference Time Update Service',
    serviceUuid: '1806',
    icon: {
      type: 'font-awesome-5',
      iconName: 'hourglass-half',
    },
  },
  {
    serviceName: 'Running Speed and Cadence',
    serviceUuid: '1814',
    icon: {
      type: 'font-awesome-5',
      iconName: 'running',
    },
  },
  {
    serviceName: 'Scan Parameters',
    serviceUuid: '1813',
    icon: {
      type: 'font-awesome-5',
      iconName: 'search',
    },
  },
  {
    serviceName: 'Transport Discovery',
    serviceUuid: '1824',
    icon: {
      type: 'font-awesome-5',
      iconName: 'greater-than',
    },
  },
  {
    serviceName: 'Tx Power',
    serviceUuid: '1804',
    icon: {
      type: 'font-awesome-5',
      iconName: 'battery-empty',
    },
  },
  {
    serviceName: 'User Data',
    serviceUuid: '181C',
    icon: {
      type: 'font-awesome-5',
      iconName: 'user',
    },
  },
  {
    serviceName: 'Weight Scale',
    serviceUuid: '181D',
    icon: {
      type: 'font-awesome-5',
      iconName: 'weight',
    },
  },
  {
    serviceName: 'IEEE 11073-20601 Regulatory Certification Data List',
    serviceUuid: '2A2A',
    icon: {
      type: 'font-awesome-5',
      iconName: 'file-alt',
    },
  },
  {
    serviceName: 'Temperature Service',
    serviceUuid: 'f000aa00-0451-4000-b000-000000000000',
    icon: {
      type: 'font-awesome-5',
      iconName: 'thermometer-empty',
    },
    serviceSpecificScreen: 'SensorTagModel',
  },
  {
    serviceName: 'Humidity Service',
    serviceUuid: 'f000aa20-0451-4000-b000-000000000000',
    icon: {
      type: 'font-awesome-5',
      iconName: 'tint',
    },
    serviceSpecificScreen: 'SensorTagModel',
  },
  {
    serviceName: 'Barometer Service',
    serviceUuid: 'f000aa40-0451-4000-b000-000000000000',
    icon: {
      type: 'font-awesome-5',
      iconName: 'tachometer-alt',
    },
    serviceSpecificScreen: 'SensorTagModel',
  },
  {
    serviceName: 'Movement Service',
    serviceUuid: 'f000aa80-0451-4000-b000-000000000000',
    icon: {
      type: 'font-awesome-5',
      iconName: 'street-view',
    },
    serviceSpecificScreen: 'SensorTagModel',
  },
  {
    serviceName: 'Light Sensor Service',
    serviceUuid: 'f000aa70-0451-4000-b000-000000000000',
    icon: {
      type: 'font-awesome-5',
      iconName: 'adjust',
    },
    serviceSpecificScreen: 'SensorTagModel',
  },
  {
    serviceName: 'Simple Keys Service',
    serviceUuid: 'ffe0',
    icon: {
      type: 'font-awesome-5',
      iconName: 'key',
    },
    serviceSpecificScreen: 'SensorTagModel',
  },
  {
    serviceName: 'I/O Service',
    serviceUuid: 'f000aa64-0451-4000-b000-000000000000',
    icon: {
      type: 'font-awesome-5',
      iconName: 'keyboard',
    },
    serviceSpecificScreen: 'SensorTagModel',
  },
  {
    serviceName: 'Register Service',
    serviceUuid: 'f000ac00-0451-4000-b000-000000000000',
    icon: {
      type: 'font-awesome-5',
      iconName: 'list-alt',
    },
  },
  {
    serviceName: 'Control Service',
    serviceUuid: 'f000ccc0-0451-4000-b000-000000000000',
    icon: {
      type: 'font-awesome-5',
      iconName: 'tools',
    },
    serviceSpecificScreen: 'SensorTagModel',
  },
  {
    serviceName: 'Battery Service',
    serviceUuid: 'f000180f-0451-4000-b000-000000000000',
    icon: {
      type: 'font-awesome-5',
      iconName: 'battery-three-quarters',
    },
  },
  {
    serviceName: 'TI Accelerometer Service',
    serviceUuid: 'f000ffa0-0451-4000-b000-000000000000',
    icon: {
      type: 'font-awesome',
      iconName: 'tachometer',
    },
  },
  {
    serviceName: 'TI Profile - Project Zero Button Service',
    serviceUuid: 'f0001120-0451-4000-b000-000000000000',
    icon: {
      type: 'font-awesome-5',
      iconName: 'tools',
    },
  },
  {
    serviceName: 'Project Zero LED Service',
    serviceUuid: 'f0001110-0451-4000-b000-000000000000',
    icon: {
      type: 'font-awesome-5',
      iconName: 'lightbulb',
    },
  },
] as MappedService[];
