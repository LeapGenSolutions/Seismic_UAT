import { BACKEND_URL } from "../constants";

const isLocalhost = () => {
  if (typeof window === "undefined") return false;
  const host = window.location?.hostname;
  return host === "localhost" || host === "127.0.0.1";
};

const BASE = (
  process.env.REACT_APP_POWERBI_API_BASE_URL ||
  (isLocalhost() ? "http://127.0.0.1:8080" : "") ||
  BACKEND_URL ||
  ""
)
  .trim()
  .replace(/\/+$/, "");

const api = (path) => `${BASE}/${String(path).replace(/^\/+/, "")}`;

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

export const getPowerBiEmbedConfigUrl = ({
  appointmentId,
  date,
  metric,
  patientName,
  reportId,
  doctorEmail,
  doctorId,
  clinicId,
} = {}) => {
  const query = new URLSearchParams();
  if (hasValue(appointmentId)) query.set("appointmentId", String(appointmentId).trim());
  if (hasValue(date)) query.set("date", String(date).trim());
  if (hasValue(metric)) query.set("metric", String(metric).trim());
  if (hasValue(patientName)) query.set("patientName", String(patientName).trim());
  if (hasValue(reportId)) query.set("reportId", String(reportId).trim());
  if (hasValue(doctorEmail)) query.set("doctorEmail", String(doctorEmail).trim());
  if (hasValue(doctorId)) query.set("doctorId", String(doctorId).trim());
  if (hasValue(clinicId)) query.set("clinicId", String(clinicId).trim());

  const queryString = query.toString();
  return api(`/api/powerbi/embed-config${queryString ? `?${queryString}` : ""}`);
};

export const fetchPowerBiEmbedConfig = async (params = {}, { signal } = {}) => {
  const url = getPowerBiEmbedConfigUrl(params);
  const response = await fetch(url, {
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const error = new Error(text || `Failed with status ${response.status}`);
    error.status = response.status;
    error.url = url;
    throw error;
  }

  return response.json();
};
