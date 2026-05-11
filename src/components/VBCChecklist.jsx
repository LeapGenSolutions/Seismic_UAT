import { useState, useEffect, useCallback } from 'react';
import { BACKEND_URL } from "../constants"
import { Check, X } from 'lucide-react';

const VBCChecklist = ({appointmentId, doctorName, doctorEmail, patientEmail, firstName, lastName}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [shouldShowLoadError, setShouldShowLoadError] = useState(false);
    const [vbcQuestions, setVbcQuestions] = useState([]);
    
  
    const fetchVBCQuestions = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/vbc/${appointmentId}`,
                {
                method : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  "email" : patientEmail.trim(),
                  "first_name" : firstName.trim(),
                  "last_name" : lastName.trim()
                }), 
                }
            );
            if(!response.ok) {
              console.error("Failed to fetch VBC questions:", response.statusText);
              setShouldShowLoadError(true);
              setVbcQuestions([]);
              return;
            }
            const data = await response.json();
            setVbcQuestions(data?.measures || []);
            setIsLoading(false);
        } catch (error) {
            console.error("Error fetching VBC questions:", error);
            setShouldShowLoadError(true);
            setVbcQuestions([]);
            setIsLoading(false);
        }
    }, [ appointmentId, patientEmail, firstName, lastName ]);

    useEffect(() => {
      if (appointmentId && patientEmail && firstName && lastName) {
        fetchVBCQuestions();
      }
    } , [fetchVBCQuestions, appointmentId, patientEmail, firstName, lastName]);


   // Dropdown state for each checklist item
   const [openItems, setOpenItems] = useState([]);

   useEffect(() => {
     if (vbcQuestions.length > 0) {
       setOpenItems(Array(vbcQuestions.length).fill(false));
     }
   }, [vbcQuestions.length]);

   // Sort so that answered/cleared (COMPLIANT or NOT_IN_POPULATION) come last
   const sortedVBCQuestions = [...vbcQuestions].sort((a, b) => {
     const isCleared = (item) => item?.status === "COMPLIANT";
     if (isCleared(a) && !isCleared(b)) return 1;
     if (!isCleared(a) && isCleared(b)) return -1;
     return 0;
   });

   return (
      <aside className="w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Checklist Questions</h2>
        </div>
        {/* Legend for status colors */}
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-emerald-400 border border-emerald-600"></span>
            <span className="text-xs text-gray-800 font-medium">Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-red-400 border border-red-600"></span>
            <span className="text-xs text-gray-800 font-medium">Gap</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-orange-300 border border-orange-600"></span>
            <span className="text-xs text-gray-800 font-medium">Exception</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-yellow-300 border border-yellow-600"></span>
            <span className="text-xs text-gray-800 font-medium">Insufficient Data</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-gray-400 border border-gray-600"></span>
            <span className="text-xs text-gray-800 font-medium">Exception/Not in population</span>
          </div>
        </div>
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((key) => (
              <div
                key={key}
                className="animate-pulse rounded-lg border border-gray-200 p-3"
              >
                <div className="mb-2 h-4 w-5/6 rounded bg-gray-200" />
                <div className="h-3 w-1/3 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && shouldShowLoadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Unable to load visit review items from middleware.
          </div>
        )}

        {!isLoading && vbcQuestions.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            No open VBC gaps are available for this appointment.
          </div>
        )}

        {!isLoading && vbcQuestions.length > 0 && (
          <div className="space-y-2">
            {sortedVBCQuestions.map((item, index) => (
              <article
                key={index}
                className={`rounded-lg border px-3 py-3 transition-colors ${
                  item?.status === "COMPLIANT"
                    ? "border-emerald-200 bg-emerald-50"
                    : item?.status === "GAP"
                    ? "border-red-200 bg-red-50"
                    : item?.status === "EXCEPTION"
                    ? "border-orange-200 bg-orange-50"
                    : item?.status === "INSUFFICIENT_DATA"
                    ? "border-yellow-200 bg-yellow-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <button
                  type="button"
                  className="flex w-full items-start gap-3 text-left focus:outline-none"
                  onClick={() => {
                    setOpenItems((prev) => {
                      const updated = [...prev];
                      updated[index] = !updated[index];
                      return updated;
                    });
                  }}
                  aria-expanded={openItems[index]}
                >
                  <span
                    className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                      item?.status === "COMPLIANT"
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : item?.status === "GAP"
                        ? "border-red-600 bg-red-600 text-white"
                        : item?.status === "EXCEPTION"
                        ? "border-orange-600 bg-orange-600 text-white"
                        : item?.status === "INSUFFICIENT_DATA"
                        ? "border-yellow-600 bg-yellow-600 text-white"
                        : "border-gray-600 bg-gray-600 text-white"
                    }`}
                    aria-hidden="true"
                  >
                    {item?.status === "COMPLIANT" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-6 text-gray-900" title={item?.question || item?.text}>
                      {item?.measure_name || item?.text || "Checklist item"}
                    </p>
                  </div>
                  <span className="ml-2 mt-1 text-gray-500">
                    {openItems[index] ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    )}
                  </span>
                </button>
                {openItems[index] && (
                  <div className="mt-3 pl-10 pr-2 text-sm text-gray-700 space-y-2">
                    {item?.reason && (
                      <div>
                        <span className="font-semibold">Reason:</span> {item.reason}
                      </div>
                    )}
                    {item?.evidence && item.evidence.length > 0 && (
                      <div>
                        <span className="font-semibold">Evidence:</span>
                        <ul className="list-disc ml-5">
                          {item.evidence.map((ev, i) => (
                            <li key={i}>{ev}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </aside>
    );
}

export default VBCChecklist