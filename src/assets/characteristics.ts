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
  name: string;
  uuid: string;
};

export default [
  {
    /* TI SImple Peripheral CHAR1 */ name: 'Characteristic 1',
    uuid: 'FFF1',
  },
  {
    /* TI SImple Peripheral CHAR2 */ name: 'Characteristic 2',
    uuid: 'FFF2',
  },
  {
    /* TI SImple Peripheral CHAR3 */ name: 'Characteristic 3',
    uuid: 'FFF3',
  },
  {
    /* TI SImple Peripheral CHAR4 */ name: 'Characteristic 4',
    uuid: 'FFF4',
  },
  {
    /* TI SImple Peripheral CHAR5 */ name: 'Characteristic 5',
    uuid: 'FFF5',
  },
  {
    name: 'Data',
    uuid: 'f000aa65-0451-4000-b000-000000000000',
  },
  {
    name: 'Configuration',
    uuid: 'f000aa66-0451-4000-b000-000000000000',
  },
  {
    name: 'Configuration',
    uuid: 'f000aa02-0451-4000-b000-000000000000',
  },
  {
    name: 'Period',
    uuid: 'f000aa03-0451-4000-b000-000000000000',
  },
  {
    name: 'Data',
    uuid: 'ffe1',
  },
  {
    name: "Device Name",
    uuid: "2A00"
  },
  {
    name: "Appearance",
    uuid: "2A01"
  },
  {
    name: "Peripheral Privacy Flag",
    uuid: "2A02"
  },
  {
    name: "Reconnection Address",
    uuid: "2A03"
  },
  {
    name: "Peripheral Preferred Connection Parameters",
    uuid: "2A04"
  },
  {
    name: "Service Changed",
    uuid: "2A05"
  },
  {
    name: "Alert Level",
    uuid: "2A06"
  },
  {
    name: "Tx Power Level",
    uuid: "2A07"
  },
  {
    name: "Date Time",
    uuid: "2A08"
  },
  {
    name: "Day of Week",
    uuid: "2A09"
  },
  {
    name: "Day Date Time",
    uuid: "2A0A"
  },
  {
    name: "Exact Time 256",
    uuid: "2A0C"
  },
  {
    name: "DST Offset",
    uuid: "2A0D"
  },
  {
    name: "Time Zone",
    uuid: "2A0E"
  },
  {
    name: "Local Time Information",
    uuid: "2A0F"
  },
  {
    name: "Time with DST",
    uuid: "2A11"
  },
  {
    name: "Time Accuracy",
    uuid: "2A12"
  },
  {
    name: "Time Source",
    uuid: "2A13"
  },
  {
    name: "Reference Time Information",
    uuid: "2A14"
  },
  {
    name: "Time Update Control Point",
    uuid: "2A16"
  },
  {
    name: "Time Update State",
    uuid: "2A17"
  },
  {
    name: "Glucose Measurement",
    uuid: "2A18"
  },
  {
    name: "Battery Level",
    uuid: "2A19"
  },
  {
    name: "Temperature Measurement",
    uuid: "2A1C"
  },
  {
    name: "Temperature Type",
    uuid: "2A1D"
  },
  {
    name: "Intermediate Temperature",
    uuid: "2A1E"
  },
  {
    name: "Measurement Interval",
    uuid: "2A21"
  },
  {
    name: "Boot Keyboard Input Report",
    uuid: "2A22"
  },
  {
    name: "System ID",
    uuid: "2A23"
  },
  {
    name: "Model Number String",
    uuid: "2A24"
  },
  {
    name: "Serial Number String",
    uuid: "2A25"
  },
  {
    name: "Firmware Revision String",
    uuid: "2A26"
  },
  {
    name: "Hardware Revision String",
    uuid: "2A27"
  },
  {
    name: "Software Revision String",
    uuid: "2A28"
  },
  {
    name: "Manufacturer Name String",
    uuid: "2A29"
  },
  {
    name: "IEEE 11073-20601 Regulatory Certification Data List",
    uuid: "2A2A"
  },
  {
    name: "Current Time",
    uuid: "2A2B"
  },
  {
    name: "Magnetic Declination",
    uuid: "2A2C"
  },
  {
    name: "Scan Refresh",
    uuid: "2A31"
  },
  {
    name: "Boot Keyboard Output Report",
    uuid: "2A32"
  },
  {
    name: "Boot Mouse Input Report",
    uuid: "2A33"
  },
  {
    name: "Glucose Measurement Context",
    uuid: "2A34"
  },
  {
    name: "Blood Pressure Measurement",
    uuid: "2A35"
  },
  {
    name: "Intermediate Cuff Pressure",
    uuid: "2A36"
  },
  {
    name: "Heart Rate Measurement",
    uuid: "2A37"
  },
  {
    name: "Body Sensor Location",
    uuid: "2A38"
  },
  {
    name: "Heart Rate Control Point",
    uuid: "2A39"
  },
  {
    name: "Alert Status",
    uuid: "2A3F"
  },
  {
    name: "Ringer Control Point",
    uuid: "2A40"
  },
  {
    name: "Ringer Setting",
    uuid: "2A41"
  },
  {
    name: "Alert Category ID Bit Mask",
    uuid: "2A42"
  },
  {
    name: "Alert Category ID",
    uuid: "2A43"
  },
  {
    name: "Alert Notification Control Point",
    uuid: "2A44"
  },
  {
    name: "Unread Alert Status",
    uuid: "2A45"
  },
  {
    name: "New Alert",
    uuid: "2A46"
  },
  {
    name: "Supported New Alert Category",
    uuid: "2A47"
  },
  {
    name: "Supported Unread Alert Category",
    uuid: "2A48"
  },
  {
    name: "Blood Pressure Feature",
    uuid: "2A49"
  },
  {
    name: "HID Information",
    uuid: "2A4A"
  },
  {
    name: "Report Map",
    uuid: "2A4B"
  },
  {
    name: "HID Control Point",
    uuid: "2A4C"
  },
  {
    name: "Report",
    uuid: "2A4D"
  },
  {
    name: "Protocol Mode",
    uuid: "2A4E"
  },
  {
    name: "Scan Interval Window",
    uuid: "2A4F"
  },
  {
    name: "PnP ID",
    uuid: "2A50"
  },
  {
    name: "Glucose Feature",
    uuid: "2A51"
  },
  {
    name: "Record Access Control Point",
    uuid: "2A52"
  },
  {
    name: "RSC Measurement",
    uuid: "2A53"
  },
  {
    name: "RSC Feature",
    uuid: "2A54"
  },
  {
    name: "SC Control Point",
    uuid: "2A55"
  },
  {
    name: "Aggregate",
    uuid: "2A5A"
  },
  {
    name: "CSC Measurement",
    uuid: "2A5B"
  },
  {
    name: "CSC Feature",
    uuid: "2A5C"
  },
  {
    name: "Sensor Location",
    uuid: "2A5D"
  },
  {
    name: "PLX Spot- Check Measurement",
    uuid: "2A5E"
  },
  {
    name: "PLX Continuous Measurement",
    uuid: "2A5F"
  },
  {
    name: "PLX Features",
    uuid: "2A60"
  },
  {
    name: "Cycling Power Measurement",
    uuid: "2A63"
  },
  {
    name: "Cycling Power Vector",
    uuid: "2A64"
  },
  {
    name: "Cycling Power Feature",
    uuid: "2A65"
  },
  {
    name: "Cycling Power Control Point",
    uuid: "2A66"
  },
  {
    name: "Location and Speed",
    uuid: "2A67"
  },
  {
    name: "Navigation",
    uuid: "2A68"
  },
  {
    name: "Position Quality",
    uuid: "2A69"
  },
  {
    name: "LN Feature",
    uuid: "2A6A"
  },
  {
    name: "LN Control Point",
    uuid: "2A6B"
  },
  {
    name: "Elevation",
    uuid: "2A6C"
  },
  {
    name: "Pressure",
    uuid: "2A6D"
  },
  {
    name: "Temperature",
    uuid: "2A6E"
  },
  {
    name: "Humidity",
    uuid: "2A6F"
  },
  {
    name: "True Wind Speed",
    uuid: "2A70"
  },
  {
    name: "True Wind Direction",
    uuid: "2A71"
  },
  {
    name: "Apparent Wind Speed",
    uuid: "2A72"
  },
  {
    name: "Apparent Wind Direction",
    uuid: "2A73"
  },
  {
    name: "Gust Factor",
    uuid: "2A74"
  },
  {
    name: "Pollen Concentration",
    uuid: "2A75"
  },
  {
    name: "UV Index",
    uuid: "2A76"
  },
  {
    name: "Irradiance",
    uuid: "2A77"
  },
  {
    name: "Rainfall",
    uuid: "2A78"
  },
  {
    name: "Wind Chill",
    uuid: "2A79"
  },
  {
    name: "Heat Index",
    uuid: "2A7A"
  },
  {
    name: "Dew Point",
    uuid: "2A7B"
  },
  {
    name: "Descriptor Value Changed",
    uuid: "2A7D"
  },
  {
    name: "Aerobic Heart Rate Lower Limit",
    uuid: "2A7E"
  },
  {
    name: "Aerobic Threshold",
    uuid: "2A7F"
  },
  {
    name: "Age",
    uuid: "2A80"
  },
  {
    name: "Anaerobic Heart Rate Lower Limit",
    uuid: "2A81"
  },
  {
    name: "Anaerobic Heart Rate Upper Limit",
    uuid: "2A82"
  },
  {
    name: "Anaerobic Threshold",
    uuid: "2A83"
  },
  {
    name: "Aerobic Heart Rate Upper Limit",
    uuid: "2A84"
  },
  {
    name: "Date of Birth",
    uuid: "2A85"
  },
  {
    name: "Date of Threshold Assessment",
    uuid: "2A86"
  },
  {
    name: "Email Address",
    uuid: "2A87"
  },
  {
    name: "Fat Burn Heart Rate Lower Limit",
    uuid: "2A88"
  },
  {
    name: "Fat Burn Heart Rate Upper Limit",
    uuid: "2A89"
  },
  {
    name: "First Name",
    uuid: "2A8A"
  },
  {
    name: "Five Zone Heart Rate Limits",
    uuid: "2A8B"
  },
  {
    name: "Gender",
    uuid: "2A8C"
  },
  {
    name: "Heart Rate Max",
    uuid: "2A8D"
  },
  {
    name: "Height",
    uuid: "2A8E"
  },
  {
    name: "Hip Circumference",
    uuid: "2A8F"
  },
  {
    name: "Last Name",
    uuid: "2A90"
  },
  {
    name: "Maximum Recommended Heart Rate",
    uuid: "2A91"
  },
  {
    name: "Resting Heart Rate",
    uuid: "2A92"
  },
  {
    name: "Sport Type for Aerobic and Anaerobic Thresholds",
    uuid: "2A93"
  },
  {
    name: "Three Zone Heart Rate Limits",
    uuid: "2A94"
  },
  {
    name: "Two Zone Heart Rate Limits",
    uuid: "2A95"
  },
  {
    name: "VO2 Max",
    uuid: "2A96"
  },
  {
    name: "Waist Circumference",
    uuid: "2A97"
  },
  {
    name: "Weight",
    uuid: "2A98"
  },
  {
    name: "Database Change Increment",
    uuid: "2A99"
  },
  {
    name: "User Index",
    uuid: "2A9A"
  },
  {
    name: "Body Composition Feature",
    uuid: "2A9B"
  },
  {
    name: "Body Composition Measurement",
    uuid: "2A9C"
  },
  {
    name: "Weight Measurement",
    uuid: "2A9D"
  },
  {
    name: "Weight Scale Feature",
    uuid: "2A9E"
  },
  {
    name: "User Control Point",
    uuid: "2A9F"
  },
  {
    name: "Magnetic Flux Density - 2D",
    uuid: "2AA0"
  },
  {
    name: "Magnetic Flux Density - 3D",
    uuid: "2AA1"
  },
  {
    name: "Language",
    uuid: "2AA2"
  },
  {
    name: "Barometric Pressure Trend",
    uuid: "2AA3"
  },
  {
    name: "Bond Management Control Point",
    uuid: "2AA4"
  },
  {
    name: "Bond Management Feature",
    uuid: "2AA5"
  },
  {
    name: "Central Address Resolution",
    uuid: "2AA6"
  },
  {
    name: "CGM Measurement",
    uuid: "2AA7"
  },
  {
    name: "CGM Feature",
    uuid: "2AA8"
  },
  {
    name: "CGM Status",
    uuid: "2AA9"
  },
  {
    name: "CGM Session Start Time",
    uuid: "2AAA"
  },
  {
    name: "CGM Session Run Time",
    uuid: "2AAB"
  },
  {
    name: "CGM Specific Ops Control Point",
    uuid: "2AAC"
  },
  {
    name: "Indoor Positioning Configuration",
    uuid: "2AAD"
  },
  {
    name: "Latitude",
    uuid: "2AAE"
  },
  {
    name: "Longitude",
    uuid: "2AAF"
  },
  {
    name: "Local North Coordinate",
    uuid: "2AB0"
  },
  {
    name: "Local East Coordinate",
    uuid: "2AB1"
  },
  {
    name: "Floor Number",
    uuid: "2AB2"
  },
  {
    name: "Altitude",
    uuid: "2AB3"
  },
  {
    name: "Uncertainty",
    uuid: "2AB4"
  },
  {
    name: "Location Name",
    uuid: "2AB5"
  },
  {
    name: "URI",
    uuid: "2AB6"
  },
  {
    name: "HTTP Headers",
    uuid: "2AB7"
  },
  {
    name: "HTTP Status Code",
    uuid: "2AB8"
  },
  {
    name: "HTTP Entity Body",
    uuid: "2AB9"
  },
  {
    name: "HTTP Control Point",
    uuid: "2ABA"
  },
  {
    name: "HTTPS Security",
    uuid: "2ABB"
  },
  {
    name: "TDS Control Point",
    uuid: "2ABC"
  },
  {
    name: "OTS Feature",
    uuid: "2ABD"
  },
  {
    name: "Object Name",
    uuid: "2ABE"
  },
  {
    name: "Object Type",
    uuid: "2ABF"
  },
  {
    name: "Object Size",
    uuid: "2AC0"
  },
  {
    name: "Object First- Created",
    uuid: "2AC1"
  },
  {
    name: "Object Last- Modified",
    uuid: "2AC2"
  },
  {
    name: "Object ID",
    uuid: "2AC3"
  },
  {
    name: "Object Properties",
    uuid: "2AC4"
  },
  {
    name: "Object Action Control Point",
    uuid: "2AC5"
  },
  {
    name: "Object List Control Point",
    uuid: "2AC6"
  },
  {
    name: "Object List Filter",
    uuid: "2AC7"
  },
  {
    name: "Object Changed",
    uuid: "2AC8"
  },
  {
    name: "Resolvable Private Address Only",
    uuid: "2AC9"
  },
  {
    name: "Fitness Machine Feature",
    uuid: "2ACC"
  },
  {
    name: "Treadmill Data",
    uuid: "2ACD"
  },
  {
    name: "Cross Trainer Data",
    uuid: "2ACE"
  },
  {
    name: "Step Climber Data",
    uuid: "2ACF"
  },
  {
    name: "Stair Climber Data",
    uuid: "2AD0"
  },
  {
    name: "Rower Data",
    uuid: "2AD1"
  },
  {
    name: "Indoor Bike Data",
    uuid: "2AD2"
  },
  {
    name: "Training Status",
    uuid: "2AD3"
  },
  {
    name: "Supported Speed Range",
    uuid: "2AD4"
  },
  {
    name: "Supported Inclination Range",
    uuid: "2AD5"
  },
  {
    name: "Supported Resistance Level Range",
    uuid: "2AD6"
  },
  {
    name: "Supported Heart Rate Range",
    uuid: "2AD7"
  },
  {
    name: "Supported Power Range",
    uuid: "2AD8"
  },
  {
    name: "Fitness Machine Control Point",
    uuid: "2AD9"
  },
  {
    name: "Fitness Machine Status",
    uuid: "2ADA"
  },
  {
    name: "Mesh Provisioning Data In",
    uuid: "2ADB"
  },
  {
    name: "Mesh Provisioning Data Out",
    uuid: "2ADC"
  },
  {
    name: "Mesh Proxy Data In",
    uuid: "2ADD"
  },
  {
    name: "Mesh Proxy Data Out",
    uuid: "2ADE"
  },
  {
    name: "Average Current",
    uuid: "2AE0"
  },
  {
    name: "Average Voltage",
    uuid: "2AE1"
  },
  {
    name: "Boolean",
    uuid: "2AE2"
  },
  {
    name: "Chromatic Distance from Planckian",
    uuid: "2AE3"
  },
  {
    name: "Chromaticity Coordinates",
    uuid: "2AE4"
  },
  {
    name: "Chromaticity in CCT and Duv Values",
    uuid: "2AE5"
  },
  {
    name: "Chromaticity Tolerance",
    uuid: "2AE6"
  },
  {
    name: "CIE 13.3-1995 Color Rendering Index",
    uuid: "2AE7"
  },
  {
    name: "Coefficient",
    uuid: "2AE8"
  },
  {
    name: "Correlated Color Temperature",
    uuid: "2AE9"
  },
  {
    name: "Count 16",
    uuid: "2AEA"
  },
  {
    name: "Count 24",
    uuid: "2AEB"
  },
  {
    name: "Country Code",
    uuid: "2AEC"
  },
  {
    name: "Date UTC",
    uuid: "2AED"
  },
  {
    name: "Electric Current",
    uuid: "2AEE"
  },
  {
    name: "Electric Current Range",
    uuid: "2AEF"
  },
  {
    name: "Electric Current Specification",
    uuid: "2AF0"
  },
  {
    name: "Electric Current Statistics",
    uuid: "2AF1"
  },
  {
    name: "Energy",
    uuid: "2AF2"
  },
  {
    name: "Energy in a Period of Day",
    uuid: "2AF3"
  },
  {
    name: "Event Statistics",
    uuid: "2AF4"
  },
  {
    name: "Fixed String 16",
    uuid: "2AF5"
  },
  {
    name: "Fixed String 24",
    uuid: "2AF6"
  },
  {
    name: "Fixed String 36",
    uuid: "2AF7"
  },
  {
    name: "Fixed String 8",
    uuid: "2AF8"
  },
  {
    name: "Generic Level",
    uuid: "2AF9"
  },
  {
    name: "Global Trade Item Number",
    uuid: "2AFA"
  },
  {
    name: "Illuminance",
    uuid: "2AFB"
  },
  {
    name: "Luminous Efficacy",
    uuid: "2AFC"
  },
  {
    name: "Luminous Energy",
    uuid: "2AFD"
  },
  {
    name: "Luminous Exposure",
    uuid: "2AFE"
  },
  {
    name: "Luminous Flux",
    uuid: "2AFF"
  },
  {
    name: "Luminous Flux Range",
    uuid: "2B00"
  },
  {
    name: "Luminous Intensity",
    uuid: "2B01"
  },
  {
    name: "Mass Flow",
    uuid: "2B02"
  },
  {
    name: "Perceived Lightness",
    uuid: "2B03"
  },
  {
    name: "Percentage 8",
    uuid: "2B04"
  },
  {
    name: "Power",
    uuid: "2B05"
  },
  {
    name: "Power Specification",
    uuid: "2B06"
  },
  {
    name: "Relative Runtime in a Current Range",
    uuid: "2B07"
  },
  {
    name: "Relative Runtime in a Generic Level Range",
    uuid: "2B08"
  },
  {
    name: "Relative Value in a Voltage Range",
    uuid: "2B09"
  },
  {
    name: "Relative Value in an Illuminance Range",
    uuid: "2B0A"
  },
  {
    name: "Relative Value in a Period of Day",
    uuid: "2B0B"
  },
  {
    name: "Relative Value in a Temperature Range",
    uuid: "2B0C"
  },
  {
    name: "Temperature 8",
    uuid: "2B0D"
  },
  {
    name: "Temperature 8 in a Period of Day",
    uuid: "2B0E"
  },
  {
    name: "Temperature 8 Statistics",
    uuid: "2B0F"
  },
  {
    name: "Temperature Range",
    uuid: "2B10"
  },
  {
    name: "Temperature Statistics",
    uuid: "2B11"
  },
  {
    name: "Time Decihour 8",
    uuid: "2B12"
  },
  {
    name: "Time Exponential 8",
    uuid: "2B13"
  },
  {
    name: "Time Hour 24",
    uuid: "2B14"
  },
  {
    name: "Time Millisecond 24",
    uuid: "2B15"
  },
  {
    name: "Time Second 16",
    uuid: "2B16"
  },
  {
    name: "Time Second 8",
    uuid: "2B17"
  },
  {
    name: "Voltage",
    uuid: "2B18"
  },
  {
    name: "Voltage Specification",
    uuid: "2B19"
  },
  {
    name: "Voltage Statistics",
    uuid: "2B1A"
  },
  {
    name: "Volume Flow",
    uuid: "2B1B"
  },
  {
    name: "Chromaticity Coordinate",
    uuid: "2B1C"
  },
  {
    name: "RC Feature",
    uuid: "2B1D"
  },
  {
    name: "RC Settings",
    uuid: "2B1E"
  },
  {
    name: "Reconnection Configuration Control Point",
    uuid: "2B1F"
  },
  {
    name: "IDD Status Changed",
    uuid: "2B20"
  },
  {
    name: "IDD Status",
    uuid: "2B21"
  },
  {
    name: "IDD Annunciation Status",
    uuid: "2B22"
  },
  {
    name: "IDD Features",
    uuid: "2B23"
  },
  {
    name: "IDD Status Reader Control Point",
    uuid: "2B24"
  },
  {
    name: "IDD Command Control Point",
    uuid: "2B25"
  },
  {
    name: "IDD Command Data",
    uuid: "2B26"
  },
  {
    name: "IDD Record Access Control Point",
    uuid: "2B27"
  },
  {
    name: "IDD History Data",
    uuid: "2B28"
  },
  {
    name: "Client Supported Features",
    uuid: "2B29"
  },
  {
    name: "Database Hash",
    uuid: "2B2A"
  },
  {
    name: "BSS Control Point",
    uuid: "2B2B"
  },
  {
    name: "BSS Response",
    uuid: "2B2C"
  },
  {
    name: "Emergency ID",
    uuid: "2B2D"
  },
  {
    name: "Emergency Text",
    uuid: "2B2E"
  },
  {
    name: "ACS Status",
    uuid: "2B2F"
  },
  {
    name: "ACS Data In",
    uuid: "2B30"
  },
  {
    name: "ACS Data Out Notify",
    uuid: "2B31"
  },
  {
    name: "ACS Data Out Indicate",
    uuid: "2B32"
  },
  {
    name: "ACS Control Point",
    uuid: "2B33"
  },
  {
    name: "Enhanced Blood Pressure Measurement",
    uuid: "2B34"
  },
  {
    name: "Enhanced Intermediate Cuff Pressure",
    uuid: "2B35"
  },
  {
    name: "Blood Pressure Record",
    uuid: "2B36"
  },
  {
    name: "Registered User",
    uuid: "2B37"
  },
  {
    name: "BR - EDR Handover Data",
    uuid: "2B38"
  },
  {
    name: "Bluetooth SIG Data",
    uuid: "2B39"
  },
  {
    name: "Server Supported Features",
    uuid: "2B3A"
  },
  {
    name: "Physical Activity Monitor Features",
    uuid: "2B3B"
  },
  {
    name: "General Activity Instantaneous Data",
    uuid: "2B3C"
  },
  {
    name: "General Activity Summary Data",
    uuid: "2B3D"
  },
  {
    name: "CardioRespiratory Activity Instantaneous Data",
    uuid: "2B3E"
  },
  {
    name: "CardioRespiratory Activity Summary Data",
    uuid: "2B3F"
  },
  {
    name: "Step Counter Activity Summary Data",
    uuid: "2B40"
  },
  {
    name: "Sleep Activity Instantaneous Data",
    uuid: "2B41"
  },
  {
    name: "Sleep Activity Summary Data",
    uuid: "2B42"
  },
  {
    name: "Physical Activity Monitor Control Point",
    uuid: "2B43"
  },
  {
    name: "Activity Current Session",
    uuid: "2B44"
  },
  {
    name: "Physical Activity Session Descriptor",
    uuid: "2B45"
  },
  {
    name: "Preferred Units",
    uuid: "2B46"
  },
  {
    name: "High Resolution Height",
    uuid: "2B47"
  },
  {
    name: "Middle Name",
    uuid: "2B48"
  },
  {
    name: "Stride Length",
    uuid: "2B49"
  },
  {
    name: "Handedness",
    uuid: "2B4A"
  },
  {
    name: "Device Wearing Position",
    uuid: "2B4B"
  },
  {
    name: "Four Zone Heart Rate Limits",
    uuid: "2B4C"
  },
  {
    name: "High Intensity Exercise Threshold",
    uuid: "2B4D"
  },
  {
    name: "Activity Goal",
    uuid: "2B4E"
  },
  {
    name: "Sedentary Interval Notification",
    uuid: "2B4F"
  },
  {
    name: "Caloric Intake",
    uuid: "2B50"
  },
  {
    name: "TMAP Role",
    uuid: "2B51"
  },
  {
    name: "Audio Input State",
    uuid: "2B77"
  },
  {
    name: "Gain Settings Attribute",
    uuid: "2B78"
  },
  {
    name: "Audio Input Type",
    uuid: "2B79"
  },
  {
    name: "Audio Input Status",
    uuid: "2B7A"
  },
  {
    name: "Audio Input Control Point",
    uuid: "2B7B"
  },
  {
    name: "Audio Input Description",
    uuid: "2B7C"
  },
  {
    name: "Volume State",
    uuid: "2B7D"
  },
  {
    name: "Volume Control Point",
    uuid: "2B7E"
  },
  {
    name: "Volume Flags",
    uuid: "2B7F"
  },
  {
    name: "Volume Offset State",
    uuid: "2B80"
  },
  {
    name: "Audio Location",
    uuid: "2B81"
  },
  {
    name: "Volume Offset Control Point",
    uuid: "2B82"
  },
  {
    name: "Audio Output Description",
    uuid: "2B83"
  },
  {
    name: "Set Identity Resolving Key",
    uuid: "2B84"
  },
  {
    name: "Coordinated Set Size",
    uuid: "2B85"
  },
  {
    name: "Set Member Lock",
    uuid: "2B86"
  },
  {
    name: "Set Member Rank",
    uuid: "2B87"
  },
  {
    name: "Encrypted Data Key Material",
    uuid: "2B88"
  },
  {
    name: "Apparent Energy 32",
    uuid: "2B89"
  },
  {
    name: "Apparent Power",
    uuid: "2B8A"
  },
  {
    name: "Live Health Observations",
    uuid: "2B8B"
  },
  {
    name: "CO\\textsubscript{ 2} Concentration",
    uuid: "2B8C"
  },
  {
    name: "Cosine of the Angle",
    uuid: "2B8D"
  },
  {
    name: "Device Time Feature",
    uuid: "2B8E"
  },
  {
    name: "Device Time Parameters",
    uuid: "2B8F"
  },
  {
    name: "Device Time",
    uuid: "2B90"
  },
  {
    name: "Device Time Control Point",
    uuid: "2B91"
  },
  {
    name: "Time Change Log Data",
    uuid: "2B92"
  },
  {
    name: "Media Player Name",
    uuid: "2B93"
  },
  {
    name: "Media Player Icon Object ID",
    uuid: "2B94"
  },
  {
    name: "Media Player Icon URL",
    uuid: "2B95"
  },
  {
    name: "Track Changed",
    uuid: "2B96"
  },
  {
    name: "Track Title",
    uuid: "2B97"
  },
  {
    name: "Track Duration",
    uuid: "2B98"
  },
  {
    name: "Track Position",
    uuid: "2B99"
  },
  {
    name: "Playback Speed",
    uuid: "2B9A"
  },
  {
    name: "Seeking Speed",
    uuid: "2B9B"
  },
  {
    name: "Current Track Segments Object ID",
    uuid: "2B9C"
  },
  {
    name: "Current Track Object ID",
    uuid: "2B9D"
  },
  {
    name: "Next Track Object ID",
    uuid: "2B9E"
  },
  {
    name: "Parent Group Object ID",
    uuid: "2B9F"
  },
  {
    name: "Current Group Object ID",
    uuid: "2BA0"
  },
  {
    name: "Playing Order",
    uuid: "2BA1"
  },
  {
    name: "Playing Orders Supported",
    uuid: "2BA2"
  },
  {
    name: "Media State",
    uuid: "2BA3"
  },
  {
    name: "Media Control Point",
    uuid: "2BA4"
  },
  {
    name: "Media Control Point Opcodes Supported",
    uuid: "2BA5"
  },
  {
    name: "Search Results Object ID",
    uuid: "2BA6"
  },
  {
    name: "Search Control Point",
    uuid: "2BA7"
  },
  {
    name: "Energy 32",
    uuid: "2BA8"
  },
  {
    name: "Media Player Icon Object Type",
    uuid: "2BA9"
  },
  {
    name: "Track Segments Object Type",
    uuid: "2BAA"
  },
  {
    name: "Track Object Type",
    uuid: "2BAB"
  },
  {
    name: "Group Object Type",
    uuid: "2BAC"
  },
  {
    name: "Constant Tone Extension Enable",
    uuid: "2BAD"
  },
  {
    name: "Advertising Constant Tone Extension Minimum Length",
    uuid: "2BAE"
  },
  {
    name: "Advertising Constant Tone Extension Minimum Transmit Count",
    uuid: "2BAF"
  },
  {
    name: "Advertising Constant Tone Extension Transmit Duration",
    uuid: "2BB0"
  },
  {
    name: "Advertising Constant Tone Extension Interval",
    uuid: "2BB1"
  },
  {
    name: "Advertising Constant Tone Extension PHY",
    uuid: "2BB2"
  },
  {
    name: "Bearer Provider Name",
    uuid: "2BB3"
  },
  {
    name: "Bearer UCI",
    uuid: "2BB4"
  },
  {
    name: "Bearer Technology",
    uuid: "2BB5"
  },
  {
    name: "Bearer URI Schemes Supported List",
    uuid: "2BB6"
  },
  {
    name: "Bearer Signal Strength",
    uuid: "2BB7"
  },
  {
    name: "Bearer Signal Strength Reporting Interval",
    uuid: "2BB8"
  },
  {
    name: "Bearer List Current Calls",
    uuid: "2BB9"
  },
  {
    name: "Content Control ID",
    uuid: "2BBA"
  },
  {
    name: "Status Flags",
    uuid: "2BBB"
  },
  {
    name: "Incoming Call Target Bearer URI",
    uuid: "2BBC"
  },
  {
    name: "Call State",
    uuid: "2BBD"
  },
  {
    name: "Call Control Point",
    uuid: "2BBE"
  },
  {
    name: "Call Control Point Optional Opcodes",
    uuid: "2BBF"
  },
  {
    name: "Termination Reason",
    uuid: "2BC0"
  },
  {
    name: "Incoming Call",
    uuid: "2BC1"
  },
  {
    name: "Call Friendly Name",
    uuid: "2BC2"
  },
  {
    name: "Mute",
    uuid: "2BC3"
  },
  {
    name: "Sink ASE",
    uuid: "2BC4"
  },
  {
    name: "Source ASE",
    uuid: "2BC5"
  },
  {
    name: "ASE Control Point",
    uuid: "2BC6"
  },
  {
    name: "Broadcast Audio Scan Control Point",
    uuid: "2BC7"
  },
  {
    name: "Broadcast Receive State",
    uuid: "2BC8"
  },
  {
    name: "Sink PAC",
    uuid: "2BC9"
  },
  {
    name: "Sink Audio Locations",
    uuid: "2BCA"
  },
  {
    name: "Source PAC",
    uuid: "2BCB"
  },
  {
    name: "Source Audio Locations",
    uuid: "2BCC"
  },
  {
    name: "Available Audio Contexts",
    uuid: "2BCD"
  },
  {
    name: "Supported Audio Contexts",
    uuid: "2BCE"
  },
  {
    name: "Ammonia Concentration",
    uuid: "2BCF"
  },
  {
    name: "Carbon Monoxide Concentration",
    uuid: "2BD0"
  },
  {
    name: "Methane Concentration",
    uuid: "2BD1"
  },
  {
    name: "Nitrogen Dioxide Concentration",
    uuid: "2BD2"
  },
  {
    name: "Non - Methane Volatile Organic Compounds Concentration",
    uuid: "2BD3"
  },
  {
    name: "Ozone Concentration",
    uuid: "2BD4"
  },
  {
    name: "Particulate Matter - PM1 Concentration",
    uuid: "2BD5"
  },
  {
    name: "Particulate Matter - PM2.5 Concentration",
    uuid: "2BD6"
  },
  {
    name: "Particulate Matter - PM10 Concentration",
    uuid: "2BD7"
  },
  {
    name: "Sulfur Dioxide Concentration",
    uuid: "2BD8"
  },
  {
    name: "Sulfur Hexafluoride Concentration",
    uuid: "2BD9"
  },
  {
    name: "Hearing Aid Features",
    uuid: "2BDA"
  },
  {
    name: "Hearing Aid Preset Control Point",
    uuid: "2BDB"
  },
  {
    name: "Active Preset Index",
    uuid: "2BDC"
  },
  {
    name: "Stored Health Observations",
    uuid: "2BDD"
  },
  {
    name: "Fixed String 64",
    uuid: "2BDE"
  },
  {
    name: "High Temperature",
    uuid: "2BDF"
  },
  {
    name: "High Voltage",
    uuid: "2BE0"
  },
  {
    name: "Light Distribution",
    uuid: "2BE1"
  },
  {
    name: "Light Output",
    uuid: "2BE2"
  },
  {
    name: "Light Source Type",
    uuid: "2BE3"
  },
  {
    name: "Noise",
    uuid: "2BE4"
  },
  {
    name: "Relative Runtime in a Correlated Color Temperature Range",
    uuid: "2BE5"
  },
  {
    name: "Time Second 32",
    uuid: "2BE6"
  },
  {
    name: "VOC Concentration",
    uuid: "2BE7"
  },
  {
    name: "Voltage Frequency",
    uuid: "2BE8"
  },
  {
    name: "Battery Critical Status",
    uuid: "2BE9"
  },
  {
    name: "Battery Health Status",
    uuid: "2BEA"
  },
  {
    name: "Battery Health Information",
    uuid: "2BEB"
  },
  {
    name: "Battery Information",
    uuid: "2BEC"
  },
  {
    name: "Battery Level Status",
    uuid: "2BED"
  },
  {
    name: "Battery Time Status",
    uuid: "2BEE"
  },
  {
    name: "Estimated Service Date",
    uuid: "2BEF"
  },
  {
    name: "Battery Energy Status",
    uuid: "2BF0"
  },
  {
    name: "Observation Schedule Changed",
    uuid: "2BF1"
  },
  {
    name: "Current Elapsed Time",
    uuid: "2BF2"
  },
  {
    name: "Health Sensor Features",
    uuid: "2BF3"
  },
  {
    name: "GHS Control Point",
    uuid: "2BF4"
  },
  {
    name: "LE GATT Security Levels",
    uuid: "2BF5"
  },
  {
    name: "ESL Address",
    uuid: "2BF6"
  },
  {
    name: "AP Sync Key Material",
    uuid: "2BF7"
  },
  {
    name: "ESL Response Key Material",
    uuid: "2BF8"
  },
  {
    name: "ESL Current Absolute Time",
    uuid: "2BF9"
  },
  {
    name: "ESL Display Information",
    uuid: "2BFA"
  },
  {
    name: "ESL Image Information",
    uuid: "2BFB"
  },
  {
    name: "ESL Sensor Information",
    uuid: "2BFC"
  },
  {
    name: "ESL LED Information",
    uuid: "2BFD"
  },
  {
    name: "ESL Control Point",
    uuid: "2BFE"
  },
  {
    name: "UDI for Medical Devices",
    uuid: "2BFF"
  },
  {
    name: 'Data',
    uuid: 'f000aa01-0451-4000-b000-000000000000'
  },
  {
    name: 'OAD Image Identify Write',
    uuid: 'f000ffc1-0451-4000-b000-000000000000'
  },
  {
    name: 'OAD Image Block Request',
    uuid: 'f000ffc2-0451-4000-b000-000000000000'
  },
  {
    name: 'OAD Image Control Point',
    uuid: 'f000ffc5-0451-4000-b000-000000000000'
  },
  {
    name: 'Write Data',
    uuid: 'f000c0c1-0451-4000-B000-000000000000'
  },
  {
    name: 'Server Data',
    uuid: 'f000c0c2-0451-4000-B000-000000000000'
  },
] as MappedCharacteristic[];
