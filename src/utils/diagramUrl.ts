export function looksSpanishPrompt(prompt: string): boolean {
  const trimmed = prompt.trim();
  if (!trimmed) return false;
  if (/[áéíóúüñ¿¡]/i.test(trimmed)) return true;
  return /\b(de|del|la|el|los|las|un|una|con|para|sobre|entre|como|dibuja|genera|crea|muestra|imagen|diagrama|circuito|campo|carga|cargas|resistencia|bateria|corriente|esquema|espira|diodo|condensador|fisica|voltaje|flujo)\b/i.test(
    trimmed
  );
}

export function buildPollinationsImageUrl(englishPrompt: string): string {
  const cleaned = englishPrompt.trim().replace(/\s+/g, ' ');
  const encodedPrompt = encodeURIComponent(cleaned);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
}
