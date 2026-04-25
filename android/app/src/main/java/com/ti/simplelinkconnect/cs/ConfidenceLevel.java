package com.ti.simplelinkconnect.cs;

public enum ConfidenceLevel {
    CONFIDENCE_HIGH(2),
    CONFIDENCE_MEDIUM(1),
    CONFIDENCE_LOW(0);

    private final int value;

    ConfidenceLevel(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }

    public static ConfidenceLevel from(int value) {
        for (ConfidenceLevel level : values()) {
            if (level.value == value) return level;
        }
        return CONFIDENCE_LOW;
    }
}
