package com.ti.simplelinkconnect.mesh;

import java.util.ArrayList;
import java.util.List;

public class ObservableVariable<T> {
    private T value;
    private final List<VariableChangeListener<T>> listeners = new ArrayList<>();

    public ObservableVariable(T initialValue) {
        this.value = initialValue;
    }

    public T getValue() {
        return value;
    }

    public void setValue(T newValue) {
        if ((value == null && newValue != null) || (value != null && !value.equals(newValue))) {
            this.value = newValue;
            notifyListeners(newValue);
        }
    }

    public void addListener(VariableChangeListener<T> listener) {
        listeners.add(listener);
    }

    public void removeListener(VariableChangeListener<T> listener) {
        listeners.remove(listener);
    }

    private void notifyListeners(T newValue) {
        for (VariableChangeListener<T> listener : listeners) {
            listener.onChange(newValue);
        }
    }

    public interface VariableChangeListener<T> {
        void onChange(T newValue);
    }
}
