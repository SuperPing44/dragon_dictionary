const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "Today", or a date like "21 Oct 2026", in local time. */
export function formatDay(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (date.toDateString() === now.toDateString()) return "Today";
  const day = String(date.getDate()).padStart(2, "0");
  return `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

/** Spells out 0–99 ("twenty-three"); larger numbers stay as digits. */
export function numberInWords(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) {
    const ones = n % 10;
    return ones ? `${TENS[Math.floor(n / 10)]}-${ONES[ones]}` : TENS[n / 10];
  }
  return String(n);
}

/** The idea list subtitle, e.g. "Twenty-three ideas sleeping in the hoard". */
export function ideaCountLine(n: number): string {
  if (n === 0) return "The hoard is empty";
  const words = numberInWords(n);
  const capitalised = words.charAt(0).toUpperCase() + words.slice(1);
  return `${capitalised} ${n === 1 ? "idea" : "ideas"} sleeping in the hoard`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** How many items use a category, e.g. "4 ideas, 2 video projects". */
export function usageLine(ideas: number, videoProjects: number): string {
  const parts = [
    ideas > 0 && plural(ideas, "idea"),
    videoProjects > 0 && plural(videoProjects, "video project"),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "unused";
}

/** The same counts for a sentence, e.g. "7 ideas and 3 video projects". */
export function usageSentence(ideas: number, videoProjects: number): string {
  return usageLine(ideas, videoProjects).replace(", ", " and ");
}

const DAY_MS = 86_400_000;

/** Whole calendar days between two local dates (0 = same day). */
function calendarDaysBetween(earlier: Date, later: Date): number {
  const start = new Date(
    earlier.getFullYear(),
    earlier.getMonth(),
    earlier.getDate(),
  );
  const end = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

function daysAgo(date: Date, now: Date): string {
  const days = calendarDaysBetween(date, now);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 35) return `${plural(Math.floor(days / 7), "week")} ago`;
  return `on ${formatDay(date.toISOString(), now)}`;
}

/** "created today" for an untouched project, else "edited 2 hours ago". */
export function editedLine(
  created: string,
  updated: string,
  now = new Date(),
): string {
  if (created === updated) return `created ${daysAgo(new Date(created), now)}`;
  const date = new Date(updated);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "edited just now";
  if (minutes < 60) return `edited ${plural(minutes, "minute")} ago`;
  if (calendarDaysBetween(date, now) === 0) {
    return `edited ${plural(Math.floor(minutes / 60), "hour")} ago`;
  }
  return `edited ${daysAgo(date, now)}`;
}

/** The video projects subtitle, e.g. "Five tales in the making". */
export function projectCountLine(n: number): string {
  if (n === 0) return "No tales in the making yet";
  const words = numberInWords(n);
  const capitalised = words.charAt(0).toUpperCase() + words.slice(1);
  return `${capitalised} ${n === 1 ? "tale" : "tales"} in the making — most recently touched first`;
}

/**
 * Estimated speaking time for a word count: words ÷ rate, rounded to the
 * nearest 5 s, as "≈ m:ss", or "≈ h:mm:ss" from an hour on.
 */
export function speakingTime(words: number, wordsPerMinute: number): string {
  const seconds = Math.round(((words / wordsPerMinute) * 60) / 5) * 5;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h > 0 ? `≈ ${h}:${String(m).padStart(2, "0")}:${s}` : `≈ ${m}:${s}`;
}

/** "1 word", "2,180 words". */
export function wordsLine(words: number): string {
  return `${words.toLocaleString("en")} ${words === 1 ? "word" : "words"}`;
}

/** The library subtitle, e.g. "Forty-eight sources, one shared hoard". */
export function sourceCountLine(n: number): string {
  if (n === 0) return "The hoard of sources is empty";
  const words = numberInWords(n);
  const capitalised = words.charAt(0).toUpperCase() + words.slice(1);
  return `${capitalised} ${n === 1 ? "source" : "sources"}, one shared hoard`;
}

/** A file size as people read it: "860 KB", "2.4 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  const mb = bytes / 1_000_000;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** When a backup ran: "Today, 09:12", "Yesterday, 18:40" or "21 Oct 2026, 09:12". */
export function backupWhen(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const days = calendarDaysBetween(date, now);
  const day =
    days === 0 ? "Today" : days === 1 ? "Yesterday" : formatDay(iso, now);
  return `${day}, ${time}`;
}

/** How old the last good backup is: "5 hours ago", "3 days ago". */
export function backupAge(iso: string, now = new Date()): string {
  const hours = Math.floor((now.getTime() - Date.parse(iso)) / 3_600_000);
  if (hours < 1) return "less than an hour ago";
  if (hours < 24) return `${plural(hours, "hour")} ago`;
  return `${plural(Math.floor(hours / 24), "day")} ago`;
}
