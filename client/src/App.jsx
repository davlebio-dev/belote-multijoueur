import React, {useEffect, useState} from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import Game from './components/Game';

const socket = io();

export default function App(){
  const [room, setRoom] = useState(null);
  const [hand, setHand] = useState([]);
  const [trump, setTrump] = useState(null);
  const [seat, setSeat] = useState(null);
  const [inGame, setInGame] = useState(false);
  const [scores, setScores] = useState({team0:0, team1:0});

  useEffect(()=>{
    socket.on('roomUpdate', r => setRoom(r));
    socket.on('deal', ({hand, trump, seat}) => {setHand(hand); setTrump(trump); setSeat(seat);});
    socket.on('roundStarted', r => {setInGame(true); setRoom(r);});
    socket.on('roundEnded', ({roundPoints, scores}) => {
      alert(`Manche terminée! Points: Équipe0=${roundPoints.team0}, Équipe1=${roundPoints.team1}`);
      setScores(scores);
      setInGame(false);
    });
    socket.on('connect_error', err => alert('Erreur de connexion : '+err.message));
    return ()=>socket.off();
  },[]);

  return (
    <div className="app">
      <h1>Belote Multijoueur</h1>
      {!room && <Lobby socket={socket} setRoom={setRoom} />}
      {room && !inGame && <div>
        <h3>Salle {room.roomId}</h3>
        <button onClick={()=>socket.emit('startRound',{roomId:room.roomId}, res=>res?.error && alert(res.error))}>Démarrer la manche</button>
        <ul>{room.players.map(p=><li key={p.seat}>{p.name} (siège {p.seat})</li>)}</ul>
        <p>Scores: Équipe0={scores.team0} / Équipe1={scores.team1}</p>
      </div>}
      {inGame && <Game socket={socket} hand={hand} trump={trump} room={room} seat={seat}/>}    
    </div>
  );
}
