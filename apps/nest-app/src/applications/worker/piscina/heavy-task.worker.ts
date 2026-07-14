/**
 * Simulate a CPU-intensive task (prime number counting).
 * Piscina expects the worker file to export a default function.
 * The argument passed to pool.run() is received here.
 */
export default function countPrimes(max: number): number {
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
  }
  return count;
}
