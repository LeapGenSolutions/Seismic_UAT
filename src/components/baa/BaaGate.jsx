import { useEffect, useState } from "react";
import { fetchBaaStatus, signCurrentBaa } from "../../api/baa";
import BaaAgreementModal from "./BaaAgreementModal";

export default function BaaGate({ user, children, fallback = null }) {
  const authType = String(user?.authType || "").trim().toLowerCase();
  const requiresBaa = authType === "ciam";
  const hasAcceptedBaa = user?.baaAccepted === true;
  const [status, setStatus] = useState({
    loading: requiresBaa && !hasAcceptedBaa,
    signed: !requiresBaa || hasAcceptedBaa,
  });
  const [isSigning, setIsSigning] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      if (!requiresBaa) {
        setStatus({ loading: false, signed: true });
        return;
      }

      if (hasAcceptedBaa) {
        setStatus({ loading: false, signed: true });
        return;
      }

      setStatus({ loading: true, signed: false });
      try {
        const nextStatus = await fetchBaaStatus();
        if (isMounted) {
          setStatus({
            loading: false,
            signed: Boolean(nextStatus.accepted ?? nextStatus.signed),
          });
        }
      } catch (error) {
        console.error("Failed to load BAA status:", error);
        if (isMounted) {
          setStatus({ loading: false, signed: hasAcceptedBaa });
        }
      }
    }

    loadStatus();

    return () => {
      isMounted = false;
    };
  }, [hasAcceptedBaa, requiresBaa, user?.doctor_id, user?.email]);

  const handleSign = async ({ signerName, manualSignature }) => {
    setIsSigning(true);
    try {
      await signCurrentBaa({ signerName, manualSignature });
      setStatus({ loading: false, signed: true });
    } finally {
      setIsSigning(false);
    }
  };

  if (status.loading) return fallback;

  return (
    <>
      {children}
      {!status.signed && (
        <BaaAgreementModal user={user} onSubmit={handleSign} isSubmitting={isSigning} />
      )}
    </>
  );
}
