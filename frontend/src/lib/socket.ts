import { io, Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:3000';

let socket: Socket | null = null;
let rececaoSocket: Socket | null = null;

/**
 * Devolve (e cria se necessário) a instância partilhada do socket.
 * O namespace '/marcacoes' corresponde ao MarcacaoGateway no backend.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${BACKEND_URL}/marcacoes`, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('[Socket] Ligado ao servidor WebSocket (/marcacoes)');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Desligado:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Erro de ligação:', err.message);
    });
  }

  return socket;
}

/**
 * Destrói a instância (útil no logout).
 */
export function getRececaoSocket(): Socket {
  if (!rececaoSocket) {
    rececaoSocket = io(`${BACKEND_URL}/rececao`, {
      transports: ['websocket'],
      autoConnect: true,
    });

    rececaoSocket.on('connect', () => {
      console.log('[Socket] Ligado ao servidor WebSocket (/rececao)');
    });

    rececaoSocket.on('disconnect', (reason) => {
      console.log('[Socket] Desligado (/rececao):', reason);
    });

    rececaoSocket.on('connect_error', (err) => {
      console.warn('[Socket] Erro de ligação (/rececao):', err.message);
    });
  }

  return rececaoSocket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  if (rececaoSocket) {
    rececaoSocket.disconnect();
    rececaoSocket = null;
  }
}
