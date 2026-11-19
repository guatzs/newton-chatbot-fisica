import { ChatMessage } from '../types';

function hasValidCreatedAt(msg: ChatMessage): boolean {
  return (
    typeof msg.createdAt === 'string' &&
    msg.createdAt.trim().length > 0 &&
    Number.isFinite(Date.parse(msg.createdAt))
  );
}

function completenessScore(msg: ChatMessage): number {
  let score = 0;
  if (msg.diagramUrl) score += 4;
  if (msg.imageUrl) score += 2;
  if (msg.imageNote) score += 1;
  if (hasValidCreatedAt(msg)) score += 0.5;
  return score;
}

export function chooseMoreCompleteMessage(current: ChatMessage, candidate: ChatMessage): ChatMessage {
  const currentScore = completenessScore(current);
  const candidateScore = completenessScore(candidate);
  const primary = candidateScore > currentScore ? candidate : current;
  const secondary = primary === candidate ? current : candidate;

  const merged: ChatMessage = {
    ...secondary,
    ...primary,
  };

  if (!merged.diagramUrl && secondary.diagramUrl) merged.diagramUrl = secondary.diagramUrl;
  if (!merged.imageUrl && secondary.imageUrl) merged.imageUrl = secondary.imageUrl;
  if (!merged.imageNote && secondary.imageNote) merged.imageNote = secondary.imageNote;
  if (!merged.diagramPrompt && secondary.diagramPrompt) merged.diagramPrompt = secondary.diagramPrompt;
  if (!merged.createdAt && secondary.createdAt) merged.createdAt = secondary.createdAt;

  if (merged.diagramUrl) {
    delete merged.diagramError;
    delete merged.diagramLoading;
  }

  return merged;
}

export function upsertMessageInList(list: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const next = [...list];
  const idx = next.findIndex((m) => m.id === message.id);
  if (idx >= 0) {
    next[idx] = message;
  } else {
    next.push(message);
  }
  return next;
}

/**
 * Fusiona mensajes de caché local y Firestore por `id` (eligiendo la versión más completa)
 * y ordena cronológicamente por `createdAt`, colocando antes los mensajes antiguos sin `createdAt`
 * en su orden de aparición original.
 */
export function mergeAndSortMessages(
  localMessages: ChatMessage[],
  remoteMessages: ChatMessage[]
): ChatMessage[] {
  const byId = new Map<string, { msg: ChatMessage; order: number }>();
  let nextOrder = 0;

  for (const msg of localMessages) {
    if (!msg || !msg.id) continue;
    const existing = byId.get(msg.id);
    if (existing) {
      existing.msg = chooseMoreCompleteMessage(existing.msg, msg);
    } else {
      byId.set(msg.id, { msg, order: nextOrder++ });
    }
  }

  for (const msg of remoteMessages) {
    if (!msg || !msg.id) continue;
    const existing = byId.get(msg.id);
    if (existing) {
      existing.msg = chooseMoreCompleteMessage(existing.msg, msg);
    } else {
      byId.set(msg.id, { msg, order: nextOrder++ });
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => {
      const aHas = hasValidCreatedAt(a.msg);
      const bHas = hasValidCreatedAt(b.msg);

      if (!aHas && !bHas) {
        return a.order - b.order;
      }
      if (!aHas) return -1;
      if (!bHas) return 1;

      const timeDiff = Date.parse(a.msg.createdAt!) - Date.parse(b.msg.createdAt!);
      if (timeDiff !== 0) return timeDiff;
      return a.order - b.order;
    })
    .map((entry) => entry.msg);
}

export type GeminiHistoryTurn = { role: 'user' | 'model'; parts: { text: string }[] };

/**
 * Construye el historial que se envía a Gemini a partir de los mensajes del chat:
 * descarta mensajes de error y vacíos (por ejemplo, una respuesta detenida antes de
 * escribir nada), une turnos seguidos del mismo rol, toma los últimos `limit` turnos
 * y garantiza que el historial empiece con un turno del usuario.
 */
export function buildGeminiHistory(messages: ChatMessage[], limit = 6): GeminiHistoryTurn[] {
  const turns: GeminiHistoryTurn[] = [];

  for (const m of messages) {
    if (!m || m.isError) continue;
    const text = (m.text || '').trim();
    if (!text) continue;
    const role = m.sender === 'user' ? 'user' : 'model';
    const last = turns[turns.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n\n${text}`;
    } else {
      turns.push({ role, parts: [{ text }] });
    }
  }

  const recent = turns.slice(-limit);
  while (recent.length > 0 && recent[0].role !== 'user') {
    recent.shift();
  }
  return recent;
}
