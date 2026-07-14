import { parentPort } from "node:worker_threads";

/**
 * CPU-intensive prime counting with progress reporting.
 * Accepts { max, requestId } — sends periodic progress via parentPort,
 * returns final count.
 */
export default function countPrimes(task: {
  max: number;
  requestId: string;
}): number {
  const { max, requestId } = task;
  const step = Math.max(1, Math.floor(max / 10)); // ~10 progress updates
  let count = 0;

  for (let n = 2; n <= max; n++) {
    let isPrime = true;
    for (let i = 2; i * i <= n; i++) {
      if (n % i === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) count++;

    if (n % step === 0) {
      const percent = Math.round((n / max) * 100);
      parentPort?.postMessage({ requestId, percent });
    }
  }

  return count;
}
