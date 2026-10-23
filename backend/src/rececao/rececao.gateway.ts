import { Logger } from '@nestjs/common';
import { OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/rececao',
})
export class RececaoGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RececaoGateway.name);

  afterInit() {
    this.logger.log('RececaoGateway iniciado (WebSocket /rececao)');
  }

  emitComunicacaoCriada(payload: unknown) {
    this.server.emit('comunicacao_criada', payload);
  }

  emitComunicacaoAtualizada(payload: unknown) {
    this.server.emit('comunicacao_atualizada', payload);
  }

  emitComunicacaoRemovida(payload: unknown) {
    this.server.emit('comunicacao_removida', payload);
  }

  emitFaturaPaga(payload: unknown) {
    this.server.emit('fatura_paga', payload);
  }

  emitHorarioAtualizado(payload: unknown) {
    this.server.emit('horario_atualizado', payload);
  }
}
