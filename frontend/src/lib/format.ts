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
