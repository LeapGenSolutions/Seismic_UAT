import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { getContextualTourPageConfig } from "../../lib/contextualTourPages";
import {
  captureCurrentPageSession,
  usePersistentForms,
} from "../../hooks/usePersistentForms";
import useFlowNavigation from "../../hooks/useFlowNavigation";
import {
  contextualTourActions,
  useContextualTourStore,
} from "../../stores/contextualTourStore";
import FloatingTourAssistant from "./FloatingTourAssistant";

const TourContext = createContext(null);
const getCurrentRoute = () => {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

export const TourProvider = ({ children }) => {
  const [location] = useLocation();
  const tour = useContextualTourStore((state) => state.tour);
  const pageConfig = getContextualTourPageConfig(location);
  const flowNavigation = useFlowNavigation();

  usePersistentForms(location);

  useEffect(() => {
    if (!tour.active && flowNavigation.flow?.type === "contextual-tour") {
      flowNavigation.exitFlow();
    }
  }, [flowNavigation, tour.active]);

  useEffect(() => {
    // Route changes update the assistant copy without forcing navigation or
    // resetting the active tour session. The flow history is built from the
    // route path the user actually takes.
    if (tour.active) {
      contextualTourActions.setRoute(location);
      if (flowNavigation.isActive && flowNavigation.flow?.dynamicHistory) {
        flowNavigation.syncRoute(location);
      } else {
        flowNavigation.startFlow([], {
          id: "contextual-enterprise-tour",
          name: "Seismic contextual tour",
          type: "contextual-tour",
          dynamicHistory: true,
          currentRoute: getCurrentRoute(),
          navigateOnStart: false,
          sessionData: captureCurrentPageSession(location),
        });
      }
    }
  }, [flowNavigation, location, tour.active]);

  const startTour = useCallback(() => {
    contextualTourActions.startTour(location);
    flowNavigation.startFlow([], {
      id: "contextual-enterprise-tour",
      name: "Seismic contextual tour",
      type: "contextual-tour",
      dynamicHistory: true,
      currentRoute: getCurrentRoute(),
      navigateOnStart: false,
      sessionData: captureCurrentPageSession(location),
    });
  }, [flowNavigation, location]);

  const goBackPage = useCallback(() => {
    flowNavigation.goBack(captureCurrentPageSession(location));
  }, [flowNavigation, location]);

  const goNextPage = useCallback(() => {
    flowNavigation.goNext(captureCurrentPageSession(location));
  }, [flowNavigation, location]);

  const stopTour = useCallback(() => {
    captureCurrentPageSession(location);
    flowNavigation.exitFlow();
    contextualTourActions.stopTour();
  }, [flowNavigation, location]);

  const value = useMemo(
    () => ({
      tour,
      pageConfig,
      currentRoute: location,
      flow: flowNavigation.flow,
      canGoBackPage: flowNavigation.canGoBack,
      canGoNextPage: flowNavigation.canGoNext,
      startTour,
      stopTour,
      goBackPage,
      goNextPage,
      setMinimized: contextualTourActions.setMinimized,
      setSelectedFeatureIndex: contextualTourActions.setSelectedFeatureIndex,
      setPanelPosition: contextualTourActions.setPanelPosition,
    }),
    [
      flowNavigation.canGoBack,
      flowNavigation.canGoNext,
      flowNavigation.flow,
      location,
      pageConfig,
      startTour,
      stopTour,
      goBackPage,
      goNextPage,
      tour,
    ]
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      <FloatingTourAssistant />
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);

  if (!context) {
    throw new Error("useTour must be used within TourProvider");
  }

  return context;
};

export default TourProvider;
