import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  GripHorizontal,
  Lightbulb,
  Map,
  Minus,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { useTour } from "./TourProvider";

const defaultPosition = {
  x: typeof window !== "undefined" ? Math.max(16, window.innerWidth - 420) : 16,
  y: 96,
};

const queryTargets = (selector) => {
  if (!selector) return [];

  try {
    return Array.from(document.querySelectorAll(selector));
  } catch {
    return selector
      .split(",")
      .flatMap((part) => {
        try {
          return Array.from(document.querySelectorAll(part.trim()));
        } catch {
          return [];
        }
      });
  }
};

const clampPosition = (position) => {
  if (typeof window === "undefined") return position;

  return {
    x: Math.min(Math.max(12, position.x), Math.max(12, window.innerWidth - 360)),
    y: Math.min(Math.max(72, position.y), Math.max(72, window.innerHeight - 180)),
  };
};

const FloatingTourAssistant = () => {
  const {
    currentRoute,
    canGoBackPage,
    canGoNextPage,
    flow,
    goBackPage,
    goNextPage,
    pageConfig,
    setMinimized,
    setPanelPosition,
    setSelectedFeatureIndex,
    stopTour,
    tour,
  } = useTour();
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [highlightLabel, setHighlightLabel] = useState(null);
  const [highlightMessage, setHighlightMessage] = useState("");

  const features = pageConfig.features || [];
  const selectedFeatureIndex = Math.min(
    tour.selectedFeatureIndex || 0,
    Math.max(features.length - 1, 0)
  );
  const selectedFeature = features[selectedFeatureIndex];
  const position = clampPosition(tour.panelPosition || defaultPosition);

  const progressLabel = useMemo(() => {
    if (!features.length) return "No page notes";
    return `${selectedFeatureIndex + 1} of ${features.length}`;
  }, [features.length, selectedFeatureIndex]);
  const pageProgressLabel = flow?.steps?.length
    ? `${flow.index + 1} of ${flow.steps.length}`
    : "Free navigation";

  useEffect(() => {
    let frameId = null;

    const clearHighlights = () => {
      document
        .querySelectorAll(".tour-highlight-ring")
        .forEach((element) => element.classList.remove("tour-highlight-ring"));
      setHighlightLabel(null);
    };

    const syncHighlight = (shouldScroll = false) => {
      if (!tour.active || tour.minimized || !selectedFeature?.selector) {
        clearHighlights();
        return;
      }

      const targets = queryTargets(selectedFeature.selector).filter(
        (element) => element instanceof HTMLElement
      );

      document
        .querySelectorAll(".tour-highlight-ring")
        .forEach((element) => element.classList.remove("tour-highlight-ring"));

      if (targets.length === 0) {
        setHighlightLabel(null);
        setHighlightMessage(
          `Could not find "${selectedFeature.title}" on this page. The selector may need a data-tour attribute.`
        );
        return;
      }

      const primaryTarget = targets[0];
      targets.slice(0, 4).forEach((element) => element.classList.add("tour-highlight-ring"));

      if (shouldScroll) {
        primaryTarget.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }

      const rect = primaryTarget.getBoundingClientRect();
      setHighlightLabel({
        title: selectedFeature.title,
        x: Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - 240)),
        y: Math.max(12, rect.top - 34),
      });
      setHighlightMessage("");
    };

    const scheduleSync = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => syncHighlight(false));
    };

    document
      .querySelectorAll(".tour-highlight-ring")
      .forEach((element) => element.classList.remove("tour-highlight-ring"));

    if (!tour.active || tour.minimized || !selectedFeature?.selector) {
      setHighlightLabel(null);
      return undefined;
    }

    const timer = window.setTimeout(() => syncHighlight(true), 120);
    window.addEventListener("scroll", scheduleSync, true);
    window.addEventListener("resize", scheduleSync);

    return () => {
      window.clearTimeout(timer);
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", scheduleSync, true);
      window.removeEventListener("resize", scheduleSync);
      clearHighlights();
    };
  }, [
    currentRoute,
    selectedFeature?.selector,
    selectedFeature?.title,
    tour.active,
    tour.minimized,
  ]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!dragRef.current) return;

      const nextPosition = clampPosition({
        x: event.clientX - dragRef.current.offsetX,
        y: event.clientY - dragRef.current.offsetY,
      });

      setPanelPosition(nextPosition);
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, setPanelPosition]);

  if (!tour.active) {
    return null;
  }

  const beginDrag = (event) => {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    setIsDragging(true);
  };

  const showPreviousFeature = () => {
    setSelectedFeatureIndex(Math.max(0, selectedFeatureIndex - 1));
  };

  const showNextFeature = () => {
    setSelectedFeatureIndex(Math.min(features.length - 1, selectedFeatureIndex + 1));
  };

  if (tour.minimized) {
    return (
      <button
        type="button"
        data-flow-control
        onClick={() => setMinimized(false)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 shadow-xl transition hover:bg-emerald-50"
      >
        <Sparkles className="h-4 w-4" />
        Tour Assistant
      </button>
    );
  }

  return (
    <>
      <aside
        ref={panelRef}
        data-flow-control
        className="fixed z-50 w-[calc(100vw-24px)] max-w-[380px] overflow-hidden rounded-lg border border-neutral-200 bg-white text-neutral-900 shadow-2xl transition-shadow"
        style={{
          left: position.x,
          top: position.y,
        }}
        aria-label="Contextual tour assistant"
      >
      <div
        className="flex cursor-move items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-2"
        onMouseDown={beginDrag}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Tour Assistant</p>
            <p className="text-xs text-neutral-500">Following {currentRoute}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <GripHorizontal className="h-4 w-4 text-neutral-400" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => setMinimized(true)}
            className="h-8 w-8 rounded-md text-neutral-500 hover:bg-neutral-100"
            aria-label="Minimize tour assistant"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={stopTour}
            className="h-8 w-8 rounded-md text-neutral-500 hover:bg-red-50 hover:text-red-600"
            aria-label="Close tour assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
              <Map className="h-3.5 w-3.5" />
              Current Page
            </div>
            <span className="rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-500">
              {pageProgressLabel}
            </span>
          </div>
          <h2 className="text-base font-semibold text-neutral-950">{pageConfig.title}</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-600">{pageConfig.description}</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-neutral-500">
              Page route history
            </p>
            {flow?.steps?.[flow.index]?.label && (
              <span className="text-xs text-neutral-500">{flow.steps[flow.index].label}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goBackPage}
              disabled={!canGoBackPage}
              className="flex-1 border-neutral-300 bg-white text-neutral-700 shadow-none hover:bg-neutral-100"
            >
              <ChevronLeft className="mr-1.5 h-4 w-4" />
              Back Page
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={goNextPage}
              disabled={!canGoNextPage}
              className="flex-1 bg-emerald-600 text-white shadow-none hover:bg-emerald-700"
            >
              Next Page
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{
                width: flow?.steps?.length ? `${((flow.index + 1) / flow.steps.length) * 100}%` : "0%",
              }}
            />
          </div>
        </div>

        {selectedFeature && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold uppercase text-neutral-500">
                  Feature {progressLabel}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={showPreviousFeature}
                  disabled={selectedFeatureIndex === 0}
                  className="h-7 w-7 bg-white shadow-none"
                  aria-label="Previous feature"
                  title="Previous feature"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={showNextFeature}
                  disabled={selectedFeatureIndex >= features.length - 1}
                  className="h-7 w-7 bg-white shadow-none"
                  aria-label="Next feature"
                  title="Next feature"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <h3 className="text-sm font-semibold text-neutral-900">{selectedFeature.title}</h3>
            <p className="mt-1 text-sm leading-6 text-neutral-600">
              {selectedFeature.description}
            </p>
            {highlightMessage && (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs leading-5 text-amber-800">
                {highlightMessage}
              </p>
            )}
          </div>
        )}

        {pageConfig.nextActions?.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-neutral-500">
              Suggested next actions
            </p>
            <div className="space-y-2">
              {pageConfig.nextActions.map((action) => (
                <div
                  key={action}
                  className="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700"
                >
                  {action}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      </aside>

      {highlightLabel && (
        <div
          className="pointer-events-none fixed z-[60] rounded-md border border-emerald-300 bg-emerald-700 px-2 py-1 text-xs font-semibold text-white shadow-lg"
          style={{ left: highlightLabel.x, top: highlightLabel.y }}
        >
          {highlightLabel.title}
        </div>
      )}
    </>
  );
};

export default FloatingTourAssistant;
