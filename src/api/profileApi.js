import { BACKEND_URL } from "../constants";

export const updateProfileData = async (doctorId, updatedFields) => {
    try {
        const response = await fetch(`${BACKEND_URL}api/personalization/${encodeURIComponent(doctorId)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedFields),
        })
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Failed to update profile: ${errText}`);
        }
        return response.ok ? { success: true, data: await response.json() } : { success: false };
    } catch (error) {
        console.error("Update profile error:", error);
        throw error;
    }
};