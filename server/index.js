const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3001;

// --------------------------- Règles de jeu ---------------------------
const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['7', '8', '9', 'J', 'Q', 'K', '10', 'A'];

function createDeck() {
  const deck = [];
  for (let s of suits) {
    for (let r of ranks) deck.push({ suit: s, rank: r, id: r + s });
  }
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

const rooms = {};

function cardValue(card, trump, isTrump) {
  const order = isTrump
    ? ['7', '8', 'Q', 'K', '10', 'A', '9', 'J']
    : ['7', '8', '9', 'J', 'Q', 'K', '10', 'A'];
  const values = isTrump
    ? { '7': 0, '8': 0, 'Q': 3, 'K': 4, '10': 10, 'A': 11, '9': 14, 'J': 20 }
    : { '7': 0, '8': 0, '9': 0, 'J': 2, 'Q': 3, 'K': 4, '10': 10, 'A': 11 };
  return { order: order.indexOf(card.rank), points: values[card.rank] };
}

io.on('connection', (socket) => {
  console.log('Client connecté', socket.id);

  socket.on('joinRoom', ({ roomId, playerName }, callback) => {
    if (!rooms[roomId]) rooms[roomId] = { players: [], state: 'waiting' };
    const room = rooms[roomId];
    if (room.players.length >= 4) return callback({ error: 'Salle pleine' });

    const seat = room.players.length;
    const player = { id: socket.id, name: playerName, seat, hand: [] };
    room.players.push(player);
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', room);
    callback({ room });
  });

  socket.on('startRound', ({ roomId }, callback) => {
    const room = rooms[roomId];
    if (!room || room.players.length !== 4)
      return callback({ error: '4 joueurs nécessaires' });

    const deck = shuffle(createDeck());
    const hands = [deck.slice(0, 8), deck.slice(8, 16), deck.slice(16, 24), deck.slice(24, 32)];
    const trump = suits[Math.floor(Math.random() * suits.length)];
    room.trump = trump;
    room.hands = hands;
    room.currentTrick = [];
    room.turnIndex = 0;
    room.scores = room.scores || { team0: 0, team1: 0 };
    room.roundPoints = { team0: 0, team1: 0 };

    room.players.forEach((p, i) => io.to(p.id).emit('deal', { hand: hands[i], trump, seat: i }));
    io.to(roomId).emit('roundStarted', room);
  });

  socket.on('playCard', ({ roomId, card }, callback) => {
    const room = rooms[roomId];
    const player = room.players.find((p) => p.id === socket.id);
    if (!room || !player) return callback({ error: 'Erreur de salle' });
    if (room.turnIndex !== player.seat) return callback({ error: 'Pas votre tour' });

    const cardIdx = room.hands[player.seat].findIndex((c) => c.id === card.id);
    if (cardIdx === -1) return callback({ error: 'Carte introuvable' });

    const playedCard = room.hands[player.seat].splice(cardIdx, 1)[0];
    room.currentTrick.push({ seat: player.seat, card: playedCard });

    room.turnIndex = (room.turnIndex + 1) % 4;
    io.to(roomId).emit('trickUpdate', { currentTrick: room.currentTrick, turnIndex: room.turnIndex });

    if (room.currentTrick.length === 4) {
      const leadSuit = room.currentTrick[0].card.suit;
      let best = null;
      room.currentTrick.forEach((p) => {
        const isTrump = p.card.suit === room.trump;
        const follows = p.card.suit === leadSuit;
        const v = cardValue(p.card, room.trump, isTrump);
        if (!best) best = { ...p, v };
        else {
          if (best.card.suit === room.trump) {
            if (isTrump && v.order > best.v.order) best = { ...p, v };
          } else if (isTrump) best = { ...p, v };
          else if (follows && p.card.suit === best.card.suit && v.order > best.v.order) best = { ...p, v };
        }
      });
      const winnerSeat = best.seat;
      const winnerTeam = winnerSeat % 2 === 0 ? 'team0' : 'team1';
      const totalPoints = room.currentTrick.reduce((sum, p) => {
        const v = cardValue(p.card, room.trump, p.card.suit === room.trump);
        return sum + v.points;
      }, 0);
      room.roundPoints[winnerTeam] += totalPoints;
      room.currentTrick = [];
      room.turnIndex = winnerSeat;
      io.to(roomId).emit('trickResolved', { winnerSeat, winnerTeam, turnIndex: winnerSeat });
    }
  });
});

server.listen(PORT, () => console.log('Serveur en écoute sur le port', PORT));
