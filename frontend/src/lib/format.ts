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
