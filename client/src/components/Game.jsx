import React, {useEffect, useState} from 'react';

function Card({c, onPlay}){
  return (
    <div className="card" onClick={()=>onPlay && onPlay(c)}>
      <div>{c.rank}</div><div>{c.suit}</div>
    </div>
  );
}

export default function Game({socket, hand, trump, room, seat}){
  const [currentTrick, setCurrentTrick] = useState([]);
  const [turnIndex, setTurnIndex] = useState(null);
  const [error, setError] = useState('');

  useEffect(()=>{
    socket.on('trickUpdate', data => {setCurrentTrick(data.currentTrick); setTurnIndex(data.turnIndex);});
    socket.on('trickResolved', data => {
      alert(`Pli remporté par siège ${data.winnerSeat} (équipe ${data.winnerTeam})`);
      setTurnIndex(data.turnIndex);
      setCurrentTrick([]);
    });
    return ()=>socket.off('trickUpdate');
  },[]);

  const play = card => {
    socket.emit('playCard',{roomId:room.roomId, card}, res=>{
      if(res?.error) setError(res.error); else setError('');
    });
  };

  return (
    <div>
      <h3>Atout : {trump}</h3>
      <p>Votre siège : {seat}</p>
      <p>Tour actuel : {turnIndex}</p>
      {error && <p style={{color:'red'}}>{error}</p>}
      <div className="hand">{hand.map(c=><Card key={c.id} c={c} onPlay={play}/>)} </div>
      <div className="trick">{currentTrick.map((t,i)=>(<span key={i}>[s{t.seat}:{t.card.rank+t.card.suit}] </span>))}</div>
    </div>
  );
}
