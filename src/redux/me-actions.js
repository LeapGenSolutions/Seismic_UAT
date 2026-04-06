import { myActions } from "./me-slice";
import { fetchDoctorsFromHistory } from "../api/callHistory";
import { fetchRoles } from "../api/rbac";
import {
  computeEffectivePermissions,
  normalizeRole,
  SYSTEM_ROLES,
} from "../lib/rbac";

const asRoleList = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.roles)) {
    return value.roles;
  }

  return [];
};

const setMyDetails = (details) => {
  return async (dispatch) => {
    const fallbackEmail = details.email || details.userData?.email || details.emails?.[0] || "";
    const email = fallbackEmail.toLowerCase();

    // fetch doctor metadata from doctors container
    let doctors = [];
    try {
      doctors = await fetchDoctorsFromHistory();
      //console.log("DEBUG: setMyDetails - Fetched doctors:", doctors);
    } catch (err) {
      console.error("Failed to load doctor metadata:", err);
    }

    // find doctor by email
    const doctorDoc = doctors.find(
      (doc) =>
        doc.doctor_email?.toLowerCase() === email ||
        doc.id?.toLowerCase() === email ||
        doc.userId === details.userId
    );

    const detailRole = details.role || details.userData?.role || details.roles || details.userData?.roles;
    const normalizedRole = normalizeRole(doctorDoc?.role || detailRole);
    let customRolePermissions = null;
    const clinicName = doctorDoc?.clinicName || details.clinicName || details.userData?.clinicName || "";
    const firstName = details.firstName || details.userData?.firstName || details.given_name || "";
    const lastName = details.lastName || details.userData?.lastName || details.family_name || "";
    const profileComplete =
      doctorDoc?.profileComplete ??
      details.profileComplete ??
      details.userData?.profileComplete ??
      false;
    const approvalStatus =
      doctorDoc?.approvalStatus ??
      details.approvalStatus ??
      details.userData?.approvalStatus ??
      (profileComplete ? "approved" : null);

    if (normalizedRole && !SYSTEM_ROLES.includes(normalizedRole)) {
      try {
        const roles = asRoleList(await fetchRoles(clinicName));
        const matchedRole = roles.find(
          (roleDoc) => normalizeRole(roleDoc?.roleName) === normalizedRole
        );
        customRolePermissions = matchedRole?.permissions || null;
      } catch (err) {
        console.error("Failed to load custom roles for current user:", err);
      }
    }

    const fullName =
      [doctorDoc?.firstName, doctorDoc?.lastName].filter(Boolean).join(" ") ||
      details.fullName ||
      details.name ||
      [firstName, lastName].filter(Boolean).join(" ") ||
      details.given_name ||
      email?.split("@")[0] ||
      "";

    const payload = {
      ...details,
      email,
      doctor_name: doctorDoc?.doctor_name || fullName,
      doctor_id: doctorDoc?.doctor_id || doctorDoc?.id || details.doctor_id || details.userId,
      doctor_email: doctorDoc?.doctor_email || email,
      specialization:
        doctorDoc?.specialization ||
        doctorDoc?.specialty ||
        details.specialization ||
        details.specialty ||
        details.userData?.specialization ||
        details.userData?.specialty,
      given_name: fullName,
      family_name: doctorDoc?.lastName || lastName || details.family_name,
      name: fullName,
      fullName,
      role: normalizedRole,
      roles: Array.isArray(doctorDoc?.roles)
        ? doctorDoc.roles
        : Array.isArray(details.roles)
        ? details.roles
        : Array.isArray(details.userData?.roles)
        ? details.userData.roles
        : normalizedRole
        ? [normalizedRole]
        : [],
      specialty:
        doctorDoc?.specialty ||
        doctorDoc?.specialization ||
        details.specialty ||
        details.specialization ||
        details.userData?.specialty ||
        details.userData?.specialization,
      clinicName,
      profileComplete,
      approvalStatus,
      customPermissions: doctorDoc?.customPermissions || details.customPermissions || details.userData?.customPermissions || null,
      effectivePermissions: computeEffectivePermissions(
        normalizedRole,
        doctorDoc?.customPermissions || details.customPermissions || details.userData?.customPermissions,
        customRolePermissions
      ),
    };

    //console.log("DEBUG: setMyDetails - Matched doctor:", doctorDoc, "for email:", email);

    //console.log("DEBUG: setMyDetails - Matched doctor:", doctorDoc, "for email:", email);

    // store final doctor metadata into Redux
    if (doctorDoc?.profileComplete === true) {
      dispatch(myActions.setMyself(payload));
      //console.log("DEBUG: setMyDetails - Dispatching with clinicName:", doctorDoc?.clinicName);
    } else {
      dispatch(myActions.setMyself(payload));
    }

    return payload;
  };
};

export default setMyDetails;
