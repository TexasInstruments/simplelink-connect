package com.ti.simplelinkconnect.cs;

public enum Profile {
    BPS,
    CGM,
    CHANNEL_SOUNDING,
    CSC,
    DFS,
    DFU,
    GLS,
    HRS,
    HTS,
    LBS,
    RSCS,
    BATTERY,
    THROUGHPUT,
    UART;

    @Override
    public String toString() {
        switch (this) {
            case BPS:
                return "Blood Pressure";
            case CGM:
                return "Continuous Glucose";
            case CHANNEL_SOUNDING:
                return "Channel Sounding";
            case CSC:
                return "Cycling Speed and Cadence";
            case DFS:
                return "Distance Measurement";
            case GLS:
                return "Glucose";
            case HRS:
                return "Heart Rate";
            case HTS:
                return "Health Thermometer";
            case LBS:
                return "LED Button";
            case RSCS:
                return "Running Speed and Cadence";
            case BATTERY:
                return "Battery";
            case THROUGHPUT:
                return "Throughput Service";
            case UART:
                return "UART";
            case DFU:
                return "Device Firmware Update";
            default:
                return super.toString();
        }
    }
}
