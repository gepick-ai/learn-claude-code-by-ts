/** 东八区（Asia/Shanghai）墙钟时间，格式 `YYYY-MM-DD HH:mm:ss`。 */
export function formatChinaDateTimeToSeconds(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d)

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ""

  const y = pick("year")
  const mo = pick("month").padStart(2, "0")
  const da = pick("day").padStart(2, "0")
  const h = pick("hour").padStart(2, "0")
  const mi = pick("minute").padStart(2, "0")
  const s = pick("second").padStart(2, "0")

  return `${y}-${mo}-${da} ${h}:${mi}:${s}`
}
