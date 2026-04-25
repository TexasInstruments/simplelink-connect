package com.ti.simplelinkconnect.cs;

public class CSRangingMeasurement {
    private final double measurement;
    private final ConfidenceLevel confidenceLevel;

    public CSRangingMeasurement(double measurement, ConfidenceLevel confidenceLevel) {
        this.measurement = measurement;
        this.confidenceLevel = confidenceLevel;
    }

    public double getMeasurement() {
        return measurement;
    }

    public ConfidenceLevel getConfidenceLevel() {
        return confidenceLevel;
    }
}

