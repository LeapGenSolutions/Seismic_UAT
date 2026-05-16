import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  contextualTourActions,
  getContextualTourState,
} from "../stores/contextualTourStore";

const routeKeyFrom = (route = "/") => route.split("?")[0].split("#")[0] || "/";

export const usePersistentPageState = (key, initialValue, options = {}) => {
  const [location] = useLocation();
  const initialValueRef = useRef(initialValue);
  const routeKey = routeKeyFrom(options.route || location);
  const storageKey = `${options.scope || routeKey}:${key}`;

  const [value, setValue] = useState(() => {
    const savedValue = getContextualTourState().sessions?.[routeKey]?.[storageKey];
    return savedValue === undefined ? initialValueRef.current : savedValue;
  });

  useEffect(() => {
    const savedValue = getContextualTourState().sessions?.[routeKey]?.[storageKey];
    setValue(savedValue === undefined ? initialValueRef.current : savedValue);
  }, [routeKey, storageKey]);

  const setPersistentValue = useCallback(
    (nextValueOrUpdater) => {
      setValue((currentValue) => {
        const nextValue =
          typeof nextValueOrUpdater === "function"
            ? nextValueOrUpdater(currentValue)
            : nextValueOrUpdater;

        contextualTourActions.saveRouteSession(routeKey, {
          [storageKey]: nextValue,
        });

        return nextValue;
      });
    },
    [routeKey, storageKey]
  );

  return [value, setPersistentValue];
};

export default usePersistentPageState;
