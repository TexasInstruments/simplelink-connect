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

export type MappedCharacteristic = {
  characteristicName: string;
  characteristicUuid: string;
};

export default [
  { /* TI SImple Peripheral CHAR1 */
    characteristicName: 'Characteristic 1',
    characteristicUuid: 'FFF1',
  },
  { /* TI SImple Peripheral CHAR2 */
    characteristicName: 'Characteristic 2',
    characteristicUuid: 'FFF2',
  },
  { /* TI SImple Peripheral CHAR3 */
    characteristicName: 'Characteristic 3',
    characteristicUuid: 'FFF3',
  },
  { /* TI SImple Peripheral CHAR4 */
    characteristicName: 'Characteristic 4',
    characteristicUuid: 'FFF4',
  },
  { /* TI SImple Peripheral CHAR5 */
    characteristicName: 'Characteristic 5',
    characteristicUuid: 'FFF5',
  },
  {
    characteristicName: 'Magnetic Flux Density - 2D',
    characteristicUuid: '2AA0',
  },
  {
    characteristicName: 'Magnetic Flux Density - 3D',
    characteristicUuid: '2AA1',
  },
  {
    characteristicName: 'Aerobic Heart Rate Lower Limit',
    characteristicUuid: '2A7E',
  },
  {
    characteristicName: 'Aerobic Heart Rate Upper Limit',
    characteristicUuid: '2A84',
  },
  {
    characteristicName: 'Aerobic Threshold',
    characteristicUuid: '2A7F',
  },
  {
    characteristicName: 'Age',
    characteristicUuid: '2A80',
  },
  {
    characteristicName: 'Aggregate',
    characteristicUuid: '2A5A',
  },
  {
    characteristicName: 'Alert Category ID',
    characteristicUuid: '2A43',
  },
  {
    characteristicName: 'Alert Category ID Bit Mask',
    characteristicUuid: '2A42',
  },
  {
    characteristicName: 'Alert Level',
    characteristicUuid: '2A06',
  },
  {
    characteristicName: 'Alert Notification Control Point',
    characteristicUuid: '2A44',
  },
  {
    characteristicName: 'Alert Status',
    characteristicUuid: '2A3F',
  },
  {
    characteristicName: 'Altitude',
    characteristicUuid: '2AB3',
  },
  {
    characteristicName: 'Anaerobic Heart Rate Lower Limit',
    characteristicUuid: '2A81',
  },
  {
    characteristicName: 'Anaerobic Heart Rate Upper Limit',
    characteristicUuid: '2A82',
  },
  {
    characteristicName: 'Anaerobic Threshold',
    characteristicUuid: '2A83',
  },
  {
    characteristicName: 'Analog',
    characteristicUuid: '2A58',
  },
  {
    characteristicName: 'Apparent Wind Direction',
    characteristicUuid: '2A73',
  },
  {
    characteristicName: 'Apparent Wind Speed',
    characteristicUuid: '2A72',
  },
  {
    characteristicName: 'Barometric Pressure Trend',
    characteristicUuid: '2AA3',
  },
  {
    characteristicName: 'Battery Level',
    characteristicUuid: '2A19',
  },
  {
    characteristicName: 'Blood Pressure Feature',
    characteristicUuid: '2A49',
  },
  {
    characteristicName: 'Blood Pressure Measurement',
    characteristicUuid: '2A35',
  },
  {
    characteristicName: 'Body Composition Feature',
    characteristicUuid: '2A9B',
  },
  {
    characteristicName: 'Body Composition Measurement',
    characteristicUuid: '2A9C',
  },
  {
    characteristicName: 'Body Sensor Location',
    characteristicUuid: '2A38',
  },
  {
    characteristicName: 'Bond Management Control Point',
    characteristicUuid: '2AA4',
  },
  {
    characteristicName: 'Bond Management Features',
    characteristicUuid: '2AA5',
  },
  {
    characteristicName: 'Boot Keyboard Input Report',
    characteristicUuid: '2A22',
  },
  {
    characteristicName: 'Boot Keyboard Output Report',
    characteristicUuid: '2A32',
  },
  {
    characteristicName: 'Boot Mouse Input Report',
    characteristicUuid: '2A33',
  },
  {
    characteristicName: 'CGM Feature',
    characteristicUuid: '2AA8',
  },
  {
    characteristicName: 'CGM Measurement',
    characteristicUuid: '2AA7',
  },
  {
    characteristicName: 'CGM Session Run Time',
    characteristicUuid: '2AAB',
  },
  {
    characteristicName: 'CGM Session Start Time',
    characteristicUuid: '2AAA',
  },
  {
    characteristicName: 'CGM Specific Ops Control Point',
    characteristicUuid: '2AAC',
  },
  {
    characteristicName: 'CGM Status',
    characteristicUuid: '2AA9',
  },
  {
    characteristicName: 'Cross Trainer Data',
    characteristicUuid: '2ACE',
  },
  {
    characteristicName: 'CSC Feature',
    characteristicUuid: '2A5C',
  },
  {
    characteristicName: 'CSC Measurement',
    characteristicUuid: '2A5B',
  },
  {
    characteristicName: 'Current Time',
    characteristicUuid: '2A2B',
  },
  {
    characteristicName: 'Cycling Power Control Point',
    characteristicUuid: '2A66',
  },
  {
    characteristicName: 'Cycling Power Feature',
    characteristicUuid: '2A65',
  },
  {
    characteristicName: 'Cycling Power Measurement',
    characteristicUuid: '2A63',
  },
  {
    characteristicName: 'Cycling Power Vector',
    characteristicUuid: '2A64',
  },
  {
    characteristicName: 'Database Change Increment',
    characteristicUuid: '2A99',
  },
  {
    characteristicName: 'Date of Birth',
    characteristicUuid: '2A85',
  },
  {
    characteristicName: 'Date of Threshold Assessment',
    characteristicUuid: '2A86',
  },
  {
    characteristicName: 'Date Time',
    characteristicUuid: '2A08',
  },
  {
    characteristicName: 'Day Date Time',
    characteristicUuid: '2A0A',
  },
  {
    characteristicName: 'Day of Week',
    characteristicUuid: '2A09',
  },
  {
    characteristicName: 'Descriptor Value Changed',
    characteristicUuid: '2A7D',
  },
  {
    characteristicName: 'Dew Point',
    characteristicUuid: '2A7B',
  },
  {
    characteristicName: 'Digital',
    characteristicUuid: '2A56',
  },
  {
    characteristicName: 'DST Offset',
    characteristicUuid: '2A0D',
  },
  {
    characteristicName: 'Elevation',
    characteristicUuid: '2A6C',
  },
  {
    characteristicName: 'Email Address',
    characteristicUuid: '2A87',
  },
  {
    characteristicName: 'Exact Time 256',
    characteristicUuid: '2A0C',
  },
  {
    characteristicName: 'Fat Burn Heart Rate Lower Limit',
    characteristicUuid: '2A88',
  },
  {
    characteristicName: 'Fat Burn Heart Rate Upper Limit',
    characteristicUuid: '2A89',
  },
  {
    characteristicName: 'Firmware Revision String',
    characteristicUuid: '2A26',
  },
  {
    characteristicName: 'First Name',
    characteristicUuid: '2A8A',
  },
  {
    characteristicName: 'Fitness Machine Control Point',
    characteristicUuid: '2AD9',
  },
  {
    characteristicName: 'Fitness Machine Feature',
    characteristicUuid: '2ACC',
  },
  {
    characteristicName: 'Fitness Machine Status',
    characteristicUuid: '2ADA',
  },
  {
    characteristicName: 'Five Zone Heart Rate Limits',
    characteristicUuid: '2A8B',
  },
  {
    characteristicName: 'Floor Number',
    characteristicUuid: '2AB2',
  },
  {
    characteristicName: 'Appearance',
    characteristicUuid: '2A01',
  },
  {
    characteristicName: 'Central Address Resolution',
    characteristicUuid: '2AA6',
  },
  {
    characteristicName: 'Device Name',
    characteristicUuid: '2A00',
  },
  {
    characteristicName: 'Peripheral Preferred Connection Parameters',
    characteristicUuid: '2A04',
  },
  {
    characteristicName: 'Peripheral Privacy Flag',
    characteristicUuid: '2A02',
  },
  {
    characteristicName: 'Reconnection Address',
    characteristicUuid: '2A03',
  },
  {
    characteristicName: 'Service Changed',
    characteristicUuid: '2A05',
  },
  {
    characteristicName: 'Gender',
    characteristicUuid: '2A8C',
  },
  {
    characteristicName: 'Glucose Feature',
    characteristicUuid: '2A51',
  },
  {
    characteristicName: 'Glucose Measurement',
    characteristicUuid: '2A18',
  },
  {
    characteristicName: 'Glucose Measurement Context',
    characteristicUuid: '2A34',
  },
  {
    characteristicName: 'Gust Factor',
    characteristicUuid: '2A74',
  },
  {
    characteristicName: 'Hardware Revision String',
    characteristicUuid: '2A27',
  },
  {
    characteristicName: 'Heart Rate Control Point',
    characteristicUuid: '2A39',
  },
  {
    characteristicName: 'Heart Rate Max',
    characteristicUuid: '2A8D',
  },
  {
    characteristicName: 'Heart Rate Measurement',
    characteristicUuid: '2A37',
  },
  {
    characteristicName: 'Heat Index',
    characteristicUuid: '2A7A',
  },
  {
    characteristicName: 'Height',
    characteristicUuid: '2A8E',
  },
  {
    characteristicName: 'HID Control Point',
    characteristicUuid: '2A4C',
  },
  {
    characteristicName: 'HID Information',
    characteristicUuid: '2A4A',
  },
  {
    characteristicName: 'Hip Circumference',
    characteristicUuid: '2A8F',
  },
  {
    characteristicName: 'HTTP Control Point',
    characteristicUuid: '2ABA',
  },
  {
    characteristicName: 'HTTP Entity Body',
    characteristicUuid: '2AB9',
  },
  {
    characteristicName: 'HTTP Headers',
    characteristicUuid: '2AB7',
  },
  {
    characteristicName: 'HTTP Status Code',
    characteristicUuid: '2AB8',
  },
  {
    characteristicName: 'HTTPS Security',
    characteristicUuid: '2ABB',
  },
  {
    characteristicName: 'Humidity',
    characteristicUuid: '2A6F',
  },
  {
    characteristicName: 'Indoor Bike Data',
    characteristicUuid: '2AD2',
  },
  {
    characteristicName: 'Indoor Positioning Configuration',
    characteristicUuid: '2AAD',
  },
  {
    characteristicName: 'Intermediate Cuff Pressure',
    characteristicUuid: '2A36',
  },
  {
    characteristicName: 'Intermediate Temperature',
    characteristicUuid: '2A1E',
  },
  {
    characteristicName: 'Irradiance',
    characteristicUuid: '2A77',
  },
  {
    characteristicName: 'Language',
    characteristicUuid: '2AA2',
  },
  {
    characteristicName: 'Last Name',
    characteristicUuid: '2A90',
  },
  {
    characteristicName: 'Latitude',
    characteristicUuid: '2AAE',
  },
  {
    characteristicName: 'LN Control Point',
    characteristicUuid: '2A6B',
  },
  {
    characteristicName: 'LN Feature',
    characteristicUuid: '2A6A',
  },
  {
    characteristicName: 'Local East Coordinate',
    characteristicUuid: '2AB1',
  },
  {
    characteristicName: 'Local North Coordinate',
    characteristicUuid: '2AB0',
  },
  {
    characteristicName: 'Local Time Information',
    characteristicUuid: '2A0F',
  },
  {
    characteristicName: 'Location and Speed Characteristic',
    characteristicUuid: '2A67',
  },
  {
    characteristicName: 'Location Name',
    characteristicUuid: '2AB5',
  },
  {
    characteristicName: 'Longitude',
    characteristicUuid: '2AAF',
  },
  {
    characteristicName: 'Magnetic Declination',
    characteristicUuid: '2A2C',
  },
  {
    characteristicName: 'Manufacturer Name String',
    characteristicUuid: '2A29',
  },
  {
    characteristicName: 'Maximum Recommended Heart Rate',
    characteristicUuid: '2A91',
  },
  {
    characteristicName: 'Measurement Interval',
    characteristicUuid: '2A21',
  },
  {
    characteristicName: 'Model Number String',
    characteristicUuid: '2A24',
  },
  {
    characteristicName: 'Navigation',
    characteristicUuid: '2A68',
  },
  {
    characteristicName: 'New Alert',
    characteristicUuid: '2A46',
  },
  {
    characteristicName: 'Object Action Control Point',
    characteristicUuid: '2AC5',
  },
  {
    characteristicName: 'Object Changed',
    characteristicUuid: '2AC8',
  },
  {
    characteristicName: 'Object First-Created',
    characteristicUuid: '2AC1',
  },
  {
    characteristicName: 'Object ID',
    characteristicUuid: '2AC3',
  },
  {
    characteristicName: 'Object Last-Modified',
    characteristicUuid: '2AC2',
  },
  {
    characteristicName: 'Object List Control Point',
    characteristicUuid: '2AC6',
  },
  {
    characteristicName: 'Object List Filter',
    characteristicUuid: '2AC7',
  },
  {
    characteristicName: 'Object Name',
    characteristicUuid: '2ABE',
  },
  {
    characteristicName: 'Object Properties',
    characteristicUuid: '2AC4',
  },
  {
    characteristicName: 'Object Size',
    characteristicUuid: '2AC0',
  },
  {
    characteristicName: 'Object Type',
    characteristicUuid: '2ABF',
  },
  {
    characteristicName: 'OTS Feature',
    characteristicUuid: '2ABD',
  },
  {
    characteristicName: 'PLX Continuous Measurement Characteristic',
    characteristicUuid: '2A5F',
  },
  {
    characteristicName: 'PLX Features',
    characteristicUuid: '2A60',
  },
  {
    characteristicName: 'PLX Spot-Check Measurement',
    characteristicUuid: '2A5E',
  },
  {
    characteristicName: 'PnP ID',
    characteristicUuid: '2A50',
  },
  {
    characteristicName: 'Pollen Concentration',
    characteristicUuid: '2A75',
  },
  {
    characteristicName: 'Position Quality',
    characteristicUuid: '2A69',
  },
  {
    characteristicName: 'Pressure',
    characteristicUuid: '2A6D',
  },
  {
    characteristicName: 'Protocol Mode',
    characteristicUuid: '2A4E',
  },
  {
    characteristicName: 'Rainfall',
    characteristicUuid: '2A78',
  },
  {
    characteristicName: 'Record Access Control Point',
    characteristicUuid: '2A52',
  },
  {
    characteristicName: 'Reference Time Information',
    characteristicUuid: '2A14',
  },
  {
    characteristicName: 'Report',
    characteristicUuid: '2A4D',
  },
  {
    characteristicName: 'Report Map',
    characteristicUuid: '2A4B',
  },
  {
    characteristicName: 'Resolvable Private Address Only',
    characteristicUuid: '2AC9',
  },
  {
    characteristicName: 'Resting Heart Rate',
    characteristicUuid: '2A92',
  },
  {
    characteristicName: 'Ringer Control point',
    characteristicUuid: '2A40',
  },
  {
    characteristicName: 'Ringer Setting',
    characteristicUuid: '2A41',
  },
  {
    characteristicName: 'Rower Data',
    characteristicUuid: '2AD1',
  },
  {
    characteristicName: 'RSC Feature',
    characteristicUuid: '2A54',
  },
  {
    characteristicName: 'RSC Measurement',
    characteristicUuid: '2A53',
  },
  {
    characteristicName: 'SC Control Point',
    characteristicUuid: '2A55',
  },
  {
    characteristicName: 'Scan Interval Window',
    characteristicUuid: '2A4F',
  },
  {
    characteristicName: 'Scan Refresh',
    characteristicUuid: '2A31',
  },
  {
    characteristicName: 'Sensor Location',
    characteristicUuid: '2A5D',
  },
  {
    characteristicName: 'Serial Number String',
    characteristicUuid: '2A25',
  },
  {
    characteristicName: 'Software Revision String',
    characteristicUuid: '2A28',
  },
  {
    characteristicName: 'Sport Type for Aerobic and Anaerobic Thresholds',
    characteristicUuid: '2A93',
  },
  {
    characteristicName: 'Stair Climber Data',
    characteristicUuid: '2AD0',
  },
  {
    characteristicName: 'Step Climber Data',
    characteristicUuid: '2ACF',
  },
  {
    characteristicName: 'Supported Heart Rate Range',
    characteristicUuid: '2AD7',
  },
  {
    characteristicName: 'Supported Inclination Range',
    characteristicUuid: '2AD5',
  },
  {
    characteristicName: 'Supported New Alert Category',
    characteristicUuid: '2A47',
  },
  {
    characteristicName: 'Supported Power Range',
    characteristicUuid: '2AD8',
  },
  {
    characteristicName: 'Supported Resistance Level Range',
    characteristicUuid: '2AD6',
  },
  {
    characteristicName: 'Supported Speed Range',
    characteristicUuid: '2AD4',
  },
  {
    characteristicName: 'Supported Unread Alert Category',
    characteristicUuid: '2A48',
  },
  {
    characteristicName: 'System ID',
    characteristicUuid: '2A23',
  },
  {
    characteristicName: 'TDS Control Point',
    characteristicUuid: '2ABC',
  },
  {
    characteristicName: 'Temperature',
    characteristicUuid: '2A6E',
  },
  {
    characteristicName: 'Temperature Measurement',
    characteristicUuid: '2A1C',
  },
  {
    characteristicName: 'Temperature Type',
    characteristicUuid: '2A1D',
  },
  {
    characteristicName: 'Three Zone Heart Rate Limits',
    characteristicUuid: '2A94',
  },
  {
    characteristicName: 'Time Accuracy',
    characteristicUuid: '2A12',
  },
  {
    characteristicName: 'Time Source',
    characteristicUuid: '2A13',
  },
  {
    characteristicName: 'Time Update Control Point',
    characteristicUuid: '2A16',
  },
  {
    characteristicName: 'Time Update State',
    characteristicUuid: '2A17',
  },
  {
    characteristicName: 'Time with DST',
    characteristicUuid: '2A11',
  },
  {
    characteristicName: 'Time Zone',
    characteristicUuid: '2A0E',
  },
  {
    characteristicName: 'Training Status',
    characteristicUuid: '2AD3',
  },
  {
    characteristicName: 'Treadmill Data',
    characteristicUuid: '2ACD',
  },
  {
    characteristicName: 'True Wind Direction',
    characteristicUuid: '2A71',
  },
  {
    characteristicName: 'True Wind Speed',
    characteristicUuid: '2A70',
  },
  {
    characteristicName: 'Two Zone Heart Rate Limit',
    characteristicUuid: '2A95',
  },
  {
    characteristicName: 'Tx Power Level',
    characteristicUuid: '2A07',
  },
  {
    characteristicName: 'Uncertainty',
    characteristicUuid: '2AB4',
  },
  {
    characteristicName: 'Unread Alert Status',
    characteristicUuid: '2A45',
  },
  {
    characteristicName: 'URI',
    characteristicUuid: '2AB6',
  },
  {
    characteristicName: 'User Control Point',
    characteristicUuid: '2A9F',
  },
  {
    characteristicName: 'User Index',
    characteristicUuid: '2A9A',
  },
  {
    characteristicName: 'UV Index',
    characteristicUuid: '2A76',
  },
  {
    characteristicName: 'VO2 Max',
    characteristicUuid: '2A96',
  },
  {
    characteristicName: 'Waist Circumference',
    characteristicUuid: '2A97',
  },
  {
    characteristicName: 'Weight',
    characteristicUuid: '2A98',
  },
  {
    characteristicName: 'Weight Measurement',
    characteristicUuid: '2A9D',
  },
  {
    characteristicName: 'Weight Scale Feature',
    characteristicUuid: '2A9E',
  },
  {
    characteristicName: 'Wind Chill',
    characteristicUuid: '2A79',
  },
] as MappedCharacteristic[];
