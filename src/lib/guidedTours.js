const TOUR_PREFERENCES_KEY = "seismic:guided-tour-preferences";
const TOUR_PROGRESS_KEY = "seismic:guided-tour-progress";
export const DEFAULT_GUIDED_TOUR_ID = "platform-overview";

export const GUIDED_TOURS = {
  [DEFAULT_GUIDED_TOUR_ID]: {
    id: DEFAULT_GUIDED_TOUR_ID,
    name: "Platform overview tour",
    description: "Walk through the main Seismic Connect areas.",
    steps: [
      { path: "/", label: "Dashboard" },
      { path: "/appointments", label: "Appointments" },
      { path: "/video-call", label: "Video Call" },
      { path: "/patients", label: "Patients" },
      { path: "/reports", label: "Reports" },
      { path: "/settings", label: "Settings" },
    ],
  },
};

const canUseStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);

const readJson = (key, fallback) => {
  if (!canUseStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Failed to read ${key}:`, error);
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to write ${key}:`, error);
  }
};

export const getGuidedTourPreferences = () =>
  readJson(TOUR_PREFERENCES_KEY, {
    enabled: true,
  });

export const saveGuidedTourPreferences = (preferences = {}) => {
  const nextPreferences = {
    ...getGuidedTourPreferences(),
    ...preferences,
  };

  writeJson(TOUR_PREFERENCES_KEY, nextPreferences);
  return nextPreferences;
};

export const getGuidedTourProgress = () => readJson(TOUR_PROGRESS_KEY, {});

export const saveGuidedTourProgress = (tourId, progress = {}) => {
  if (!tourId) return getGuidedTourProgress();

  const allProgress = {
    ...getGuidedTourProgress(),
    [tourId]: {
      ...(getGuidedTourProgress()[tourId] || {}),
      ...progress,
      updatedAt: new Date().toISOString(),
    },
  };

  writeJson(TOUR_PROGRESS_KEY, allProgress);
  return allProgress;
};

export const resetGuidedTourProgress = (tourId = DEFAULT_GUIDED_TOUR_ID) => {
  const allProgress = { ...getGuidedTourProgress() };
  delete allProgress[tourId];
  writeJson(TOUR_PROGRESS_KEY, allProgress);
  return allProgress;
};

export const getGuidedTour = (tourId = DEFAULT_GUIDED_TOUR_ID) =>
  GUIDED_TOURS[tourId] || GUIDED_TOURS[DEFAULT_GUIDED_TOUR_ID];
