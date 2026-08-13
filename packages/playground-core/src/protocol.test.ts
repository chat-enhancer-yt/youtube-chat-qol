import { afterEach, describe, expect, it, vi } from 'vitest';

interface PlaygroundBackendGlobal {
  YTCQ_PLAYGROUND_BACKEND_ORIGIN?: string;
}

describe('playground protocol', () => {
  afterEach(() => {
    delete (globalThis as PlaygroundBackendGlobal).YTCQ_PLAYGROUND_BACKEND_ORIGIN;
  });

  it('uses the production playground backend by default', async () => {
    vi.resetModules();

    const protocol = await import('./protocol');

    expect(protocol.PLAYGROUND_BACKEND_ORIGIN).toBe('https://playground.chatenhancer.com');
  });

  it('normalizes a local playground backend override', async () => {
    vi.resetModules();
    (globalThis as PlaygroundBackendGlobal).YTCQ_PLAYGROUND_BACKEND_ORIGIN = 'http://127.0.0.1:8787/';

    const protocol = await import('./protocol');

    expect(protocol.PLAYGROUND_BACKEND_ORIGIN).toBe('http://127.0.0.1:8787');
  });

  it('ignores invalid playground backend overrides', async () => {
    vi.resetModules();
    (globalThis as PlaygroundBackendGlobal).YTCQ_PLAYGROUND_BACKEND_ORIGIN = 'ws://127.0.0.1:8787';

    const protocol = await import('./protocol');

    expect(protocol.PLAYGROUND_BACKEND_ORIGIN).toBe('https://playground.chatenhancer.com');
  });

  it('recognizes game-scoped computer player ids', async () => {
    vi.resetModules();

    const protocol = await import('./protocol');

    expect(protocol.isPlaygroundComputerUserId('server:computer:chess:club')).toBe(true);
    expect(protocol.isPlaygroundComputerUserId('server:computer:bounty-hunting')).toBe(true);
    expect(protocol.isPlaygroundComputerUserId('server:computer')).toBe(false);
    expect(protocol.isPlaygroundComputerUserId('human-user')).toBe(false);
  });

  it('matches game versions exactly and treats missing versions as version one', async () => {
    vi.resetModules();

    const protocol = await import('./protocol');

    expect(protocol.PLAYGROUND_PROTOCOL_VERSION).toBe(1);
    expect(protocol.PLAYGROUND_GAME_VERSIONS).toEqual({
      'bounty-hunting': 2,
      chess: 1,
      'replay-trivia': 2,
      'stick-around': 1
    });
    expect(protocol.isPlaygroundGameVersionCompatible('bounty-hunting')).toBe(false);
    expect(protocol.isPlaygroundGameVersionCompatible('chess')).toBe(true);
    expect(protocol.isPlaygroundGameVersionCompatible('bounty-hunting', {
      'bounty-hunting': 2
    })).toBe(true);
    expect(protocol.isPlaygroundGameVersionCompatible('bounty-hunting', {
      'bounty-hunting': 3
    })).toBe(false);
    expect(protocol.isPlaygroundGameVersionCompatible('replay-trivia')).toBe(false);
    expect(protocol.isPlaygroundGameVersionCompatible('replay-trivia', {
      'replay-trivia': 2
    })).toBe(true);
    expect(protocol.filterCompatiblePlaygroundGames(['chess', 'bounty-hunting'], undefined)).toEqual(['chess']);
  });

  it('classifies terminal statuses for every Playground game', async () => {
    vi.resetModules();

    const protocol = await import('./protocol');

    expect(protocol.PLAYGROUND_GAME_STATUSES.chess).toEqual([
      'active', 'checkmate', 'draw', 'resigned'
    ]);
    expect(protocol.PLAYGROUND_GAME_STATUSES['bounty-hunting']).toEqual([
      'active', 'countdown', 'finished', 'preparing', 'ready', 'roundOver'
    ]);
    expect(protocol.PLAYGROUND_GAME_STATUSES['replay-trivia']).toEqual([
      'preparing', 'countdown', 'question', 'reveal', 'score', 'finished'
    ]);
    expect(protocol.PLAYGROUND_GAME_STATUSES['stick-around']).toEqual([
      'ready', 'countdown', 'active', 'finished'
    ]);
    expect(protocol.PLAYGROUND_TERMINAL_GAME_STATUSES).toEqual({
      'bounty-hunting': ['finished'],
      chess: ['checkmate', 'draw', 'resigned'],
      'replay-trivia': ['finished'],
      'stick-around': ['finished']
    });
    expect(protocol.isPlaygroundGameTerminal({ gameType: 'chess', status: 'active' })).toBe(false);
    expect(protocol.isPlaygroundGameTerminal({ gameType: 'chess', status: 'checkmate' })).toBe(true);
    expect(protocol.isPlaygroundGameTerminal({ gameType: 'chess', status: 'draw' })).toBe(true);
    expect(protocol.isPlaygroundGameTerminal({ gameType: 'chess', status: 'resigned' })).toBe(true);
    expect(protocol.isPlaygroundGameTerminal({ gameType: 'bounty-hunting', status: 'roundOver' })).toBe(false);
    expect(protocol.isPlaygroundGameTerminal({ gameType: 'bounty-hunting', status: 'finished' })).toBe(true);
    expect(protocol.isPlaygroundGameTerminal({ gameType: 'replay-trivia', status: 'score' })).toBe(false);
    expect(protocol.isPlaygroundGameTerminal({ gameType: 'replay-trivia', status: 'finished' })).toBe(true);
    expect(protocol.isPlaygroundGameTerminal({ gameType: 'stick-around', status: 'finished' })).toBe(true);
  });
});
