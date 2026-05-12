/** Enumeration va timing hujumlarini qiyinlashtirish uchun kichik tasodifiy kechikish (ms). */
export async function slightTimingJitter(): Promise<void> {
  const ms = 25 + Math.floor(Math.random() * 55);
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
