import { BACKEND_URL } from "../constants"

export const fetchRecommendationByAppointment = async (apptId, userID) => {
  const response = await fetch(`${BACKEND_URL}/api/recommendations/${apptId}?userID=${userID}`);
  if (!response.ok) {
    throw new Error('Failed to fetch recommendations');
  }
  return response.json();
};

export const postRecommendationsToAthena = async (apptId, email, textPayload, encounterId, patientId) => {
  const response = await fetch(`${BACKEND_URL}/api/athena/${email}/encounter/${encounterId}/post-recommendations`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: `${email}_${apptId}_recommendations`,
      patientId: patientId,
      patientinstructions: textPayload
    }), 
  });
 
  if (!response.ok) {
    throw new Error('Failed to post recommendations to Athena');
  }
  return response.json();
};