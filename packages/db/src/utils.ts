export function jstNow(): string {
  return toJstString(new Date());
}

export function toJstString(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().replace("Z", "+09:00");
}

export function isTimeBefore(a: string, b: string): boolean {
  return new Date(a).getTime() < new Date(b).getTime();
}
