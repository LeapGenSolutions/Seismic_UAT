export const pagesConfig = {
  "/": {
    title: "Dashboard",
    description:
      "Your command center for daily schedules, appointment health, and provider workload.",
    features: [
      {
        title: "Daily schedule snapshot",
        description:
          "Use this area to understand today's appointment volume before moving into deeper workflows.",
        selector: "[data-tour='dashboard-schedule'], [class*='AppointmentStats'], main",
      },
      {
        title: "Appointment status overview",
        description:
          "Review completed, upcoming, cancelled, and rescheduled work so your team can spot bottlenecks quickly.",
        selector: "[data-tour='dashboard-status'], main",
      },
      {
        title: "Provider workload",
        description:
          "Compare workload and coverage across providers without leaving the dashboard.",
        selector: "[data-tour='dashboard-workload'], main",
      },
    ],
    nextActions: ["Open Appointments to manage schedules", "Review Reports for billing and analytics"],
  },

  "/appointments": {
    title: "Appointments",
    description:
      "Manage schedules, create visits, adjust appointments, and jump into patient workflows.",
    features: [
      {
        title: "Calendar workspace",
        description:
          "The calendar is the main planning surface. You can inspect appointments, move between dates, and open appointment details.",
        selector: ".rbc-calendar, [data-tour='appointment-calendar'], main",
      },
      {
        title: "Add Appointment",
        description:
          "Use this button to add a new appointment.",
        selector: "[data-tour='add-appointment-button']",
      },
      {
        title: "Filters and provider views",
        description:
          "Filters help narrow the schedule by provider, date, or status so the calendar stays focused.",
        selector: "select, [role='combobox'], [data-tour='appointment-filters']",
      },
    ],
    nextActions: ["Create an appointment", "Open a patient record", "Join or prepare for a video visit"],
  },

  "/documentation": {
    title: "Documentation",
    description:
      "Central help and workflow reference for learning the app at your own pace.",
    features: [
      {
        title: "Documentation sections",
        description:
          "Switch between introduction, getting started, navigation guide, feature walkthroughs, and FAQ content.",
        selector: "button, [role='tab'], main",
      },
      {
        title: "Workflow walkthroughs",
        description:
          "Use the guide content to understand common flows like appointments, video calls, reports, and support.",
        selector: "video, main",
      },
      {
        title: "Reference while working",
        description:
          "The assistant stays available, so you can read docs, move to a page, and keep the same tour session alive.",
        selector: "main",
      },
    ],
    nextActions: ["Open a walkthrough", "Move to Appointments or Reports when ready"],
  },

  "/patients": {
    title: "Patients",
    description:
      "Search, review, and open patient records with clinical context and appointment history.",
    features: [
      {
        title: "Patient list",
        description:
          "Scan patient records, open details, and move from patient context into clinical or appointment workflows.",
        selector: "table, [data-tour='patients-table'], main",
      },
      {
        title: "Search and filters",
        description:
          "Use search and filters to find patient records quickly while preserving any partially entered criteria.",
        selector: "input[type='search'], input[placeholder*='search' i], [data-tour='patient-search']",
      },
      {
        title: "Patient Details",
        description:
          "Click this icon to view detailed information and reports for the patient.",
        selector: "[data-tour='view-patient-reports']",
      },
    ],
    nextActions: ["Search for a patient", "Open a patient report"],
  },

  "/reports": {
    title: "Reports",
    description:
      "Navigate billing analytics, billing history, estimated billing, and operational reporting.",
    features: [
      {
        title: "Report categories",
        description:
          "Choose the report area that matches your task, from billing analytics to invoice review.",
        selector: "a[href*='billing'], [data-tour='reports-grid'], main",
      },
      {
        title: "Analytics workflows",
        description:
          "Reports are designed for scanning, comparison, and follow-up actions across billing and care operations.",
        selector: "main",
      },
    ],
    nextActions: ["Open billing analytics", "Review billing history"],
  },

  "/video-call": {
    title: "Video Call",
    description:
      "Prepare, launch, and manage virtual visit workflows.",
    features: [
      {
        title: "Upcoming Calls",
        description:
          "Use \"Select An Appointment\" and \"Your Name\" to select an upcoming call.",
        selector:
          "[data-tour='video-call-upcoming-tab'], [data-tour='upcoming-appointment-select'], [data-tour='upcoming-your-name']",
      },
      {
        title: "Call History",
        description:
          "View past appointments and use the filters to find the appointments you need.",
        selector: "[data-tour='call-history-filters'], [data-tour='video-call-history-tab']",
      },
    ],
    nextActions: ["Select an appointment", "Start or join a meeting"],
  },

  "/settings": {
    title: "Settings",
    description:
      "Configure profile, integrations, billing, and administrative preferences.",
    features: [
      {
        title: "Settings areas",
        description:
          "Open profile, EHR, payment, and other administrative sections based on your role permissions.",
        selector: "a, button, main",
      },
      {
        title: "Persistent preferences",
        description:
          "Inputs and choices are preserved globally, so partially completed forms can survive navigation.",
        selector: "input, select, textarea, main",
      },
    ],
    nextActions: ["Review profile settings", "Open integration settings"],
  },

  "/profile-settings": {
    title: "Profile Settings",
    description:
      "Manage profile details, preferences, legal information, and guided tour controls.",
    features: [
      {
        title: "Profile tabs",
        description:
          "Move between profile sections without losing the assistant session or captured form drafts.",
        selector: "[role='tab'], button, main",
      },
      {
        title: "Preferences",
        description:
          "Tour preferences can still be managed here, while the global header keeps Start Tour accessible everywhere.",
        selector: "input, select, button, main",
      },
    ],
    nextActions: ["Update preferences", "Return to your dashboard"],
  },

  "/post-call": {
    title: "Post-Call Documentation",
    description:
      "Review the visit record, validate AI-generated clinical content, edit documentation, and post approved outputs to downstream systems.",
    features: [
      {
        title: "Patient and Visit Context",
        description:
          "Start here to confirm the patient identity and visit context before reviewing generated documentation.",
        selector: "[data-tour='post-call-patient-info']",
      },
      {
        title: "Summary",
        description:
          "Summary of the video call between the doctor and patient.",
        selector: "[data-tour='post-call-tab-summary']",
      },
      {
        title: "Transcript",
        description:
          "Conversation between the doctor and patient.",
        selector: "[data-tour='post-call-tab-transcript']",
      },
      {
        title: "SOAP",
        description:
          "Subjective, Objective, Assessment and Plan.",
        selector: "[data-tour='post-call-tab-soap']",
      },
      {
        title: "Recommendations",
        description:
          "Recommendations of doctor and Seismic platform.",
        selector: "[data-tour='post-call-tab-recommendations']",
      },
      {
        title: "Billing",
        description:
          "Billing information related to the visit.",
        selector: "[data-tour='post-call-tab-billing']",
      },
      {
        title: "Clusters",
        description:
          "Post-Call Clusters, Clustered Output, Medications Discussed, and Conditions Mentioned.",
        selector: "[data-tour='post-call-tab-clusters']",
      },
      {
        title: "Doctor Notes",
        description:
          "Doctor notes for the visit.",
        selector: "[data-tour='post-call-tab-doctorNotes']",
      },
      {
        title: "Emotional Connect",
        description:
          "Emotional connection insights from the video call.",
        selector: "[data-tour='post-call-tab-emotionalConnect']",
      },
    ],
    nextActions: [
      "Confirm patient context",
      "Review Summary and Transcript",
      "Edit SOAP or Billing fields",
      "Save or post only after review",
    ],
  },

  "/contact": {
    title: "Support",
    description:
      "Get help, submit support details, or find contact information.",
    features: [
      {
        title: "Support form",
        description:
          "Draft support details safely. The persistent form layer stores entered text as you work.",
        selector: "form, input, textarea, main",
      },
      {
        title: "Contact options",
        description:
          "Use the available contact paths when you need help outside the app.",
        selector: "a[href^='mailto'], a[href^='tel'], main",
      },
    ],
    nextActions: ["Submit a support request", "Review documentation"],
  },

  fallback: {
    title: "Current Page",
    description:
      "The assistant is following this page. You can continue working normally while it highlights available controls and sections.",
    features: [
      {
        title: "Page controls",
        description:
          "Links, buttons, filters, and forms remain interactive. The assistant never blocks the interface.",
        selector: "main button, main a, main input, main select, main textarea",
      },
      {
        title: "Persistent drafts",
        description:
          "Form edits are captured in the persistent form store and restored when you revisit the route.",
        selector: "main",
      },
    ],
    nextActions: ["Keep exploring", "Use the header tour button any time"],
  },
};

const dynamicMatchers = [
  { pattern: /^\/patients\/[^/]+$/, config: pagesConfig["/patients"] },
  { pattern: /^\/invoice\/[^/]+$/, config: pagesConfig["/reports"] },
  { pattern: /^\/post-call\/[^/]+$/, config: pagesConfig["/post-call"] },
  { pattern: /^\/meeting-room\/[^/]+$/, config: pagesConfig["/video-call"] },
  { pattern: /^\/reports\/billing/, config: pagesConfig["/reports"] },
  { pattern: /^\/billing/, config: pagesConfig["/reports"] },
  { pattern: /^\/vbc/, config: pagesConfig["/reports"] },
  { pattern: /^\/settings\//, config: pagesConfig["/settings"] },
];

const toFeatureId = (title = "feature", index = 0) =>
  `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "feature"}-${index + 1}`;

const enrichPageConfig = (routePattern, config) => ({
  ...config,
  routePattern,
  pageTitle: config.title,
  pageDescription: config.description,
  features: (config.features || []).map((feature, index) => ({
    id: feature.id || toFeatureId(feature.title, index),
    ...feature,
  })),
});

export const getContextualTourPageConfig = (pathname = "/") => {
  const cleanPath = pathname.split("?")[0].split("#")[0] || "/";

  if (pagesConfig[cleanPath]) return enrichPageConfig(cleanPath, pagesConfig[cleanPath]);

  const dynamicMatch = dynamicMatchers.find(({ pattern }) => pattern.test(cleanPath));
  if (dynamicMatch?.config) {
    return enrichPageConfig(dynamicMatch.pattern.toString(), dynamicMatch.config);
  }

  return enrichPageConfig(cleanPath, pagesConfig.fallback);
};
