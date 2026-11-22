export function looksSpanishPrompt(prompt: string): boolean {
  const trimmed = prompt.trim();
  if (!trimmed) return false;
  if (/[áéíóúüñ¿¡]/i.test(trimmed)) return true;
  return /\b(de|del|la|el|los|las|un|una|con|para|sobre|entre|como|dibuja|genera|crea|muestra|imagen|diagrama|circuito|campo|carga|cargas|resistencia|bateria|corriente|esquema|espira|diodo|condensador|fisica|voltaje|flujo)\b/i.test(
    trimmed
  );
}

/**
 * Devuelve true solo si el mensaje del estudiante pide explícitamente un dibujo, diagrama o imagen.
 * Se usa para no generar diagramas que el estudiante no pidió.
 */
export function userAskedForDiagram(text: string): boolean {
  if (!text) return false;
  const t = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  // Verbos de dibujo en imperativo o infinitivo: dibuja, dibujame, ilustra, grafícame, esquematiza...
  if (/\b(dibuj(a|ame|amelo|amela|alo|ala|ar|arme|arlo|arla|en|es)|grafic(ame|amelo|ar|arme|arlo|arla|alo|ala)|ilustr(a|ame|ar|arme|alo|ala)|esquematiz(a|ame|ar|arlo))\b/.test(t)) {
    return true;
  }
  // "grafica" como orden (no como sustantivo "la gráfica de ..."): al inicio de la frase o después de "puedes", "y", "luego"...
  if (/(^|[.!?,;:]\s*|\b(puedes|podrias|quiero que|y|luego|tambien|ahora)\s+)grafica\b/.test(t)) {
    return true;
  }
  // Pedido + objeto visual: "genera un diagrama", "muéstrame una imagen", "hazme un esquema", "con un diagrama"
  if (/\b(genera|generame|generar|crea|creame|crear|haz|hazme|hacer|muestra|muestrame|mostrar|mostrarme|ensename|dame|quiero ver|con)\b[^.?!\n]{0,40}\b(imagen|diagrama|esquema|dibujo|ilustracion|figura|grafico)\b/.test(t)) {
    return true;
  }
  // Inglés
  return /\b(draw|sketch|illustrate)\b|\bshow me (a|an|the) (diagram|picture|image|sketch)\b/.test(t);
}

