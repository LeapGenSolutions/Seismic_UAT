import { useQuery } from "@tanstack/react-query";
import { fetchRecommendationByAppointment } from "../../api/recommendations";
import ReactMarkdown from "react-markdown";
import { useState, useEffect, useMemo } from "react";
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
          : "bg-white text-slate-700 border-slate-200 hover:text-blue-600 hover:border-blue-400"
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

const Recommendations = ({ appointmentId, username }) => {
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

  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ["recommendations", appointmentId, username],
    queryFn: () =>
      fetchRecommendationByAppointment(
        `${username}_${appointmentId}_recommendations`,
        username
      ),
  });

  const { doctorText, seismicText } = useMemo(() => {
    const raw = recommendations?.data?.recommendations;
    if (!raw) return { doctorText: null, seismicText: "No recommendations available." };

    const formattedText = raw.replaceAll("####", "## ").replaceAll("###", "# ");
    
    let doctor = null;
    let seismic = formattedText;

    const docMatch = formattedText.match(/#+\s*Doctor/i);
    const seismicMatch = formattedText.match(/#+\s*Seismic/i);

    if (docMatch && seismicMatch) {
      const docIndex = docMatch.index;
      const seisIndex = seismicMatch.index;
      
      if (docIndex < seisIndex) {
        doctor = formattedText.substring(docIndex, seisIndex).trim();
        seismic = formattedText.substring(seisIndex).trim();
      } else {
        seismic = formattedText.substring(0, docIndex).trim();
        doctor = formattedText.substring(docIndex).trim();
      }
    } else if (docMatch) {
      const docIndex = docMatch.index;
      seismic = docIndex > 0 ? formattedText.substring(0, docIndex).trim() : "No independent recommendations.";
      doctor = formattedText.substring(docIndex).trim();
    }

    return { doctorText: doctor, seismicText: seismic };
  }, [recommendations]);


  const handleInitiatePost = () => {
    setPostError(false);
    setShowConfirmModal(true);
  };

  const handleCancelPost = () => {
    setShowConfirmModal(false);
    setPostError(false);
    setResetKey((prev) => prev + 1); 
  };

  const executePostToAthena = async () => {
    setIsPosting(true);
    setPostError(false);
    setSeismicPostStatus("posting");

    try {
      // TODO: Replace with your actual API PUT/POST request to Athena
      // await postRecommendationsToAthena(appointmentId, username, seismicText);
      
      // Simulating a network request delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // On Success
      setShowConfirmModal(false);
      setSeismicPostStatus("success");
      setShowSuccessToast(true);
      
      // Update state so the app knows we've posted at least once
      setHasPosted(true); 
      
      setTimeout(() => {
        setShowSuccessToast(false);
        setSeismicPostStatus("idle");
      }, 3000);

    } catch (err) {
      // On Error
      console.error("Failed to Post to EHR", err);
      setPostError(true);
      setSeismicPostStatus("error");
    } finally {
      setIsPosting(false);
    }
  };


  if (isLoading) return <LoadingCard message="From symptoms to strategy… aligning recommendations." />;
  if (error) return <LoadingCard />;

  return (
    <div className="relative h-full flex flex-col">
      <style>{`
        .markdown h1 { font-size: 1.5rem; font-weight: bold; margin-top: 0.5rem; margin-bottom: 0.5rem;}
        .markdown h2 { font-size: 1.1rem; font-weight: bold; margin-top: 1rem; margin-bottom: 0.5rem; color: #1e293b;}
        .markdown p { line-height: 1.6; margin: 0.5rem 0; color: #334155;}
        .markdown ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; color: #334155;}
        .markdown li { margin-bottom: 0.25rem; }
      `}</style>

      {/* HEADER & TABS */}
      <div className="mb-4 shrink-0">
        <h2 className="text-2xl font-semibold text-slate-900">Recommendations</h2>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => setActive("recommendations")}
            className={`px-6 py-2 rounded-md border shadow-sm text-sm font-medium transition-colors ${
              active === "recommendations" ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Recommendations
          </button>
          <button
            onClick={() => setActive("uptodate")}
            className={`px-6 py-2 rounded-md border shadow-sm text-sm font-medium transition-colors ${
              active === "uptodate" ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            UpToDate
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="mb-6 flex-grow flex flex-col">
        {active === "recommendations" ? (
          <div className="space-y-6 flex-grow">
            
            {/* DOCTOR SECTION */}
            {doctorText && (
              <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden p-5 markdown prose max-w-none">
                <ReactMarkdown>{doctorText}</ReactMarkdown>
              </div>
            )}

            {/* SEISMIC SECTION */}
            <div className="bg-white border border-blue-100 shadow-sm rounded-lg overflow-hidden relative">
              <div className="absolute top-4 right-4 flex items-center z-10">
                <CopyIconButton 
                  text={seismicText} 
                  label="Seismic Notes" 
                />
                <PostIconButton 
                  onClick={handleInitiatePost} 
                  disabled={!seismicText || seismicText.includes("No independent recommendations")}
                  globalStatus={seismicPostStatus}
                  postResetKey={resetKey}
                />
              </div>
              
              <div className="p-5 markdown prose max-w-none">
                <ReactMarkdown>{seismicText}</ReactMarkdown>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-grow">
            <UpToDate appId={appointmentId} username={username} data={recommendations?.data} />
          </div>
        )}
      </div>

      {/* ==========================================
          CONFIRMATION MODAL
          ========================================== */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Confirm Action
            </h3>
            
            {/* DYNAMIC TEXT BASED ON hasPosted STATE */}
            <p className={`mb-6 ${hasPosted ? "text-amber-600 font-medium" : "text-slate-600"}`}>
              {hasPosted 
                ? "Seismic Independent recommendations already posted. Do you want to post again?" 
                : "Do you want to post seismic independent recommendations to Athena?"}
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
                  "Post"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          SUCCESS TOAST
          ========================================== */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-green-50 border border-green-200 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <div className="bg-green-100 rounded-full p-1">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            
            <span className="font-medium text-green-800 text-sm pr-4">
              Successfully posted to Athena!
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