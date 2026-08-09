/** Deterministic Playground game state used by browser scenarios. */
import type {
  GameId,
  PublicGame,
  PublicInvite
} from '@chatenhancer/playground-core/protocol';
import type { PublicStickAroundGame } from '@chatenhancer/playground-core/stick-around';

export const PLAYGROUND_ENABLED_OPTIONS = {
  playgroundEnabled: true,
  playgroundGamesAvailable: true
};

interface BrowserInviteOptions {
  gameId?: GameId;
  inviteId?: string;
}

export function createBrowserInvite({
  gameId = 'chess',
  inviteId = 'browser-invite-chess'
}: BrowserInviteOptions = {}): PublicInvite {
  const now = Date.now();
  return {
    createdAt: now,
    expiresAt: now + 60_000,
    fromUser: {
      displayName: 'Luna Chat',
      userId: 'luna-user'
    },
    gameId,
    inviteId,
    status: 'pending',
    toUser: {
      displayName: 'Browser Viewer',
      userId: 'browser-user'
    }
  };
}

interface BrowserChessGameOptions {
  fen?: string;
  gameId?: string;
  pgn?: string;
  status?: 'active' | 'checkmate' | 'draw' | 'resigned';
  turn?: 'black' | 'white';
}

export function createBrowserChessGame({
  fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  gameId = 'browser-chess-game',
  pgn = '',
  status = 'active',
  turn = 'white'
}: BrowserChessGameOptions = {}): PublicGame {
  return {
    fen,
    gameId,
    gameType: 'chess',
    pgn,
    players: {
      black: {
        displayName: 'Luna Chat',
        userId: 'luna-user'
      },
      white: {
        displayName: 'Browser Viewer',
        userId: 'browser-user'
      }
    },
    status,
    turn
  } as PublicGame;
}

export function createBrowserReplayTriviaGame(phaseStartedAt = Date.now()): PublicGame {
  return {
    answers: {},
    currentQuestion: {
      choices: ['Choice A', 'Choice B', 'Choice C', 'Choice D'],
      friendIntro: 'help me answer this',
      id: 'question-1',
      prompt: 'Which answer should I choose?',
      rightReply: 'that helped',
      wrongReply: 'not quite'
    },
    currentQuestionIndex: 0,
    gameId: 'browser-replay-trivia-game',
    gameType: 'replay-trivia',
    phaseStartedAt,
    players: {
      guest: {
        displayName: 'Luna Chat',
        userId: 'luna-user'
      },
      host: {
        displayName: 'Browser Viewer',
        userId: 'browser-user'
      }
    },
    questionProviderUserId: 'browser-user',
    scores: {
      guest: 0,
      host: 0
    },
    status: 'question',
    totalQuestions: 1
  } as PublicGame;
}

interface BrowserBountyHuntingGameOptions {
  claimedMessageId?: string;
  gameId?: string;
  missCooldownUntil?: number;
  phaseStartedAt?: number;
  roundStartTimestampUsec?: string;
  status?: 'active' | 'countdown';
}

export function createBrowserBountyHuntingGame({
  claimedMessageId,
  gameId = 'browser-bounty-game',
  missCooldownUntil,
  phaseStartedAt,
  roundStartTimestampUsec,
  status = 'active'
}: BrowserBountyHuntingGameOptions = {}): PublicGame {
  const now = Date.now();
  const startedAt = phaseStartedAt ?? now - 1_000;
  const bounties = [
    {
      amount: 125,
      description: 'a message that mentions a user',
      id: 'mention-user',
      matcher: { kind: 'mention' },
      ...(claimedMessageId
        ? {
            claim: {
              bountyId: 'mention-user',
              claimedAt: now,
              messageId: claimedMessageId,
              role: 'host',
              userId: 'browser-user'
            }
          }
        : {})
    }
  ];

  return {
    bounties,
    bountyProviderUserId: 'browser-user',
    gameId,
    gameType: 'bounty-hunting',
    ...(missCooldownUntil ? { missCooldownUntil } : {}),
    phaseStartedAt: startedAt,
    players: {
      guest: {
        displayName: 'Computer (Bounty Hunter)',
        userId: 'server:computer:bounty-hunting'
      },
      host: {
        displayName: 'Browser Viewer',
        userId: 'browser-user'
      }
    },
    readyPlayers: {
      guest: true,
      host: true
    },
    roundEndsAt: now + 59_000,
    ...(roundStartTimestampUsec ? { roundStartTimestampUsec } : {}),
    scores: {
      guest: 0,
      host: claimedMessageId ? 125 : 0
    },
    status
  } as PublicGame;
}

export function createBrowserStickAroundGame(
  overrides: Partial<PublicStickAroundGame> = {}
): PublicStickAroundGame {
  const now = Date.now();
  const status = overrides.status || 'ready';
  return {
    finishReports: {},
    gameId: 'browser-stick-around-game',
    gameType: 'stick-around',
    hazards: [],
    inputs: {},
    phaseStartedAt: now,
    players: {
      guest: {
        displayName: 'Computer (Stick Around!)',
        userId: 'server:computer:stick-around'
      },
      host: {
        displayName: 'Browser Viewer',
        userId: 'browser-user'
      }
    },
    readyPlayers:
      status === 'ready'
        ? {}
        : {
            guest: true,
            host: true
          },
    roundStartedAt: status === 'ready' ? undefined : now,
    roundSeed: 12345,
    status,
    ...overrides
  };
}

export function getFixtureMessageTimestampUsec(messageId: string): string {
  const match = /^fixture-message-(\d+)$/.exec(messageId);
  if (!match) throw new Error(`Unexpected fixture message id: ${messageId}`);
  return String(1780000000000000 + Number(match[1]));
}
