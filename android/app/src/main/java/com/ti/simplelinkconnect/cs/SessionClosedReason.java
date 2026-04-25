package com.ti.simplelinkconnect.cs;

public enum SessionClosedReason implements SessionCloseReasonProvider {
    MISSING_PERMISSION,
    NOT_SUPPORTED,
    RANGING_NOT_AVAILABLE,
    CS_SECURITY_NOT_AVAILABLE,
    UNKNOWN;
}