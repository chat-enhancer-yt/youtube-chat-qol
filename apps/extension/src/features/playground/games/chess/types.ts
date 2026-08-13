import type {
  ChessGameStatus,
  PublicGame,
  PublicUserIdentity
} from '@chatenhancer/playground-core/protocol';

export type ChessPieceColor = 'black' | 'white';
export type ChessPromotionPiece = 'b' | 'n' | 'q' | 'r';

export interface ChessLastMove {
  from: string;
  promotion?: ChessPromotionPiece;
  to: string;
}

export interface PublicChessGame extends PublicGame {
  fen: string;
  gameType: 'chess';
  lastMove?: ChessLastMove;
  lastMoveSan?: string;
  pgn: string;
  players: Record<ChessPieceColor, PublicUserIdentity>;
  status: ChessGameStatus;
  turn: ChessPieceColor;
  winner?: ChessPieceColor;
}
