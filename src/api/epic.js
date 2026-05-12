import { BACKEND_URL } from "../constants";

// GET /cds-services
// Discovery endpoint - tells Epic what CDS services Seismic offers
export const getCDSServices = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}cds-services`);

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to fetch CDS services: ${err}`);
    }

    return await response.json();
  } catch (error) {
    console.error("CDS services error:", error);
    throw error;
  }
};

// POST /cds-services/seismic-patient-view
// Hook handler - Epic calls this when doctor opens patient chart
// Returns AI generated note as a CDS card
export const getPatientCDSCard = async (patientId, encounterId) => {
  try {
    const response = await fetch(
      `${BACKEND_URL}cds-services/seismic-patient-view`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hook: "patient-view",
          hookInstance: crypto.randomUUID(),
          context: {
            patientId: patientId,
            encounterId: encounterId,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to fetch CDS card: ${err}`);
    }

    return await response.json();
  } catch (error) {
    console.error("CDS card error:", error);
    throw error;
  }
};