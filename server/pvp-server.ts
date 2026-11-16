import { createServer } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import {
  MOVES_PER_TURN,
  advanceTurnState,
  applyMatchImpact,
  applySwap,
  buildBattleTeam,
  castLegendSkill,
  createBoard,
} from '../src/game/engine.ts';
import type { BattleTeam, GemCell, GridPos } from '../src/game/types.ts';

interface PlayerSocket {
  ws: WebSocket;
  side: 0 | 1;
  name: string;
  squad: Array<{ id: string; level: number }>;
}

interface RoomState {
  code: string;
  players: PlayerSocket[];
  board: GemCell[][];
  teams: [BattleTeam, BattleTeam] | null;
  turn: 0 | 1;
  round: number;
  movesLeft: number;
  winner: 0 | 1 | null;
  lastEvent: string;
}

const PORT = Number(process.env.PORT ?? 8787);
const rooms = new Map<string, RoomState>();

function makeRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? makeRoomCode() : code;
}

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastSnapshot(room: RoomState): void {
  if (!room.teams) return;
  for (const player of room.players) {
    sendJson(player.ws, {
      type: 'snapshot',
      snapshot: {
        roomCode: room.code,
        side: player.side,
        turn: room.turn,
        round: room.round,
        movesLeft: room.movesLeft,
        winner: room.winner,
        board: room.board,
        teams: room.teams,
        lastEvent: room.lastEvent,
      },
    });
  }
}

function applyRoomAdvance(
  room: RoomState,
  actionType: 'swap' | 'skill',
  extraMove: boolean,
): void {
  if (!room.teams) return;
  const next = advanceTurnState(
    room.turn,
    room.round,
    room.movesLeft,
    room.teams,
    actionType,
    extraMove,
  );
  if (next.burnDamage > 0) {
    room.lastEvent += ` (${room.teams[next.turn].name} took ${next.burnDamage} burn DMG)`;
  }
  room.turn = next.turn;
  room.round = next.round;
  room.movesLeft = next.movesLeft;
  room.winner = next.winner;
}

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let joinedRoom: RoomState | null = null;
  let playerSide: 0 | 1 = 0;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(String(raw)) as {
        type: string;
        roomCode?: string;
        name?: string;
        squad?: Array<{ id: string; level: number }>;
        a?: GridPos;
        b?: GridPos;
        legendIndex?: number;
      };

      if (msg.type === 'create_room') {
        const code = makeRoomCode();
        const squad = Array.isArray(msg.squad) && msg.squad.length > 0
          ? msg.squad.slice(0, 5)
          : [{ id: 'solfox', level: 1 }];
        const room: RoomState = {
          code,
          players: [{ ws, side: 0, name: msg.name?.trim() || 'Player 1', squad }],
          board: createBoard(),
          teams: null,
          turn: 0,
          round: 1,
          movesLeft: MOVES_PER_TURN,
          winner: null,
          lastEvent: 'Waiting for opponent...',
        };
        rooms.set(code, room);
        joinedRoom = room;
        playerSide = 0;
        sendJson(ws, { type: 'room_created', roomCode: code });
        return;
      }

      if (msg.type === 'join_room') {
        const code = (msg.roomCode ?? '').trim().toUpperCase();
        const room = rooms.get(code);
        if (!room || room.players.length >= 2) {
          sendJson(ws, { type: 'error', message: 'Room not found or full.' });
          return;
        }
        const squad = Array.isArray(msg.squad) && msg.squad.length > 0
          ? msg.squad.slice(0, 5)
          : [{ id: 'frostkit', level: 1 }];
        room.players.push({ ws, side: 1, name: msg.name?.trim() || 'Player 2', squad });
        room.teams = [
          buildBattleTeam(room.players[0].name, room.players[0].squad),
          buildBattleTeam(room.players[1].name, room.players[1].squad),
        ];
        room.lastEvent = 'Match started!';
        joinedRoom = room;
        playerSide = 1;
        broadcastSnapshot(room);
        return;
      }

      if (!joinedRoom || !joinedRoom.teams || joinedRoom.winner !== null) return;
      if (joinedRoom.turn !== playerSide) {
        sendJson(ws, { type: 'error', message: 'Not your turn.' });
        return;
      }

      if (msg.type === 'swap' && msg.a && msg.b) {
        const res = applySwap(joinedRoom.board, msg.a, msg.b);
        if (!res.valid) return;
        joinedRoom.board = res.finalBoard;
        const defenderSide: 0 | 1 = playerSide === 0 ? 1 : 0;
        const impact = applyMatchImpact(
          joinedRoom.teams[playerSide],
          joinedRoom.teams[defenderSide],
          res,
        );
        joinedRoom.lastEvent = `${joinedRoom.teams[playerSide].name}: +${impact.scoreGained} pts${res.extraTurn ? ' (Extra Move!)' : ''}`;
        applyRoomAdvance(joinedRoom, 'swap', res.extraTurn);
        broadcastSnapshot(joinedRoom);
        return;
      }

      if (msg.type === 'cast_skill' && typeof msg.legendIndex === 'number') {
        const defenderSide: 0 | 1 = playerSide === 0 ? 1 : 0;
        const cast = castLegendSkill(
          joinedRoom.teams[playerSide],
          joinedRoom.teams[defenderSide],
          msg.legendIndex,
          joinedRoom.board,
        );
        if (!cast) return;
        joinedRoom.board = cast.board;
        joinedRoom.lastEvent = cast.summary;
        applyRoomAdvance(joinedRoom, 'skill', cast.extraTurn);
        broadcastSnapshot(joinedRoom);
      }
    } catch {
      sendJson(ws, { type: 'error', message: 'Malformed request.' });
    }
  });

  ws.on('close', () => {
    if (!joinedRoom) return;
    joinedRoom.players = joinedRoom.players.filter((p) => p.ws !== ws);
    if (joinedRoom.players.length === 0) {
      rooms.delete(joinedRoom.code);
    } else {
      sendJson(joinedRoom.players[0].ws, { type: 'error', message: 'Opponent disconnected.' });
      rooms.delete(joinedRoom.code);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Little Legends PvP WebSocket server listening on ws://localhost:${PORT}`);
});
