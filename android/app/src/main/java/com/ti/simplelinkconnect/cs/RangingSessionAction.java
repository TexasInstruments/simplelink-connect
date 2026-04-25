package com.ti.simplelinkconnect.cs;

import java.util.Collections;
import java.util.List;

public interface RangingSessionAction {

    class OnStart implements RangingSessionAction {
        public static final OnStart INSTANCE = new OnStart();
        private OnStart() {}
    }

    class OnResult implements RangingSessionAction {
        private final CsRangingData data;
        private final List<Float> previousData;

        public OnResult(CsRangingData data, List<Float> previousData) {
            this.data = data;
            this.previousData = previousData == null ? Collections.emptyList() : previousData;
        }

        public CsRangingData getData() {
            return data;
        }

        public List<Float> getPreviousData() {
            return previousData;
        }
    }

    class OnError implements RangingSessionAction {
        private final SessionCloseReasonProvider reason;

        public OnError(SessionCloseReasonProvider reason) {
            this.reason = reason;
        }

        public SessionCloseReasonProvider getReason() {
            return reason;
        }
    }

    class OnClosed implements RangingSessionAction {
        public static final OnClosed INSTANCE = new OnClosed();
        private OnClosed() {}
    }

    class OnRestarting implements RangingSessionAction {
        public static final OnRestarting INSTANCE = new OnRestarting();
        private OnRestarting() {}
    }
}
