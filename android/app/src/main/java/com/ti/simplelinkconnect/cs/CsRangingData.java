package com.ti.simplelinkconnect.cs;

public class CsRangingData {
    private final CSRangingMeasurement distance;
    private final CSRangingMeasurement azimuth;
    private final CSRangingMeasurement elevation;
    private final RangingTechnology technology;
    private final long timeStamp;
    private final boolean hasRssi;
    private final Integer rssi;

    public CsRangingData(CSRangingMeasurement distance,
                         CSRangingMeasurement azimuth,
                         CSRangingMeasurement elevation,
                         RangingTechnology technology,
                         long timeStamp,
                         boolean hasRssi,
                         Integer rssi) {
        this.distance = distance;
        this.azimuth = azimuth;
        this.elevation = elevation;
        this.technology = technology;
        this.timeStamp = timeStamp;
        this.hasRssi = hasRssi;
        this.rssi = rssi;
    }

    public CSRangingMeasurement getDistance() {
        return distance;
    }

    public CSRangingMeasurement getAzimuth() {
        return azimuth;
    }

    public CSRangingMeasurement getElevation() {
        return elevation;
    }

    public RangingTechnology getTechnology() {
        return technology;
    }

    public long getTimeStamp() {
        return timeStamp;
    }

    public boolean hasRssi() {
        return hasRssi;
    }

    public Integer getRssi() {
        return rssi;
    }
}
