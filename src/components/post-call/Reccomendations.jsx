import { useQuery } from "@tanstack/react-query";
import { fetchRecommendationByAppointment, postRecommendationsToAthena } from "../../api/recommendations";
import ReactMarkdown from "react-markdown";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Copy, Check, Send, AlertCircle, CheckCircle2, X } from "lucide-react";
import LoadingCard from "./LoadingCard";
import UpToDate from "./UpToDate";

// --- REUSABLE BUTTON COMPONENTS (Lucide React) ---

const PostIconButton = ({ onClick, disabled, globalStatus, postResetKey }) => {
  const [localStatus, setLocalStatus] = useState("idle");

  useEffect(() => {
    setLocalStatus("idle");
  }, [postResetKey]);

  let normalizedGlobal = globalStatus;
  if (normalizedGlobal === true) normalizedGlobal = "success";
  if (normalizedGlobal === false) normalizedGlobal = "error";

  const handleClick = () => {
    // Prevent clicking if currently posting
    if (localStatus === "posting" || normalizedGlobal === "posting") return;

    // FIX: If the parent component is controlling the status globally, 
    // bypass the internal callback lock so the button can be clicked again later.
    if (globalStatus !== undefined) {
      onClick();
      return;
    }

    setLocalStatus("posting");
    onClick(
      () => {
        setLocalStatus("success");
        setTimeout(() => setLocalStatus("idle"), 3000);
      },
      () => {
        setLocalStatus("error");
        setTimeout(() => setLocalStatus("idle"), 3000);
      }
    );
  };

  let effectiveStatus = localStatus;
  if (
    normalizedGlobal === "success" ||
    normalizedGlobal === "error" ||
    normalizedGlobal === "posting"
  ) {
    effectiveStatus = normalizedGlobal;
  }

  let bgClass = "bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-400";
  let icon = <Send className="w-3.5 h-3.5" />;
  let label = null;
  let widthClass = "w-7"; // Default width stays square so it doesn't shrink

  if (disabled || normalizedGlobal === "posting") {
    bgClass = "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed";
  } else if (effectiveStatus === "success") {
    bgClass = "bg-green-50 text-green-700 border-green-300 hover:bg-green-100 cursor-pointer";
    icon = <CheckCircle2 className="w-3.5 h-3.5 mr-1" />;
    label = <span className="text-xs font-medium">Success</span>;
    widthClass = "w-auto px-2"; // Expands only for text
  } else if (effectiveStatus === "error") {
    bgClass = "bg-red-50 text-red-700 border-red-300 hover:bg-red-100 cursor-pointer";
    icon = <AlertCircle className="w-3.5 h-3.5 mr-1" />;
    label = <span className="text-xs font-medium">Failed</span>;
    widthClass = "w-auto px-2"; // Expands only for text
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || normalizedGlobal === "posting"}
      title="Post to EHR"
      className={`inline-flex items-center justify-center h-7 rounded-md border transition-all ml-2 ${bgClass} ${widthClass}`}
    >
      {icon}
      {label}
    </button>
  );
};

const CopyIconButton = ({ text, label }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(String(text));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text}
      title={label ? `Copy ${label}` : "Copy"}
      className={`inline-flex items-center justify-center h-7 rounded-md border transition-all whitespace-nowrap ${
        copied
          ? "bg-green-50 text-green-700 border-green-300"
          : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-400"
      } ${copied ? "px-2 gap-1.5" : "w-7"}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied && (
        <span className="text-[10px] font-semibold uppercase tracking-wide">
          Copied
        </span>
      )}
    </button>
  );
};

// --- MAIN COMPONENT ---

const stripSeismicHeading = (value = "") =>
  String(value)
    .replace(
      /^\s*(?:#{1,6}\s*)?(?:\d+\.\s*)?(?:\*\*)?(?:seismic(?:'s|’s)?\s+)?independent recommendations(?:\s+for the patient)?(?:\*\*)?\s*:?\s*\n+/i,
      ""
    )
    .trim();

const stripHeadingNumber = (value = "") =>
  String(value)
    .replace(/^(\s*(?:#{1,6}\s*)?)(?:\d+\.\s*)/, "$1")
    .trim();

const findSectionHeading = (text, sectionName) => {
  const headingText =
    sectionName.toLowerCase() === "seismic"
      ? `(?:(?:seismic(?:'s|’s)?\\s+)?independent\\s+recommendations|seismic(?:'s|’s)?\\s+recommendations)`
      : `${sectionName}(?:'s|’s)?\\s+recommendations`;
  const headingRegex = new RegExp(
    `(^|\\n)\\s*(?:#{1,6}\\s*)?(?:\\d+\\.\\s*)?(?:\\*\\*)?${headingText}(?:\\s+for\\s+the\\s+patient)?(?:\\*\\*)?\\s*:?\\s*(?=\\n|$)`,
    "i"
  );
  const match = text.match(headingRegex);
  if (!match) return null;

  const leadingBreakLength = match[1] ? match[1].length : 0;
  return {
    index: match.index + leadingBreakLength,
    end: match.index + match[0].length,
  };
};

const startsWithDoctorRecommendations = (value = "") =>
  /^\s*(?:#{1,6}\s*)?(?:\d+\.\s*)?(?:\*\*)?doctor(?:'s|’s)?\s+recommendations(?:\s+for\s+the\s+patient)?/i.test(
    String(value)
  );

const splitRecommendationSections = (raw) => {
  if (!raw) {
    return {
      doctorText: null,
      seismicText: "No recommendations available.",
    };
  }

  const formattedText = String(raw)
    .replaceAll("####", "## ")
    .replaceAll("###", "# ")
    .trim();
  const doctorHeading = findSectionHeading(formattedText, "Doctor");
  const seismicHeading = findSectionHeading(formattedText, "Seismic");

  if (doctorHeading && seismicHeading) {
    if (doctorHeading.index < seismicHeading.index) {
      return {
        doctorText: formattedText
          .substring(doctorHeading.index, seismicHeading.index)
          .trim(),
        seismicText: formattedText.substring(seismicHeading.index).trim(),
      };
    }

    return {
      doctorText: formattedText.substring(doctorHeading.index).trim(),
      seismicText: formattedText
        .substring(seismicHeading.index, doctorHeading.index)
        .trim(),
    };
  }

  if (doctorHeading) {
    return {
      doctorText: formattedText.substring(doctorHeading.index).trim(),
      seismicText:
        doctorHeading.index > 0
          ? formattedText.substring(0, doctorHeading.index).trim()
          : "No independent recommendations.",
    };
  }

  return {
    doctorText: null,
    seismicText: formattedText,
  };
};

const Recommendations = ({ appointmentId, username, appointment }) => {
  const [active, setActive] = useState("recommendations");
  
  // States for Posting Flow
  const [seismicPostStatus, setSeismicPostStatus] = useState("idle");
  const [resetKey, setResetKey] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  // Track if notes have already been posted in this session
  const [hasPosted, setHasPosted] = useState(false);

  const isAthenaAppointment = useMemo(() => {
    const hasAthenaIds = Boolean(
      appointment?.athena_encounter_id && appointment?.athena_practice_id
    );
    const athenaLikeCallId = String(appointmentId || "")
      .toLowerCase()
      .startsWith("athena");
    return hasAthenaIds || athenaLikeCallId;
  }, [appointment, appointmentId]);

  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ["recommendations", appointmentId, username],
    queryFn: () =>
      fetchRecommendationByAppointment(
        `${username}_${appointmentId}_recommendations`,
        username
      ),
  });

  const { doctorText, seismicText } = useMemo(() => {
    return splitRecommendationSections(recommendations?.data?.recommendations);
  }, [recommendations]);

  const doctorDisplayText = useMemo(
    () => stripHeadingNumber(doctorText || ""),
    [doctorText]
  );

  const seismicDisplayText = useMemo(
    () => stripSeismicHeading(seismicText),
    [seismicText]
  );

  const seismicBlockStartsWithDoctor = useMemo(
    () => startsWithDoctorRecommendations(seismicDisplayText),
    [seismicDisplayText]
  );


  const handleInitiatePost = () => {
    setPostError(false);
    setSeismicPostStatus("idle");
    setShowConfirmModal(true);
  };

  const handleCancelPost = () => {
    setShowConfirmModal(false);
    setPostError(false);
    setSeismicPostStatus("idle");
    setResetKey((prev) => prev + 1); 
  };

  const executePostToAthena = async () => {
    setIsPosting(true);
    setPostError(false);
    setSeismicPostStatus("posting");

    try {
      const result = await postRecommendationsToAthena(
        appointmentId,
        username,
        seismicDisplayText,
        appointment?.athena_encounter_id,
        appointment?.athena_practice_id
      );

      const success = result?.success || false;
      if(!success) {
        setPostError(true);
        setSeismicPostStatus("error");
      } else {
        // On Success
        setShowConfirmModal(false);
        setSeismicPostStatus("success");
        setShowSuccessToast(true);
        // Update state so the app knows we've posted at least once
        setHasPosted(true); 
      }
      
      setTimeout(() => {
        setShowSuccessToast(false);
        setSeismicPostStatus("idle");
      }, 3000);

    } catch (err) {
      // On Error
      console.error("Failed to Post to EHR", err);
      setPostError(true);
      setSeismicPostStatus("error");
      setTimeout(() => {
        setSeismicPostStatus((status) => (status === "error" ? "idle" : status));
      }, 3000);
    } finally {
      setIsPosting(false);
    }
  };


  if (isLoading) return <LoadingCard message="From symptoms to strategy… aligning recommendations." />;
  if (error) return <LoadingCard />;

  const confirmPostModal =
    showConfirmModal && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Confirm Post
              </h3>

              <p className={`mb-6 ${hasPosted ? "text-amber-600 font-medium" : "text-slate-600"}`}>
                {hasPosted
                  ? "Seismic Independent recommendations already posted to EHR. Do you want to post again?"
                  : "Do you want to post Seismic Independent Recommendations to EHR?"}
              </p>

              {postError && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-red-800">
                    Failed to post. Please try again.
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-2">
                <button
                  onClick={handleCancelPost}
                  disabled={isPosting}
                  className="px-4 py-2 rounded-md border border-slate-300 shadow-sm text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={executePostToAthena}
                  disabled={isPosting}
                  className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white transition-colors min-w-[100px] flex justify-center items-center
                    ${isPosting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}
                  `}
                >
                  {isPosting ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Post to EHR"
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative space-y-6 text-gray-900 leading-relaxed">
      <style>{`
        .markdown {
          color: #111827;
          font-size: 15px;
        }
        .markdown > :first-child {
          margin-top: 0;
        }
        .markdown > :last-child {
          margin-bottom: 0;
        }
        .markdown h1,
        .markdown h2,
        .markdown h3 {
          color: #111827;
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.4;
          margin: 1rem 0 0.35rem;
        }
        .markdown h1:first-child,
        .markdown h2:first-child,
        .markdown h3:first-child {
          margin-top: 0;
        }
        .markdown p {
          color: #111827;
          line-height: 1.55;
          margin: 0.35rem 0;
        }
        .markdown ul,
        .markdown ol {
          color: #111827;
          margin: 0.35rem 0 0.9rem;
          padding-left: 1.75rem;
        }
        .markdown ul {
          list-style-type: disc;
        }
        .markdown li {
          line-height: 1.55;
          margin: 0.2rem 0;
          padding-left: 0.1rem;
        }
        .markdown strong {
          color: #111827;
          font-weight: 700;
        }
      `}</style>

      <h3 className="font-semibold text-black text-lg">Recommendations</h3>

      <div className="flex flex-wrap gap-3">
        {[
          ["recommendations", "Recommendations"],
          ["uptodate", "UpToDate"],
        ].map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-5 py-2 rounded-md text-sm font-medium border ${
              active === tab
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-black-700 border-black-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        {active === "recommendations" ? (
          <div className="space-y-9">
            {doctorDisplayText && (
              <section className="pt-1 markdown prose max-w-none">
                <ReactMarkdown>{doctorDisplayText}</ReactMarkdown>
              </section>
            )}

            <section className="pt-1">
              {!seismicBlockStartsWithDoctor && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-lg font-semibold leading-7 text-black">
                    Seismic Independent Recommendations for the Patient
                  </p>
                  <div className="flex shrink-0 items-center self-start">
                    <CopyIconButton
                      text={seismicDisplayText}
                      label="to EHR"
                    />
                    {isAthenaAppointment && (
                      <PostIconButton
                        onClick={handleInitiatePost}
                        disabled={
                          !seismicDisplayText ||
                          seismicDisplayText.includes("No independent recommendations")
                        }
                        globalStatus={seismicPostStatus}
                        postResetKey={resetKey}
                      />
                    )}
                  </div>
                </div>
              )}
              <div className={seismicBlockStartsWithDoctor ? "markdown prose max-w-none" : "mt-2 markdown prose max-w-none"}>
                <ReactMarkdown>{seismicDisplayText}</ReactMarkdown>
              </div>
            </section>
          </div>
        ) : (
          <div>
            <UpToDate appId={appointmentId} username={username} data={recommendations?.data} />
          </div>
        )}
      </div>

      {confirmPostModal}

      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-green-50 border border-green-200 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <div className="bg-green-100 rounded-full p-1">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            
            <span className="font-medium text-green-800 text-sm pr-4">
              Successfully posted to EHR!
            </span>
            
            <button
              onClick={() => setShowSuccessToast(false)}
              className="text-green-500 hover:text-green-700 transition-colors ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Recommendations;
