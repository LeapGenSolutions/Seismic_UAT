import { useSyncExternalStore } from "react";

const STORAGE_KEY = "seismic:contextual-tour-store";

const defaultState = {
  tour: {
    active: false,
    minimized: false,
    selectedFeatureIndex: 0,
    featureIndexByRoute: {},
    lastRoute: "/",
    panelPosition: null,
  },
  forms: {},
  sessions: {},
};

// A tiny Zustand-style external store: React subscribes through
// useSyncExternalStore, while the full state is persisted to localStorage.
const canUseStorage = () =>
  typeof window !== "undefined" && Boolean(window.localStorage);

const readState = () => {
  if (!canUseStorage()) return defaultState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;

    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      tour: {
        ...defaultState.tour,
        ...(parsed.tour || {}),
        active: false,
        minimized: false,
      },
      forms: parsed.forms || {},
      sessions: parsed.sessions || {},
    };
  } catch (error) {
    console.error("Failed to read contextual tour store:", error);
    return defaultState;
  }
};

let state = readState();
const listeners = new Set();

const persist = () => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to persist contextual tour store:", error);
  }
};

const emit = () => {
  persist();
  listeners.forEach((listener) => listener());
};

export const getContextualTourState = () => state;

export const setContextualTourState = (updater) => {
  const nextState =
    typeof updater === "function" ? updater(state) : { ...state, ...updater };

  state = {
    ...defaultState,
    ...nextState,
    tour: {
      ...defaultState.tour,
      ...(nextState.tour || {}),
    },
    forms: nextState.forms || {},
    sessions: nextState.sessions || {},
  };

  emit();
  return state;
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useContextualTourStore = (selector = (currentState) => currentState) =>
  useSyncExternalStore(subscribe, () => selector(state), () => selector(defaultState));

export const contextualTourActions = {
  startTour(route = "/") {
    return setContextualTourState((currentState) => ({
      ...currentState,
      tour: {
        ...currentState.tour,
        active: true,
        minimized: false,
        selectedFeatureIndex: currentState.tour.featureIndexByRoute?.[route] || 0,
        lastRoute: route,
        featureIndexByRoute: {
          ...(currentState.tour.featureIndexByRoute || {}),
          [route]: currentState.tour.featureIndexByRoute?.[route] || 0,
        },
      },
    }));
  },

  stopTour() {
    return setContextualTourState((currentState) => ({
      ...currentState,
      tour: {
        ...currentState.tour,
        active: false,
        minimized: false,
        selectedFeatureIndex: 0,
      },
    }));
  },

  setRoute(route) {
    return setContextualTourState((currentState) => ({
      ...currentState,
      tour: {
        ...currentState.tour,
        lastRoute: route,
        selectedFeatureIndex:
          currentState.tour.lastRoute === route
            ? currentState.tour.selectedFeatureIndex
            : currentState.tour.featureIndexByRoute?.[route] || 0,
        featureIndexByRoute: {
          ...(currentState.tour.featureIndexByRoute || {}),
          [currentState.tour.lastRoute]: currentState.tour.selectedFeatureIndex || 0,
        },
      },
    }));
  },

  setSelectedFeatureIndex(index) {
    return setContextualTourState((currentState) => ({
      ...currentState,
      tour: {
        ...currentState.tour,
        selectedFeatureIndex: Math.max(0, Number(index) || 0),
        featureIndexByRoute: {
          ...(currentState.tour.featureIndexByRoute || {}),
          [currentState.tour.lastRoute || "/"]: Math.max(0, Number(index) || 0),
        },
      },
    }));
  },

  setMinimized(minimized) {
    return setContextualTourState((currentState) => ({
      ...currentState,
      tour: {
        ...currentState.tour,
        minimized: Boolean(minimized),
      },
    }));
  },

  setPanelPosition(panelPosition) {
    return setContextualTourState((currentState) => ({
      ...currentState,
      tour: {
        ...currentState.tour,
        panelPosition,
      },
    }));
  },

  saveFormField(route, fieldKey, value) {
    return setContextualTourState((currentState) => ({
      ...currentState,
      forms: {
        ...currentState.forms,
        [route]: {
          ...(currentState.forms[route] || {}),
          [fieldKey]: {
            value,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    }));
  },

  saveRouteSession(route, data = {}) {
    return setContextualTourState((currentState) => ({
      ...currentState,
      sessions: {
        ...currentState.sessions,
        [route]: {
          ...(currentState.sessions?.[route] || {}),
          ...data,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  },

  clearRouteForm(route) {
    return setContextualTourState((currentState) => {
      const nextForms = { ...currentState.forms };
      delete nextForms[route];

      return {
        ...currentState,
        forms: nextForms,
      };
    });
  },
};
