export const AUTH_TYPE_CIAM = "ciam";
export const AUTH_TYPE_MSAL = "msal";

const AUTH_TYPE_KEY = "authType";
const BACKEND_TOKEN_KEY = "backendToken";
const LEGACY_BYPASS_TOKEN_KEY = "bypassToken";
const LEGACY_AUTH_TOKEN_KEY = "authToken";

function getStorage(type) {
  if (typeof window === "undefined") {
    return null;
  }

  return type === "local" ? window.localStorage : window.sessionStorage;
}

function readValue(type, key) {
  try {
    return getStorage(type)?.getItem(key) || null;
  } catch {
    return null;
  }
}

function writeValue(type, key, value) {
  try {
    getStorage(type)?.setItem(key, value);
  } catch {
    // Ignore storage write failures so auth flow can continue gracefully.
  }
}

function removeValue(type, key) {
  try {
    getStorage(type)?.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function setStoredAuthType(authType) {
  if (!authType) {
    removeValue("local", AUTH_TYPE_KEY);
    removeValue("session", AUTH_TYPE_KEY);
    return;
  }

  writeValue("local", AUTH_TYPE_KEY, authType);
  removeValue("session", AUTH_TYPE_KEY);
}

export function getStoredAuthType() {
  const localAuthType = readValue("local", AUTH_TYPE_KEY);
  if (localAuthType) {
    return localAuthType;
  }

  const sessionAuthType = readValue("session", AUTH_TYPE_KEY);
  if (sessionAuthType) {
    setStoredAuthType(sessionAuthType);
    return sessionAuthType;
  }

  const legacyBootstrapToken =
    readValue("local", LEGACY_BYPASS_TOKEN_KEY) ||
    readValue("session", LEGACY_BYPASS_TOKEN_KEY);

  if (legacyBootstrapToken) {
    setStoredAuthType(AUTH_TYPE_CIAM);
    return AUTH_TYPE_CIAM;
  }

  return null;
}

export function setStoredBackendToken(token) {
  if (!token) {
    removeValue("local", BACKEND_TOKEN_KEY);
    removeValue("session", BACKEND_TOKEN_KEY);
    return;
  }

  writeValue("local", BACKEND_TOKEN_KEY, token);
  removeValue("session", BACKEND_TOKEN_KEY);
}

export function getStoredBackendToken() {
  const localToken = readValue("local", BACKEND_TOKEN_KEY);
  if (localToken) {
    return localToken;
  }

  const sessionToken = readValue("session", BACKEND_TOKEN_KEY);
  if (sessionToken) {
    setStoredBackendToken(sessionToken);
    return sessionToken;
  }

  return null;
}

export function clearLegacyStandaloneBootstrap() {
  removeValue("local", LEGACY_BYPASS_TOKEN_KEY);
  removeValue("session", LEGACY_BYPASS_TOKEN_KEY);
  removeValue("local", LEGACY_AUTH_TOKEN_KEY);
  removeValue("session", LEGACY_AUTH_TOKEN_KEY);
}

export function clearStandaloneSession() {
  setStoredBackendToken(null);
  clearLegacyStandaloneBootstrap();

  const authType = getStoredAuthType();
  if (authType === AUTH_TYPE_CIAM || authType === null) {
    setStoredAuthType(null);
  }
}

export function hasStoredStandaloneSession() {
  const authType = getStoredAuthType();
  return authType === AUTH_TYPE_CIAM || Boolean(getStoredBackendToken());
}
