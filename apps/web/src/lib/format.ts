export function formatPercent(value?: number | null) {
  if (value == null) {
    return "0%";
  }

  return `${Math.round(value * 100)}%`;
}

export function formatRelativeDate(input?: string | null) {
  if (!input) {
    return "just now";
  }

  const date = new Date(input);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatMinutes(minutes?: number | null) {
  if (!minutes) {
    return "Instant";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  return `${Math.round(minutes / 60)} hr`;
}

export function formatFormat(format: string) {
  return format.toLowerCase();
}
