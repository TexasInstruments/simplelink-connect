package com.ti.simplelinkconnect.cs;

public enum RangingSessionFailedReason implements SessionCloseReasonProvider {
    UNKNOWN(0),
    LOCAL_REQUEST(1),
    REMOTE_REQUEST(2),
    UNSUPPORTED(3),
    SYSTEM_POLICY(4),
    NO_PEERS_FOUND(5);

    private final int reason;

    RangingSessionFailedReason(int reason) {
        this.reason = reason;
    }

    public int getReason() {
        return reason;
    }

    public static RangingSessionFailedReason getReason(int value) {
        for (RangingSessionFailedReason r : values()) {
            if (r.reason == value) return r;
        }
        return UNKNOWN;
    }
}
