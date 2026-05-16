import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

const FLOW_STORAGE_KEY = "seismic:active-flow";
const FLOW_CHANGED_EVENT = "seismic:flow-changed";

const createFlowId = () =>
  `flow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getCurrentUrl = () => {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

const getCurrentHistoryState = () => {
  if (typeof window === "undefined") return undefined;
  return window.history.state?.state ?? window.history.state ?? undefined;
};

const cloneNavigationState = (state) => {
  if (!state || typeof state !== "object") return state;

  try {
    return JSON.parse(JSON.stringify(state));
  } catch {
    return undefined;
  }
};

const parseRoute = (route = "/") => {
  const [pathAndSearch, hash = ""] = String(route || "/").split("#");
  const [pathname = "/", search = ""] = pathAndSearch.split("?");

  return {
    pathname: pathname || "/",
    search,
    hash: hash ? `#${hash}` : "",
  };
};

const normalizePath = (route = "/") => parseRoute(route).pathname || "/";

const normalizeStep = (step) => {
  if (typeof step === "string") {
    return { path: step, label: step };
  }

  return {
    path: step?.path || step?.href || "/",
    label: step?.label || step?.title || step?.path || "",
    state: cloneNavigationState(step?.state),
  };
};

const createRouteStep = (route = getCurrentUrl(), state = getCurrentHistoryState()) => {
  const path = route || "/";
  return {
    path,
    label: normalizePath(path),
    state: cloneNavigationState(state),
  };
};

const readFlow = () => {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(FLOW_STORAGE_KEY);
    if (!stored) return null;

    const flow = JSON.parse(stored);
    if (!Array.isArray(flow.steps) || flow.steps.length === 0) return null;

    return {
      ...flow,
      index: Math.min(Math.max(Number(flow.index) || 0, 0), flow.steps.length - 1),
      currentRouteHistoryIndex: Math.min(
        Math.max(Number(flow.currentRouteHistoryIndex ?? flow.index) || 0, 0),
        flow.steps.length - 1
      ),
      dynamicHistory: flow.dynamicHistory === true,
      steps: flow.steps.map(normalizeStep),
      routeSession: flow.routeSession && typeof flow.routeSession === "object"
        ? flow.routeSession
        : {},
      sessionData: flow.sessionData && typeof flow.sessionData === "object"
        ? flow.sessionData
        : {},
    };
  } catch (error) {
    console.error("Failed to read active flow:", error);
    return null;
  }
};

const notifyFlowChanged = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FLOW_CHANGED_EVENT));
};

const writeFlow = (flow) => {
  if (typeof window === "undefined") return;

  try {
    if (flow) {
      window.localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(flow));
    } else {
      window.localStorage.removeItem(FLOW_STORAGE_KEY);
      window.sessionStorage.removeItem(FLOW_STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to persist active flow:", error);
  }

  notifyFlowChanged();
};

const mergeQueryParams = (targetRoute, preserveQuery) => {
  const target = parseRoute(targetRoute);

  if (!preserveQuery || typeof window === "undefined") {
    return `${target.pathname}${target.search ? `?${target.search}` : ""}${target.hash}`;
  }

  const currentParams = new URLSearchParams(window.location.search);
  const targetParams = new URLSearchParams(target.search);

  currentParams.forEach((value, key) => {
    if (!targetParams.has(key)) {
      targetParams.set(key, value);
    }
  });

  const query = targetParams.toString();
  return `${target.pathname}${query ? `?${query}` : ""}${target.hash}`;
};

const navigateToRoute = (navigate, step, preserveQuery) => {
  const targetPath = mergeQueryParams(step.path, preserveQuery);

  if (step.state && typeof step.state === "object") {
    navigate(targetPath, { state: step.state });
    return;
  }

  navigate(targetPath);
};

const collectCurrentSessionData = () => {
  if (typeof window === "undefined") return {};

  const query = {};
  new URLSearchParams(window.location.search).forEach((value, key) => {
    query[key] = value;
  });

  return {
    lastPath: getCurrentUrl(),
    query,
    updatedAt: new Date().toISOString(),
  };
};

const findStepIndexForRoute = (steps = [], route = "/") => {
  const pathname = normalizePath(route);
  const exactIndex = steps.findIndex((step) => normalizePath(step.path) === pathname);
  if (exactIndex >= 0) return exactIndex;

  return steps.findIndex((step) => {
    const stepPath = normalizePath(step.path);
    return stepPath !== "/" && pathname.startsWith(`${stepPath}/`);
  });
};

export const getActiveFlow = readFlow;

export const clearActiveFlow = () => writeFlow(null);

export const saveFlowSessionData = (route, data = {}) => {
  const flow = readFlow();
  if (!flow) return;

  const routeKey = normalizePath(route || getCurrentUrl());

  writeFlow({
    ...flow,
    sessionData: {
      ...flow.sessionData,
      ...data,
    },
    routeSession: {
      ...flow.routeSession,
      [routeKey]: {
        ...(flow.routeSession?.[routeKey] || {}),
        ...collectCurrentSessionData(),
        ...data,
      },
    },
  });
};

export const useFlowNavigation = () => {
  const [location, navigate] = useLocation();
  const [flow, setFlow] = useState(() => readFlow());

  useEffect(() => {
    const handleFlowChanged = () => setFlow(readFlow());
    const handleStorage = (event) => {
      if (event.key === FLOW_STORAGE_KEY || event.key === null) {
        handleFlowChanged();
      }
    };

    window.addEventListener(FLOW_CHANGED_EVENT, handleFlowChanged);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(FLOW_CHANGED_EVENT, handleFlowChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const activeStep = flow?.steps?.[flow.index] || null;
  const isActive = Boolean(flow);
  const canGoBack = Boolean(flow && flow.index > 0);
  const canGoNext = Boolean(flow && flow.index < flow.steps.length - 1);

  const syncRoute = useCallback((route = location) => {
    const currentFlow = readFlow();
    if (!currentFlow) return null;

    const currentRoute = route === location ? getCurrentUrl() : route;
    const currentRouteKey = normalizePath(currentRoute);
    const currentState = getCurrentHistoryState();

    if (currentFlow.dynamicHistory) {
      const currentStep = currentFlow.steps[currentFlow.index];
      const isSameConsecutiveRoute = currentStep?.path === currentRoute;

      if (isSameConsecutiveRoute) {
        const nextFlow = {
          ...currentFlow,
          currentRouteHistoryIndex: currentFlow.index,
          steps: currentFlow.steps.map((step, stepIndex) =>
            stepIndex === currentFlow.index
              ? { ...step, state: cloneNavigationState(currentState) }
              : step
          ),
          routeSession: {
            ...currentFlow.routeSession,
            [currentRouteKey]: {
              ...(currentFlow.routeSession?.[currentRouteKey] || {}),
              ...collectCurrentSessionData(),
            },
          },
        };

        writeFlow(nextFlow);
        return nextFlow;
      }

      const matchingIndex = currentFlow.steps.findIndex((step) => step.path === currentRoute);
      const nextSteps =
        matchingIndex >= 0
          ? currentFlow.steps
          : [
              ...currentFlow.steps.slice(0, currentFlow.index + 1),
              createRouteStep(currentRoute, currentState),
            ];
      const nextIndex = matchingIndex >= 0 ? matchingIndex : nextSteps.length - 1;

      const nextFlow = {
        ...currentFlow,
        index: nextIndex,
        currentRouteHistoryIndex: nextIndex,
        steps: nextSteps,
        routeSession: {
          ...currentFlow.routeSession,
          [currentRouteKey]: {
            ...(currentFlow.routeSession?.[currentRouteKey] || {}),
            ...collectCurrentSessionData(),
          },
        },
      };

      writeFlow(nextFlow);
      return nextFlow;
    }

    const matchingIndex = findStepIndexForRoute(currentFlow.steps, currentRoute);
    if (matchingIndex < 0 || matchingIndex === currentFlow.index) {
      return currentFlow;
    }

    const nextFlow = {
      ...currentFlow,
      index: matchingIndex,
      currentRouteHistoryIndex: matchingIndex,
      routeSession: {
        ...currentFlow.routeSession,
        [currentRouteKey]: {
          ...(currentFlow.routeSession?.[currentRouteKey] || {}),
          ...collectCurrentSessionData(),
        },
      },
    };

    writeFlow(nextFlow);
    return nextFlow;
  }, [location]);

  const startFlow = useCallback(
    (steps, options = {}) => {
      const dynamicHistory = options.dynamicHistory === true;
      const currentRoute = options.currentRoute || getCurrentUrl();
      const normalizedSteps = Array.isArray(steps)
        ? steps.map(normalizeStep).filter((step) => step.path)
        : [];

      if (normalizedSteps.length === 0 && !dynamicHistory) return;

      const flowSteps =
        normalizedSteps.length > 0
          ? normalizedSteps
          : [createRouteStep(currentRoute, getCurrentHistoryState())];

      const routeIndex = dynamicHistory
        ? flowSteps.findIndex((step) => step.path === currentRoute)
        : findStepIndexForRoute(flowSteps, currentRoute);
      const initialIndex = routeIndex >= 0
        ? routeIndex
        : Math.min(Math.max(Number(options.initialIndex) || 0, 0), flowSteps.length - 1);
      const newFlow = {
        id: options.id || createFlowId(),
        name: options.name || "Guided flow",
        type: options.type || "flow",
        dynamicHistory,
        steps: flowSteps,
        index: initialIndex,
        currentRouteHistoryIndex: initialIndex,
        returnTo: options.returnTo || getCurrentUrl(),
        preserveQuery: options.preserveQuery === true,
        sessionData: {
          ...collectCurrentSessionData(),
          ...(options.sessionData || {}),
        },
        routeSession: {
          [normalizePath(location)]: {
            ...collectCurrentSessionData(),
            ...(options.sessionData || {}),
          },
        },
      };

      writeFlow(newFlow);

      if (options.navigateOnStart) {
        navigateToRoute(navigate, flowSteps[initialIndex], newFlow.preserveQuery);
      }
    },
    [location, navigate]
  );

  const goToStep = useCallback(
    (nextIndex, data = {}) => {
      const currentFlow = readFlow();
      if (!currentFlow) return;

      const boundedIndex = Math.min(
        Math.max(nextIndex, 0),
        currentFlow.steps.length - 1
      );
      const currentRouteKey = normalizePath(getCurrentUrl());
      const nextStep = currentFlow.steps[boundedIndex];
      const nextFlow = {
        ...currentFlow,
        index: boundedIndex,
        currentRouteHistoryIndex: boundedIndex,
        sessionData: {
          ...currentFlow.sessionData,
          ...data,
        },
        routeSession: {
          ...currentFlow.routeSession,
          [currentRouteKey]: {
            ...(currentFlow.routeSession?.[currentRouteKey] || {}),
            ...collectCurrentSessionData(),
            ...data,
          },
        },
      };

      writeFlow(nextFlow);
      navigateToRoute(navigate, nextStep, currentFlow.preserveQuery);
    },
    [navigate]
  );

  const goBack = useCallback(
    (data) => {
      const currentFlow = readFlow();
      if (!currentFlow || currentFlow.index <= 0) return;
      goToStep(currentFlow.index - 1, data);
    },
    [goToStep]
  );

  const goNext = useCallback(
    (data) => {
      const currentFlow = readFlow();
      if (!currentFlow || currentFlow.index >= currentFlow.steps.length - 1) return;
      goToStep(currentFlow.index + 1, data);
    },
    [goToStep]
  );

  const exitFlow = useCallback(() => {
    writeFlow(null);
  }, []);

  return useMemo(
    () => ({
      activeStep,
      canGoBack,
      canGoNext,
      exitFlow,
      flow,
      goBack,
      goNext,
      goToStep,
      isActive,
      saveSessionData: saveFlowSessionData,
      startFlow,
      syncRoute,
    }),
    [
      activeStep,
      canGoBack,
      canGoNext,
      exitFlow,
      flow,
      goBack,
      goNext,
      goToStep,
      isActive,
      startFlow,
      syncRoute,
    ]
  );
};

export default useFlowNavigation;
