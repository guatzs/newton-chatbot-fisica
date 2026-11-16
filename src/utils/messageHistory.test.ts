import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChatMessage } from '../types';
import { mergeAndSortMessages, upsertMessageInList } from './messageHistory';

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
