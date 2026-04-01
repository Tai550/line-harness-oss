export function addJitter(base: number, jitterRange: number): number {
  return base + Math.floor(Math.random() * jitterRange);
}

export function addMessageVariation(text: string): string {
  const invisibles = ["\u200B", "\u200C", "\u200D", "\uFEFF"];
  const char = invisibles[Math.floor(Math.random() * invisibles.length)];
  return text + char;
}

export function calculateStaggerDelay(batchIndex: number, totalRecipients: number): number {
  if (totalRecipients >= 1000) {
    return batchIndex * Math.floor(300000 / Math.ceil(totalRecipients / 500));
  } else if (totalRecipients >= 100) {
    return batchIndex * 1000;
  }
  return 0;
}

export function jitterDeliveryTime(scheduledAt: string): string {
  const jitter = (Math.random() - 0.5) * 10 * 60 * 1000; // ±5 min
  return new Date(new Date(scheduledAt).getTime() + jitter).toISOString();
}

export class StealthRateLimiter {
  private calls: number[] = [];
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit = 1000, windowMs = 60000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  canCall(): boolean {
    const now = Date.now();
    this.calls = this.calls.filter((t) => now - t < this.windowMs);
    if (this.calls.length >= this.limit) return false;
    this.calls.push(now);
    return true;
  }
}
