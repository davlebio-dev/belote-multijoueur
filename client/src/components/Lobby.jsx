import React, {useState} from 'react';

export default function Lobby({socket, setRoom}){
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');

  const join = () => {
    socket.emit('joinRoom', {roomId, playerName}, res => {
      if(res?.error) alert(res.error); else setRoom(res.room);
    });
  };

  return (
    <div>
      <h2>Rejoindre une salle</h2>
      <input placeholder="Nom" value={playerName} onChange={e=>setPlayerName(e.target.value)} />
      <input placeholder="ID salle" value={roomId} onChange={e=>setRoomId(e.target.value)} />
      <button onClick={join}>Rejoindre</button>
    </div>
  );
}
