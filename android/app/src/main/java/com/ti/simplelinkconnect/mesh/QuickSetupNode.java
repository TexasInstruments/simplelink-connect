package com.ti.simplelinkconnect.mesh;

import static com.ti.simplelinkconnect.mesh.MeshTask.TaskType.BIND;
import static com.ti.simplelinkconnect.mesh.MeshTask.TaskType.SEND_APPLICATION_KEY;
import static com.ti.simplelinkconnect.mesh.MeshTask.TaskType.SET_PUBLICATION;
import static com.ti.simplelinkconnect.mesh.MeshTask.TaskType.SUBSCRIBE;

import android.util.Log;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;

import no.nordicsemi.android.mesh.ApplicationKey;
import no.nordicsemi.android.mesh.Group;
import no.nordicsemi.android.mesh.MeshManagerApi;
import no.nordicsemi.android.mesh.MeshStatusCallbacks;
import no.nordicsemi.android.mesh.NetworkKey;
import no.nordicsemi.android.mesh.transport.ConfigModelAppStatus;
import no.nordicsemi.android.mesh.transport.ConfigStatusMessage;
import no.nordicsemi.android.mesh.transport.ControlMessage;
import no.nordicsemi.android.mesh.transport.Element;
import no.nordicsemi.android.mesh.transport.MeshMessage;
import no.nordicsemi.android.mesh.transport.MeshModel;
import no.nordicsemi.android.mesh.transport.ProvisionedMeshNode;
import no.nordicsemi.android.mesh.utils.MeshParserUtils;

public class QuickSetupNode implements MeshStatusCallbacks {

    private ProvisionedMeshNode node;
    private final List<MeshTask> tasks = new ArrayList<>();
    private int current = -1;
    private boolean inProgress = false;
    private final ArrayList<TaskResult> taskResults = new ArrayList<>();

    private final MeshManagerApi meshManagerApi;
    private CompletionListener completionListener;


    public QuickSetupNode(MeshManagerApi meshManagerApi) {
        this.meshManagerApi = meshManagerApi;
    }

    public void setCompletionListener(CompletionListener listener) {
        this.completionListener = listener;
    }

    public WritableArray bindAppKeyToListModels(int nodeUnicastAddress, int applicationKeyIndex, Map<Integer, List<MeshModel>> models) {
        CompletableFuture<WritableArray> future = new CompletableFuture<>();
        initiateParams();

        this.node = meshManagerApi.getMeshNetwork().getNode(nodeUnicastAddress);
        if (node == null) {
            Log.e("QuickSetupNode", "Node not found in network.");
            WritableArray resultArray = new WritableNativeArray();
            resultArray.pushMap(createTaskResult("Node not found", false));
            return resultArray;
        }

        ApplicationKey selectedAppKey = meshManagerApi.getMeshNetwork().getAppKeys().get(applicationKeyIndex);
        NetworkKey primaryNetKey = meshManagerApi.getMeshNetwork().getPrimaryNetworkKey();

        // Add App Key if not already present
        if (!MeshParserUtils.isNodeKeyExists(node.getAddedAppKeys(), applicationKeyIndex)) {
            tasks.add(new MeshTask(SEND_APPLICATION_KEY, primaryNetKey, selectedAppKey));
        }

        for (Map.Entry<Integer, List<MeshModel>> entry : models.entrySet()) {
            int elementAddress = entry.getKey();
            List<MeshModel> modelList = entry.getValue();

            for (MeshModel model : modelList) {
                // Bind each model
                tasks.add(new MeshTask(BIND, elementAddress, model.getModelId(), applicationKeyIndex, model.getModelName()));
            }
        }

        this.inProgress = true;
        Log.i("QuickSetupNode", "Starting " + tasks.size() + " tasks");
        // Set up completion listener
        this.completionListener = results -> {
            WritableArray resultArray = new WritableNativeArray();

            for (TaskResult result : results) {
                resultArray.pushMap(createTaskResult(result.getTaskTitle(), result.isSuccess()));
            }

            future.complete(resultArray);
        };

        executeNext();

        try {
            return future.get();  // Block until completion
        } catch (Exception e) {
            WritableArray resultArray = new WritableNativeArray();
            resultArray.pushMap(createTaskResult("Execution error: " + e.getMessage(), false));
            return resultArray;
        }

    }

    public WritableArray subscribeToListModels(int nodeUnicastAddress, int groupAddress, Map<Integer, List<MeshModel>> models) {
        CompletableFuture<WritableArray> future = new CompletableFuture<>();
        initiateParams();

        this.node = meshManagerApi.getMeshNetwork().getNode(nodeUnicastAddress);
        if (node == null) {
            Log.e("QuickSetupNode", "Node not found in network.");
            WritableArray resultArray = new WritableNativeArray();
            resultArray.pushMap(createTaskResult("Node not found", false));
            return resultArray;
        }

        Group selectedGroup = meshManagerApi.getMeshNetwork().getGroup(groupAddress);
        NetworkKey primaryNetKey = meshManagerApi.getMeshNetwork().getPrimaryNetworkKey();

        for (Map.Entry<Integer, List<MeshModel>> entry : models.entrySet()) {
            int elementAddress = entry.getKey();
            List<MeshModel> modelList = entry.getValue();

            for (MeshModel model : modelList) {
                // Bind each model
                tasks.add(new MeshTask(SUBSCRIBE, elementAddress, selectedGroup.getAddress(), model.getModelId(), model.getModelName()));
            }
        }

        this.inProgress = true;
        Log.i("QuickSetupNode", "Starting " + tasks.size() + " tasks");
        // Set up completion listener
        this.completionListener = results -> {
            WritableArray resultArray = new WritableNativeArray();

            for (TaskResult result : results) {
                resultArray.pushMap(createTaskResult(result.getTaskTitle(), result.isSuccess()));
            }

            future.complete(resultArray);
        };

        executeNext();

        try {
            return future.get();  // Block until completion
        } catch (Exception e) {
            WritableArray resultArray = new WritableNativeArray();
            resultArray.pushMap(createTaskResult("Execution error: " + e.getMessage(), false));
            return resultArray;
        }

    }

    public WritableArray setPublicationToListModels(int nodeUnicastAddress, int groupAddress, Map<Integer, List<MeshModel>> models,
                                                    int appKeyIndex, int publishTtl, int publishPeriodInterval, String publishPeriodResolution,
                                                    int retransmitCount, int retransmitInterval) {
        CompletableFuture<WritableArray> future = new CompletableFuture<>();

        initiateParams();

        this.node = meshManagerApi.getMeshNetwork().getNode(nodeUnicastAddress);
        if (node == null) {
            Log.e("QuickSetupNode", "Node not found in network.");
            WritableArray resultArray = new WritableNativeArray();
            resultArray.pushMap(createTaskResult("Node not found", false));
            return resultArray;
        }
        ApplicationKey selectedAppKey = meshManagerApi.getMeshNetwork().getAppKeys().get(appKeyIndex);
        NetworkKey primaryNetKey = meshManagerApi.getMeshNetwork().getPrimaryNetworkKey();

        // Add App Key if not already present
        if (!MeshParserUtils.isNodeKeyExists(node.getAddedAppKeys(), appKeyIndex)) {
            tasks.add(new MeshTask(SEND_APPLICATION_KEY, primaryNetKey, selectedAppKey));
        }

        for (Map.Entry<Integer, List<MeshModel>> entry : models.entrySet()) {
            int elementAddress = entry.getKey();
            List<MeshModel> modelList = entry.getValue();
            Element currentElement = node.getElements().get(elementAddress);

            for (MeshModel model : modelList) {

                // Bind app key to model
                if (!model.getBoundAppKeyIndexes().contains(appKeyIndex)) {
                    tasks.add(new MeshTask(BIND, elementAddress, model.getModelId(), appKeyIndex, model.getModelName()));
                }

                PublicationSettingsHelper publicationSettings = new PublicationSettingsHelper(currentElement, model);
                publicationSettings.setAppKeyIndex(appKeyIndex);
                publicationSettings.setPublishTtl(publishTtl);
                publicationSettings.setPublishAddress(groupAddress);
                publicationSettings.setPublicationPeriodResolutionResource(publishPeriodInterval, publishPeriodResolution);
                publicationSettings.setRetransmitCount(retransmitCount);
                publicationSettings.setRetransmitIntervalSteps(retransmitInterval);
                tasks.add(new MeshTask(SET_PUBLICATION, publicationSettings, model.getModelName()));
            }
        }

        this.inProgress = true;
        Log.i("QuickSetupNode", "Starting " + tasks.size() + " tasks");
        // Set up completion listener
        this.completionListener = results -> {
            WritableArray resultArray = new WritableNativeArray();

            for (TaskResult result : results) {
                resultArray.pushMap(createTaskResult(result.getTaskTitle(), result.isSuccess()));
            }

            future.complete(resultArray);
        };

        executeNext();

        try {
            return future.get();  // Block until completion
        } catch (Exception e) {
            WritableArray resultArray = new WritableNativeArray();
            resultArray.pushMap(createTaskResult("Execution error: " + e.getMessage(), false));
            return resultArray;
        }

    }

    public void initiateParams() {
        this.taskResults.clear();
        this.tasks.clear();
        this.current = -1;
        this.inProgress = false;
    }

    public interface CompletionListener {
        void onComplete(List<TaskResult> results);
    }

    private WritableMap createTaskResult(String taskTitle, boolean success) {
        WritableMap map = new WritableNativeMap();
        map.putString("task", taskTitle);
        map.putBoolean("success", success);
        return map;
    }


    private void executeNext() {
        current++;

        if (current >= tasks.size() || !inProgress) {
            inProgress = false;
            Log.i("QuickSetupNode", "Configuration Complete");
            if (completionListener != null) {
                completionListener.onComplete(taskResults);
            }
            return;
        }

        MeshTask task = tasks.get(current);
        MeshMessage message = task.getMessage();

        if (message != null) {
            try {
                meshManagerApi.createMeshPdu(this.node.getUnicastAddress(), message);
            } catch (Exception e) {
                Log.e("QuickSetupNode", "Failed to send message: " + e.getMessage());
                taskResults.add(new TaskResult("Failed to send: " + task.getTitle(), false));
                executeNext();
            }
        }
    }

    @Override
    public void onMeshMessageProcessed(int dst, @NonNull MeshMessage meshMessage) {
        Log.i("QuickSetupNode", "Message processed: " + meshMessage.getOpCode());
    }

    @Override
    public void onMeshMessageReceived(int src, @NonNull MeshMessage meshMessage) {
        Log.i("QuickSetupNode", "Message received from " + src + ": " + meshMessage.getOpCode());

        if (current >= 0 && current < tasks.size()) {
            boolean success = false;
            String statusString = "";

            if (meshMessage instanceof ConfigModelAppStatus) {
                final ConfigModelAppStatus status = (ConfigModelAppStatus) meshMessage;
                success = status.isSuccessful();
                statusString = status.getStatusCodeName();
            }

            if (meshMessage instanceof ConfigStatusMessage) {
                final ConfigStatusMessage status = (ConfigStatusMessage) meshMessage;
                success = status.getStatusCode() == 0x00;
                statusString = status.getStatusCodeName();
            }

            if (success) {
                taskResults.add(new TaskResult(tasks.get(current).getTitle(), success));
            }
            else {
                taskResults.add(new TaskResult(tasks.get(current).getTitle() + " Failed: " + statusString, success));
            }

            executeNext();
        }
    }

    @Override
    public void onTransactionFailed(int dst, boolean hasIncompleteTimerExpired) {
        inProgress = false;
        Log.e("QuickSetupNode", "Transaction failed.");
    }

    @Override
    public void onUnknownPduReceived(int src, byte[] accessPayload) {
        Log.w("QuickSetupNode", "Unknown PDU received.");
    }

    @Override
    public void onBlockAcknowledgementProcessed(int dst, @NonNull ControlMessage message) {
    }

    @Override
    public void onBlockAcknowledgementReceived(int src, @NonNull ControlMessage message) {
    }

    @Override
    public void onMessageDecryptionFailed(String meshLayer, String errorMessage) {
        Log.e("QuickSetupNode", "Decryption failed: " + errorMessage);
    }

    private static class TaskResult {
        private final String taskTitle;
        private final boolean success;

        public TaskResult(String taskTitle, boolean success) {
            this.taskTitle = taskTitle;
            this.success = success;
        }

        public String getTaskTitle() {
            return taskTitle;
        }

        public boolean isSuccess() {
            return success;
        }
    }
}
