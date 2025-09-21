import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons, MaterialIcons, Octicons } from "@expo/vector-icons";
import Colors from "../../../constants/Colors"; // Update if necessary
import { Element, Model } from "../meshUtils";
import { meshStyles } from "../meshUtils";

interface ModelSelectionListProps {
    elements: Element[];
    selectedModels: { modelId: number; elementId: number; modelType: string }[];
    setSelectedModels: React.Dispatch<
        React.SetStateAction<{ modelId: number; elementId: number; modelType: string }[]>
    >;
    disabledModels: Model[];
}

const ModelSelectionList: React.FC<ModelSelectionListProps> = ({
    elements,
    selectedModels,
    setSelectedModels,
    disabledModels
}) => {
    const toggleModelSelection = (elementId: number, modelId: number, modelType: string) => {
        setSelectedModels((prev) => {
            const exists = prev.some(
                (item) => item.elementId === elementId && item.modelId === modelId && item.modelType === modelType
            );
            if (exists) {
                return prev.filter(
                    (item) => !(item.elementId === elementId && item.modelId === modelId && item.modelType === modelType)
                ); // Remove if already selected
            } else {
                return [...prev, { elementId, modelId, modelType }]; // Add if not selected
            }
        });
    };

    const toggleSelectAllModels = (element: Element) => {
        const allSelectableModels = element.models.filter((model) => !(disabledModels.find((m) => m.id == model.id) && model.type === "Bluetooth SIG"));

        const allSelected = allSelectableModels.every((model) =>
            selectedModels.some((item) => item.elementId === element.address && item.modelId === model.id && item.modelType === model.type)
        );

        setSelectedModels((prev) => {
            if (allSelected) {
                // Deselect all models of this element (excluding disabled ones)
                return prev.filter((item) => item.elementId !== element.address && disabledModels.find((m) => m.id == item.modelId));
            } else {
                // Select only non-disabled models
                const newModels = allSelectableModels.map((model) => ({
                    elementId: element.address,
                    modelId: model.id,
                    modelType: model.type,
                }));

                return [...prev, ...newModels.filter((m) => !prev.some((p) => p.modelId === m.modelId && p.elementId === m.elementId && p.modelType === m.modelType))];
            }
        });
    };


    const isModelSelected = (elementId: number, modelId: number, modelType: string) => {
        return selectedModels.some((item) => item.elementId === elementId && item.modelId === modelId && item.modelType === modelType);
    };

    return (
        <>
            {elements.map((element, index) => (
                <View key={index}>
                    <View style={styles.row}>
                        <Text style={styles.elementText}>
                            {element.name} (0x{element.address.toString(16)})
                        </Text>

                        <TouchableOpacity onPress={() => toggleSelectAllModels(element)} style={styles.selectAllButton}>
                            <Text style={meshStyles.textButton}>Select All</Text>
                        </TouchableOpacity>
                    </View>

                    {element.models.map((model, modelIndex) => {
                        const isSelected = isModelSelected(element.address, model.id, model.type);
                        const disabled = disabledModels.find((m) => m.id == model.id) && model.type == "Bluetooth SIG";
                        return (
                            <TouchableOpacity
                                disabled={disabled}
                                key={modelIndex}
                                style={[styles.dataContainer, isSelected ? styles.selectedModel : null, { opacity: disabled ? 0.5 : 1 }]}
                                onPress={() => toggleModelSelection(element.address, model.id, model.type)}
                            >
                                {isSelected ? (
                                    <MaterialCommunityIcons name="check-circle" size={20} color={Colors.blue} />
                                ) : (
                                    <MaterialIcons name="circle" size={20} color={Colors.lightGray} />
                                )}
                                <Text style={[styles.modelText, isSelected ? styles.selectedText : {}]}>
                                    {model.name} 0x{model.id.toString(16)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        alignItems: "center",
    },
    elementText: {
        marginBottom: 5,
        fontWeight: "600",
        color: Colors.gray,
        fontSize: 14,
    },
    selectAllButton: {
        marginBottom: 10,
    },
    dataContainer: {
        backgroundColor: "white",
        borderRadius: 10,
        marginBottom: 5,
        height: 40,
        paddingHorizontal: 10,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
    },
    selectedModel: {
        backgroundColor: "#D0E8FF", // Light blue when selected
    },
    modelText: {
        marginLeft: 5,
    },
    selectedText: {
        fontWeight: "bold",
        color: Colors.blue,
    },
});

export default ModelSelectionList;
