import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/marcacoes',
})
export class MarcacaoGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MarcacaoGateway.name);

  afterInit() {
    this.logger.log('MarcacaoGateway iniciado (WebSocket /marcacoes)');
  }

  /**
   * Emite para todos os clientes conectados que uma marcação foi criada.
   */
  emitMarcacaoCriada(marcacao: unknown) {
    this.server.emit('marcacao_criada', marcacao);
  }

  /**
   * Emite para todos os clientes conectados que uma marcação foi atualizada.
   */
  emitMarcacaoAtualizada(marcacao: unknown) {
    this.server.emit('marcacao_atualizada', marcacao);
  }
}
