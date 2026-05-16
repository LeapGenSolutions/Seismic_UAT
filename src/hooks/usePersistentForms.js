import { useEffect } from "react";
import {
  contextualTourActions,
  getContextualTourState,
} from "../stores/contextualTourStore";

const TRACKED_SELECTOR =
  "input:not([type='password']):not([type='file']):not([type='hidden']), textarea, select";

const ignoredTypes = new Set(["button", "submit", "reset", "image"]);

const getRouteKey = (location = "/") => location.split("?")[0].split("#")[0] || "/";

const getElementIndex = (element) => {
  const fields = Array.from(document.querySelectorAll(TRACKED_SELECTOR));
  return Math.max(0, fields.indexOf(element));
};

const getFieldKey = (element) => {
  const form = element.form;
  const formKey =
    form?.getAttribute("data-form-id") ||
    form?.getAttribute("name") ||
    form?.getAttribute("id") ||
    "page";
  const fieldKey =
    element.getAttribute("data-form-key") ||
    element.getAttribute("name") ||
    element.getAttribute("id") ||
    element.getAttribute("aria-label") ||
    element.getAttribute("placeholder") ||
    `field-${getElementIndex(element)}`;

  return `${formKey}:${element.tagName.toLowerCase()}:${element.type || "value"}:${fieldKey}`;
};

const readFieldValue = (element) => {
  if (element.tagName === "SELECT" && element.multiple) {
    return Array.from(element.selectedOptions).map((option) => option.value);
  }

  if (element.type === "checkbox") {
    return Boolean(element.checked);
  }

  if (element.type === "radio") {
    return {
      checked: Boolean(element.checked),
      value: element.value,
    };
  }

  return element.value;
};

const setNativeValue = (element, value) => {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
    return;
  }

  if (valueSetter) {
    valueSetter.call(element, value);
    return;
  }

  element.value = value;
};

const writeFieldValue = (element, value) => {
  if (element.tagName === "SELECT" && element.multiple && Array.isArray(value)) {
    Array.from(element.options).forEach((option) => {
      option.selected = value.includes(option.value);
    });
    return;
  }

  if (element.type === "checkbox") {
    element.checked = Boolean(value);
    return;
  }

  if (element.type === "radio") {
    if (value && typeof value === "object") {
      element.checked = value.checked && element.value === value.value;
    }
    return;
  }

  setNativeValue(element, value ?? "");
};

const dispatchFieldEvents = (element) => {
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const hydrateRouteFields = (routeKey) => {
  const routeDrafts = getContextualTourState().forms?.[routeKey];
  if (!routeDrafts) return;

  document.querySelectorAll(TRACKED_SELECTOR).forEach((element) => {
    if (ignoredTypes.has(element.type)) return;

    const draft = routeDrafts[getFieldKey(element)];
    if (!draft) return;

    writeFieldValue(element, draft.value);
    dispatchFieldEvents(element);
  });
};

const restoreRouteSession = (routeKey) => {
  const routeSession = getContextualTourState().sessions?.[routeKey];
  if (!routeSession) return;

  if (Number.isFinite(routeSession.scrollY)) {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: routeSession.scrollY, behavior: "auto" });
    });
  }
};

const collectFieldSnapshot = () => {
  const snapshot = {};

  document.querySelectorAll(TRACKED_SELECTOR).forEach((element) => {
    if (ignoredTypes.has(element.type)) return;
    if (element.hasAttribute("data-persist-ignore")) return;

    snapshot[getFieldKey(element)] = {
      value: readFieldValue(element),
      updatedAt: new Date().toISOString(),
    };
  });

  return snapshot;
};

export const captureCurrentPageSession = (route) => {
  if (typeof window === "undefined") return {};

  const routeKey = getRouteKey(route || window.location.pathname);
  const session = {
    path: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    scrollY: window.scrollY || 0,
    activeElementKey:
      document.activeElement instanceof HTMLElement && document.activeElement.matches(TRACKED_SELECTOR)
        ? getFieldKey(document.activeElement)
        : null,
    fields: collectFieldSnapshot(),
  };

  Object.entries(session.fields).forEach(([fieldKey, draft]) => {
    contextualTourActions.saveFormField(routeKey, fieldKey, draft.value);
  });
  contextualTourActions.saveRouteSession(routeKey, session);

  return session;
};

export const usePersistentForms = (location) => {
  useEffect(() => {
    // Capture native field edits at the document level so forms do not need to
    // opt in one by one. Components can opt out with data-persist-ignore.
    const handleFieldEvent = (event) => {
      const element = event.target;
      if (!(element instanceof HTMLElement)) return;
      if (!element.matches(TRACKED_SELECTOR)) return;
      if (ignoredTypes.has(element.type)) return;
      if (element.hasAttribute("data-persist-ignore")) return;

      contextualTourActions.saveFormField(
        getRouteKey(window.location.pathname),
        getFieldKey(element),
        readFieldValue(element)
      );
    };

    document.addEventListener("input", handleFieldEvent, true);
    document.addEventListener("change", handleFieldEvent, true);

    return () => {
      document.removeEventListener("input", handleFieldEvent, true);
      document.removeEventListener("change", handleFieldEvent, true);
    };
  }, []);

  useEffect(() => {
    // Hydrate more than once because many pages fetch data or open controlled
    // form components after the first route paint.
    const routeKey = getRouteKey(location);
    const timers = [
      window.setTimeout(() => {
        hydrateRouteFields(routeKey);
        restoreRouteSession(routeKey);
      }, 0),
      window.setTimeout(() => {
        hydrateRouteFields(routeKey);
        restoreRouteSession(routeKey);
      }, 150),
      window.setTimeout(() => {
        hydrateRouteFields(routeKey);
        restoreRouteSession(routeKey);
      }, 600),
    ];

    return () => {
      captureCurrentPageSession(routeKey);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [location]);
};
