const STATUS_STYLES = [
  { match: ["active", "đang làm việc", "working"], className: "badge-active", label: "Active" },
  { match: ["on leave", "leave", "nghỉ phép"], className: "badge-leave", label: "On Leave" },
  { match: ["probation", "thử việc", "trial", "thực tập"], className: "badge-probation", label: "Probation" },
  { match: ["inactive", "terminated", "resigned", "nghỉ việc"], className: "badge-danger", label: "Inactive" },
];

export const getStatusPresentation = (rawStatus) => {
  const status = (rawStatus || "").toString().trim();
  const normalized = status.toLowerCase();

  const matched = STATUS_STYLES.find((item) => item.match.some((keyword) => normalized === keyword));
  if (!matched) {
    return { className: "badge-neutral", label: status || "Unknown" };
  }

  return {
    className: matched.className,
    label: matched.label,
  };
};
