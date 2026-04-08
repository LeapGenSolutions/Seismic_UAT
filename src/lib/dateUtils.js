export const formatUsDate = (raw) => {
  if (!raw) return "—";

  const dateOnly = String(raw).trim().split("T")[0];

  const isoMatch = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    return `${mm}/${dd}/${yyyy}`;
  }

  const usMatch = dateOnly.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, mm, dd, yyyy] = usMatch;
    return `${mm.padStart(2, "0")}/${dd.padStart(2, "0")}/${yyyy}`;
  }

  return "—";
};
