import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChatMessage } from '../types';
import { buildGeminiHistory, mergeAndSortMessages, upsertMessageInList } from './messageHistory';

function makeMsg(overrides: Partial<ChatMessage> & { id: string }): ChatMessage {
  return {
    sessionId: 'session-1',
    sender: 'user',
    text: 'hola',
    timestamp: '11:13 PM',
    ...overrides,
  };
}

describe('upsertMessageInList', () => {
  it('replaces existing message with same id instead of duplicating', () => {
    const m1 = makeMsg({ id: 'bot-1', sender: 'bot', text: 'explicacion', diagramPrompt: 'circuit' });
    const m1WithDiagram = makeMsg({
      id: 'bot-1',
      sender: 'bot',
      text: 'explicacion',
      diagramPrompt: 'circuit',
      diagramUrl: 'https://storage.example/bot-1.jpg',
    });

    const once = upsertMessageInList([], m1);
    const twice = upsertMessageInList(once, m1WithDiagram);

    assert.equal(twice.length, 1);
    assert.equal(twice[0].diagramUrl, 'https://storage.example/bot-1.jpg');
  });
});

describe('mergeAndSortMessages', () => {
  it('orders messages with createdAt chronologically regardless of locale timestamp string', () => {
    const mLate = makeMsg({
      id: 'm1',
      timestamp: '11:59 PM',
      createdAt: '2026-11-15T23:59:00.000Z',
    });
    const mMidnight = makeMsg({
      id: 'm2',
      sender: 'bot',
      timestamp: '12:01 AM',
      createdAt: '2026-11-16T00:01:00.000Z',
    });

    // Firestore without orderBy might return 12:01 AM before 11:59 PM
    const result = mergeAndSortMessages([], [mMidnight, mLate]);
    assert.deepEqual(
      result.map((m) => m.id),
      ['m1', 'm2']
    );
  });

  it('places legacy messages without createdAt before dated messages while preserving appearance order', () => {
    const old1 = makeMsg({ id: 'old-1', timestamp: '10:00 AM' });
    const old2 = makeMsg({ id: 'old-2', sender: 'bot', timestamp: '10:01 AM' });
    const new1 = makeMsg({
      id: 'new-1',
      timestamp: '09:00 AM',
      createdAt: '2026-11-16T09:00:00.000Z',
    });

    const result = mergeAndSortMessages([old1, old2], [new1, old2, old1]);
    assert.deepEqual(
      result.map((m) => m.id),
      ['old-1', 'old-2', 'new-1']
    );
  });

  it('deduplicates by id across localStorage and Firestore and keeps the more complete version', () => {
    const localBot = makeMsg({
      id: 'bot-1',
      sender: 'bot',
      diagramPrompt: 'dipole',
      createdAt: '2026-11-15T20:00:01.000Z',
    });
    const remoteBot = makeMsg({
      id: 'bot-1',
      sender: 'bot',
      diagramPrompt: 'dipole',
      diagramUrl: 'https://storage.example/bot-1.jpg',
      createdAt: '2026-11-15T20:00:01.000Z',
    });

    const localUser = makeMsg({
      id: 'usr-1',
      imageUrl: 'https://storage.example/usr-1.jpg',
      createdAt: '2026-11-15T20:00:00.000Z',
    });
    const remoteUser = makeMsg({
      id: 'usr-1',
      imageNote: 'Imagen adjunta: ejercicio escaneado',
      createdAt: '2026-11-15T20:00:00.000Z',
    });

    const result = mergeAndSortMessages([localBot, localUser], [remoteUser, remoteBot]);
    assert.equal(result.length, 2);
    assert.equal(result[0].id, 'usr-1');
    assert.equal(result[0].imageUrl, 'https://storage.example/usr-1.jpg');
    assert.equal(result[1].id, 'bot-1');
    assert.equal(result[1].diagramUrl, 'https://storage.example/bot-1.jpg');
  });
});

describe('buildGeminiHistory', () => {
  const msg = (id: string, sender: 'user' | 'bot', text: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
    id,
    sessionId: 's1',
    sender,
    text,
    timestamp: '10:00',
    ...extra,
  });

  it('descarta errores y mensajes vacíos y une turnos seguidos del mismo rol', () => {
    const history = buildGeminiHistory([
      msg('u1', 'user', '¿Qué es la ley de Ohm?'),
      msg('b1', 'bot', '', { stopped: true }),
      msg('u2', 'user', 'Explícalo con un ejemplo'),
      msg('e1', 'bot', 'No pude conectarme', { isError: true }),
      msg('b2', 'bot', 'V = I·R. Por ejemplo...'),
    ]);
    assert.deepEqual(history, [
      { role: 'user', parts: [{ text: '¿Qué es la ley de Ohm?\n\nExplícalo con un ejemplo' }] },
      { role: 'model', parts: [{ text: 'V = I·R. Por ejemplo...' }] },
    ]);
  });

  it('conserva una respuesta detenida a medias como turno del modelo', () => {
    const history = buildGeminiHistory([
      msg('u1', 'user', 'Pregunta'),
      msg('b1', 'bot', 'Respuesta parcial', { stopped: true }),
    ]);
    assert.equal(history.length, 2);
    assert.equal(history[1].role, 'model');
    assert.equal(history[1].parts[0].text, 'Respuesta parcial');
  });

  it('toma los últimos turnos y siempre empieza con el usuario', () => {
    const msgs: ChatMessage[] = [];
    for (let i = 0; i < 5; i++) {
      msgs.push(msg(`u${i}`, 'user', `p${i}`));
      msgs.push(msg(`b${i}`, 'bot', `r${i}`));
    }
    const history = buildGeminiHistory(msgs, 5);
    assert.equal(history[0].role, 'user');
    assert.equal(history.length, 4);
    assert.equal(history[3].parts[0].text, 'r4');
  });
});
