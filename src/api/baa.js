import { BACKEND_URL } from "../constants";
import {
  BAA_AGREEMENT_TITLE,
  BAA_AGREEMENT_TEXT,
  CURRENT_BAA_VERSION,
} from "../constants/baaAgreement";

const apiBase = () => BACKEND_URL.replace(/\/+$/, "");

const clientTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
};

const authHeaders = () => {
  const backendToken =
    typeof window !== "undefined" ? (sessionStorage.getItem("backendToken") || "").trim() : "";
  const authToken =
    typeof window !== "undefined" ? (sessionStorage.getItem("authToken") || "").trim() : "";
  const token = backendToken || authToken;

  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function fetchBaaStatus() {
  const response = await fetch(`${apiBase()}/api/standalone/baa/status`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to load BAA status");
  }

  return response.json();
}

export async function signCurrentBaa({ signerName, manualSignature } = {}) {
  const signedAt = new Date().toISOString();
  const signedTimeZone = clientTimeZone();
  const response = await fetch(`${apiBase()}/api/standalone/baa/sign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      baaAccepted: true,
      baaVersion: CURRENT_BAA_VERSION,
      baaSignedAt: signedAt,
      baaSignedTimeZone: signedTimeZone,
      baaSignerName: signerName,
      baaManualSignature: manualSignature || "",
      baaAgreementTitle: BAA_AGREEMENT_TITLE,
      baaSignature: {
        signed: true,
        baaVersion: CURRENT_BAA_VERSION,
        signerName,
        manualSignature: manualSignature || "",
        signedAt,
        signedTimeZone,
        agreementTitle: BAA_AGREEMENT_TITLE,
        agreementText: BAA_AGREEMENT_TEXT,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to sign BAA");
  }

  return response.json();
}
