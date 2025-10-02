import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

const socket: Socket = io(import.meta.env.VITE_API_URL, {
  transports: ['websocket'],
});

export default socket;
