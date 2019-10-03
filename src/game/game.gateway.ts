import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { GameService } from './game.service';

@WebSocketGateway(1080, { namespace: '/' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server;
  constructor(private readonly _gameService: GameService) {
    console.log(`Game gateway init ${this.server}`);
  }

  _sendLobbyUpdate() {
    this.server.emit('lobby_update', {
      users: this._gameService.getPlayers(),
      isGameRunning: this._gameService.isGameRunning(),
    });
  }

  async handleConnection(socket: Socket) {
    console.log(`Connection ${socket.id}`);
    this._gameService.addPlayer(socket.id);
    this._sendLobbyUpdate();
  }

  async handleDisconnect(socket: Socket) {
    console.log(`Disconnection ${socket.id}`);
    this._gameService.removePlayer(socket.id);
    this._sendLobbyUpdate();
  }

  @SubscribeMessage('start_game')
  async startGame() {
    this._gameService.startGame(this.server);
    this._sendLobbyUpdate();
  }

  @SubscribeMessage('player_dir_update')
  async updatePlayerDirection(socket: Socket, data: number) {
    this._gameService.updatePlayerDirection(socket.id, data);
  }
}
