import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { navigate } from "wouter/use-browser-location";
import { useParams } from "wouter";
import PatientInfoComponent from "../components/patients/PatientInfoComponent";
import SummaryOfPatient from "../components/patients/SummaryOfPatient";
import AppointmentModal from "../components/appointments/AppointmentModal";
import { useQuery } from "@tanstack/react-query";
import { fetchSummaryofSummaries } from "../api/summaryOfSummaries";
import { PageNavigation } from "../components/ui/page-navigation";
import { format, isToday } from "date-fns";
import { fetchCallHistory, fetchDoctorsFromHistory } from "../api/callHistory";
import { formatUsDate } from "../lib/dateUtils";
import { usePermission } from "../hooks/use-permission";
import { fetchPatientsDetails } from "../redux/patient-actions";
import { fetchAppointmentDetails } from "../redux/appointment-actions";

const EMPTY_ARRAY = [];
const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace("canceled", "cancelled");

const getAppointmentDateTime = (appointment) => {
  const rawDate =
    appointment?.appointment_date ||
    appointment?.date ||
    appointment?.timestamp ||
    appointment?.created_at;

  if (!rawDate) return null;

  const normalizedDate = String(rawDate).split("T")[0];
  const timeValue = String(appointment?.time || "00:00");
  const normalizedTime = /^\d{2}:\d{2}$/.test(timeValue)
    ? `${timeValue}:00`
    : "00:00:00";

  const dateTime = new Date(`${normalizedDate}T${normalizedTime}`);
  return Number.isNaN(dateTime.getTime()) ? null : dateTime;
};

const isAthenaAppointment = (appointment) =>
  appointment?.EMR === "Athena" || !!appointment?.athena_patient_id;

const extractSummaryPatientId = (patient, routePatientId) =>
  patient?.patientID ||
  patient?.details?.patientID ||
  patient?.original_json?.patientID ||
  patient?.original_json?.details?.patientID ||
  patient?.original_json?.original_json?.details?.patientID ||
  patient?.athena_patient_id ||
  patient?.patient_id ||
  patient?.seismic_patient_id ||
  routePatientId;

const maskInsuranceId = (id) => {
  if (!id || typeof id !== "string") return "N/A";
  if (id.length < 4) return "N/A";
  return `XXXXX${id.slice(-4)}`;
};

const PatientReports = () => {
  const { patientId } = useParams();

  const dispatch = useDispatch();
  const patients = useSelector((state) => state.patients.patients) || EMPTY_ARRAY;
  const appointments = useSelector((state) => state.appointments.appointments) || EMPTY_ARRAY;
  
  const loggedInDoctor = useSelector((state) => state.me.me);
  const doctorEmail = (
    loggedInDoctor?.doctor_email ||
    loggedInDoctor?.email ||
    ""
  ).toLowerCase();

  const [hasFetched, setHasFetched] = useState(false);

  const patient = useMemo(
    () => patients.find((p) => {
      if (!patientId || patientId === "undefined" || patientId === "null") return false;
      if (p.patient_id && String(p.patient_id) === String(patientId)) return true;
      if (p.seismic_patient_id && String(p.seismic_patient_id) === String(patientId)) return true;
      if (p.athena_patient_id && String(p.athena_patient_id) === String(patientId)) return true;
      return false;
    }),
    [patients, patientId]
  );

  useEffect(() => {
    if (!patient && loggedInDoctor && !hasFetched) {
      if (loggedInDoctor.clinicName) {
        dispatch(fetchPatientsDetails(loggedInDoctor.clinicName));
      } else {
        dispatch(fetchPatientsDetails());
      }
      setHasFetched(true);
    }
  }, [dispatch, patient, loggedInDoctor, hasFetched]);

  useEffect(() => {
    if (!loggedInDoctor) return;
    if (appointments.length > 0) return;

    const appointmentEmail =
      loggedInDoctor?.doctor_email || loggedInDoctor?.email || "";

    if (!appointmentEmail && !loggedInDoctor?.clinicName) return;

    dispatch(
      fetchAppointmentDetails(
        appointmentEmail,
        loggedInDoctor?.clinicName || ""
      )
    );
  }, [
    appointments.length,
    dispatch,
    loggedInDoctor,
  ]);

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [summaryOfSummariesData, setSummaryOfSummariesData] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const canViewPatientInfo = usePermission("patients.info", "read");
  const canViewClinicalSummary = usePermission("patients.clinical_summary", "read");
  const canJoinCallPermission = usePermission("patients.join_call", "write");
  const canViewPostCall = usePermission("patients.post_call_doc", "read");
  const summaryRequestPatientId = extractSummaryPatientId(patient, patientId);

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ["summaryOfSummaries", summaryRequestPatientId],
    queryFn: () => fetchSummaryofSummaries(summaryRequestPatientId),
    enabled: !!summaryRequestPatientId,
  });

  useEffect(() => {
    if (summaryData) setSummaryOfSummariesData(summaryData);
  }, [summaryData]);

  useEffect(() => {
    const loadCallHistory = async () => {
      try {
        const clinicName = loggedInDoctor?.clinicName || "";

        if (clinicName) {
          const clinicDoctors = await fetchDoctorsFromHistory(clinicName);
          const clinicEmails = Array.from(
            new Set(
              (clinicDoctors || [])
                .map((doctor) => (doctor?.doctor_email || doctor?.email || "").toLowerCase().trim())
                .filter(Boolean)
            )
          );

          if (clinicEmails.length > 0) {
            const res = await fetchCallHistory(clinicEmails);
            setCallHistory(res || []);
            return;
          }
        }

        if (doctorEmail) {
          const res = await fetchCallHistory([doctorEmail]);
          setCallHistory(res || []);
          return;
        }

        setCallHistory([]);
      } catch {
        setCallHistory([]);
      }
    };

    loadCallHistory();
  }, [doctorEmail, loggedInDoctor?.clinicName]);

  const getUnifiedDate = (appt) =>
    appt.appointment_date ||
    appt.date ||
    appt.timestamp ||
    appt.created_at ||
    null;

  const sortedAppointments = useMemo(() => {
    if (!patient) return [];
    return appointments
      .filter((a) => {
         if (a.athena_patient_id && String(a.athena_patient_id) === String(patient.patient_id)) return true;
         if (a.patient_id && String(a.patient_id) === String(patient.patient_id)) return true;
         if (a.patient_id && patient.seismic_patient_id && String(a.patient_id) === String(patient.seismic_patient_id)) return true;
         
         if (a.email && patient.email && a.email.toLowerCase() === patient.email.toLowerCase()) return true;
         
         const ptFirstName = (patient.firstname || patient.first_name || "").trim().toLowerCase();
         const ptLastName = (patient.lastname || patient.last_name || "").trim().toLowerCase();
         const fullName = `${ptFirstName} ${ptLastName}`.trim();
         
         if (a.full_name && a.full_name.toLowerCase() === fullName) return true;
         
         return false;
      })
      .sort(
        (a, b) =>
          new Date(getUnifiedDate(b)) - new Date(getUnifiedDate(a))
      );
  }, [appointments, patient]);

  const now = useMemo(() => new Date(), []);

  const mergedAppointments = useMemo(() => {
    return sortedAppointments.map((appt) => {
      const match = callHistory.find(
        (h) => h.appointmentID === appt.id
      );

      const apptDateStr = getUnifiedDate(appt);
      const apptDateObj = apptDateStr
        ? new Date(apptDateStr + "T12:00:00")
        : null;
      const apptDateTimeObj = getAppointmentDateTime(appt);

      const startTimeObj = match?.startTime
        ? new Date(match.startTime)
        : null;
      const endTimeObj = match?.endTime
        ? new Date(match.endTime)
        : null;

      let durationMinutes = null;
      if (startTimeObj && endTimeObj) {
        const diff = Math.round((endTimeObj - startTimeObj) / 60000);
        if (!Number.isNaN(diff) && diff >= 0) durationMinutes = diff;
      }

      const status = normalizeStatus(appt?.status);
      const hasAthenaEncounter =
        !!String(appt?.athena_encounter_id || "").trim();
      const isCompleted =
        !!match?.endTime ||
        status === "completed" ||
        (hasAthenaEncounter && !!apptDateTimeObj && apptDateTimeObj <= now);
      const isCancelled = status === "cancelled";
      const isPastVisitCandidate =
        !!apptDateTimeObj && apptDateTimeObj <= now && !isCancelled;

      return {
        appt,
        history: match || null,
        apptDateObj,
        apptDateTimeObj,
        durationMinutes,
        isCompleted,
        isCancelled,
        isPastVisitCandidate,
      };
    });
  }, [sortedAppointments, callHistory, now]);

  const nextUpcoming = useMemo(() => {
    return (
      mergedAppointments
        .map((m) => {
          const dateStr = m.appt.appointment_date;
          if (!dateStr) return null;

          const timeStr = m.appt.time || "00:00";
          const dt = new Date(`${dateStr}T${timeStr}:00`);

          const cancelled = m.isCancelled;

          if (isNaN(dt.getTime())) return null;
          if (cancelled || m.isCompleted) return null;
          if (dt <= now) return null;

          return { meta: m, dt };
        })
        .filter(Boolean)
        .sort((a, b) => a.dt - b.dt)[0] || null
    );
  }, [mergedAppointments, now]);

  const visibleAppointments = useMemo(
    () =>
      mergedAppointments.filter(
        (item) => !(isAthenaAppointment(item.appt) && item.isCancelled)
      ),
    [mergedAppointments]
  );

  const cancelledAthenaAppointments = useMemo(
    () =>
      mergedAppointments.filter(
        (item) => isAthenaAppointment(item.appt) && item.isCancelled
      ),
    [mergedAppointments]
  );

  const canJoin = useMemo(() => {
    if (!nextUpcoming) return false;

    const { meta, dt } = nextUpcoming;
    const cancelled = meta.isCancelled;

    return (
      canJoinCallPermission &&
      isToday(dt) &&
      dt > now &&
      !cancelled &&
      !meta.isCompleted
    );
  }, [canJoinCallPermission, nextUpcoming, now]);

  const firstName =
    patient?.firstname ||
    patient?.first_name ||
    patient?.details?.firstname ||
    patient?.details?.first_name ||
    "";

  const middleName =
    patient?.middlename ||
    patient?.middle_name ||
    patient?.details?.middlename ||
    patient?.details?.middle_name ||
    patient?.original_json?.details?.middlename ||
    patient?.original_json?.original_json?.details?.middlename ||
    "";

  const lastName =
    patient?.lastname ||
    patient?.last_name ||
    patient?.details?.lastname ||
    patient?.details?.last_name ||
    "";

  const fullName = `${firstName}${middleName ? " " + middleName : ""}${
    lastName ? " " + lastName : ""
  }`;

  // FIX: correct phone mapping + masked fallback
  const rawPhone =
    patient?.phone ||
    patient?.contactmobilephone ||
    patient?.details?.contactmobilephone ||
    "";

  const maskedPhone = rawPhone
    ? `XXX-XXX-${String(rawPhone).slice(-4)}`
    : "******";

  const maskedEmail = patient?.email
    ? `${patient.email[0]}***@${patient.email.split("@")[1]}`
    : "Not Available";

  const athenaInsurance =
    patient?.insurances?.[0] ||
    patient?.details?.insurances?.[0] ||
    patient?.original_json?.details?.insurances?.[0] ||
    patient?.original_json?.original_json?.details?.insurances?.[0] ||
    null;

  const insuranceProvider =
    patient?.insurance_provider ||
    athenaInsurance?.ircname ||
    athenaInsurance?.insuranceplandisplayname ||
    athenaInsurance?.insuranceplanname ||
    athenaInsurance?.insurancepayername ||
    "N/A";

  const insuranceId =
    patient?.insurance_id ||
    athenaInsurance?.insuranceidnumber ||
    athenaInsurance?.policynumber ||
    athenaInsurance?.insuranceid ||
    athenaInsurance?.id ||
    "N/A";
  const maskedInsuranceId = maskInsuranceId(String(insuranceId || ""));

  const lastVisit = useMemo(() => {
    const completedVisit = mergedAppointments
      .filter((m) => m.isCompleted && m.apptDateObj)
      .sort((a, b) => b.apptDateObj - a.apptDateObj)[0];

    if (completedVisit) {
      return format(completedVisit.apptDateObj, "MMM dd, yyyy");
    }

    const pastVisit = mergedAppointments
      .filter((m) => m.isPastVisitCandidate && m.apptDateObj)
      .sort((a, b) => b.apptDateObj - a.apptDateObj)[0];

    if (pastVisit) {
      return format(pastVisit.apptDateObj, "MMM dd, yyyy");
    }

    return "Not Available";
  }, [mergedAppointments]);

  const rawDOB =
    patient?.dob ||
    patient?.date_of_birth ||
    patient?.birthDate ||
    patient?.details?.dob ||
    patient?.original_json?.details?.dob ||
    patient?.original_json?.original_json?.details?.dob;

  const formattedDOB = formatUsDate(rawDOB);
  const showPatientOverviewSection =
    canViewPatientInfo || canViewClinicalSummary;

  const renderAppointmentCard = (m, { showCancelledBadge = false } = {}) => {
    const {
      appt,
      history,
      apptDateObj,
      isCompleted,
      durationMinutes,
    } = m;

    const dateLabel =
      apptDateObj && !isNaN(apptDateObj.getTime())
        ? format(apptDateObj, "MMM dd, yyyy")
        : "N/A";

    return (
      <div
        key={appt.id}
        className="bg-white border rounded-xl shadow p-5 flex justify-between items-center"
      >
        <div>
          <p className="font-medium">
            {dateLabel} at {appt.time ?? "N/A"}
          </p>

          <p className="text-sm text-gray-600">
            Doctor:{" "}
            <span className="font-medium">
              {appt.doctor_name ||
                appt.doctor_email?.split("@")[0]}
            </span>
          </p>
          {isCompleted && (
            <span className="inline-block mt-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
              Completed
            </span>
          )}
          {showCancelledBadge && (
            <span className="inline-block mt-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
              Cancelled
            </span>
          )}
          {durationMinutes != null && (
            <p className="text-xs text-gray-500 mt-1">
              Duration: {durationMinutes} min
            </p>
          )}
        </div>

        {isCompleted && canViewPostCall && (
          <button
            title="View Documentation"
            onClick={() => {
              const username =
                history?.userID ||
                appt.doctor_email ||
                doctorEmail;

              const route = username
                ? `/post-call/${appt.id}?username=${encodeURIComponent(
                    username
                  )}`
                : `/post-call/${appt.id}`;

              navigate(route);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            <Eye className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 w-full space-y-6">
      <PageNavigation
        title="Patient Reports"
        subtitle={fullName}
        customTrail={[
          { href: "/patients", label: "Patients" },
          { href: `/patients/${patientId}`, label: "Patient Details" },
          { href: `/patients/${patientId}/reports`, label: "Reports", isLast: true },
        ]}
      />

      {showPatientOverviewSection ? (
        <div className="bg-white border rounded-xl shadow p-6">
          {canViewPatientInfo ? (
            <PatientInfoComponent
              firstName={firstName}
              middleName={middleName}
              lastName={lastName}
              phone={maskedPhone}
              email={maskedEmail}
              insuranceProvider={insuranceProvider}
              insuranceId={maskedInsuranceId}
              lastVisit={lastVisit}
              totalAppointments={mergedAppointments.length}
              dob={formattedDOB}
            />
          ) : null}

          {canViewClinicalSummary ? (
            isSummaryLoading ? (
              <div className="mt-6 border-t pt-4 text-sm text-gray-500">
                Fetching longitudinal clinical summary...
              </div>
            ) : summaryOfSummariesData?.overall_summary ? (
              <SummaryOfPatient summaryDataProp={summaryOfSummariesData} />
            ) : (
              <div className="mt-6 border-t pt-4 text-sm text-gray-500">
                {summaryError
                  ? "Longitudinal clinical summary could not be loaded for this patient."
                  : "No longitudinal clinical summary is available yet for this patient."}
              </div>
            )
          ) : null}
        </div>
      ) : null}

      {nextUpcoming && (
        <div className="bg-white border rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xl font-semibold">Upcoming Appointment</h3>

            {canJoin && (
              <button
                onClick={() =>
                  setSelectedAppointment(nextUpcoming.meta.appt)
                }
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Join Call
              </button>
            )}
          </div>

          <div className="text-sm text-gray-800 space-y-1">
            <p>
              <strong>Date:</strong>{" "}
              {format(nextUpcoming.dt, "MMM dd, yyyy")}
            </p>
            <p>
              <strong>Time:</strong>{" "}
              {nextUpcoming.meta.appt.time ?? "N/A"}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span className="px-2 py-1 bg-gray-100 border rounded text-xs">
                {nextUpcoming.meta.appt.status}
              </span>
            </p>
          </div>
        </div>
      )}

      <AppointmentModal
        selectedAppointment={selectedAppointment}
        setSelectedAppointment={setSelectedAppointment}
      />

      <div className="space-y-4">
        {visibleAppointments.map((m) => renderAppointmentCard(m))}
      </div>

      {cancelledAthenaAppointments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Cancelled Appointments</h3>
          {cancelledAthenaAppointments.map((m) =>
            renderAppointmentCard(m, { showCancelledBadge: true })
          )}
        </div>
      )}
    </div>
  );
};

export default PatientReports
