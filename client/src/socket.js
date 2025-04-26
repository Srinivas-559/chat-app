import { io } from 'socket.io-client';

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io('http://localhost:5001', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};