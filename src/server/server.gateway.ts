import {
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { User, MessageFromClient, ToggleReadyFromClient, GameDirUpdateFromClient } from '../dtos';
import { ServerService } from './server.service';

@WebSocketGateway({ namespace: '/lobby' })
export class ServerGateway implements OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer() server: Server;
  constructor(private readonly _ServerService: ServerService) {}
  async afterInit() {
    await this._ServerService.init(this.server);
  }

  // GENERAL //
  @SubscribeMessage('LOGIN_REQUEST')
  async login(socket: Socket, user: User) {
    await this._ServerService.login(socket, user);
  }
  async handleDisconnect(socket: Socket) {
    await this._ServerService.logout(socket);
    await this._ServerService.update();
  }

  @SubscribeMessage('JOIN_ROOM_REQUEST')
  async joinRoom(socket: Socket, room: string) {
    await this._ServerService.joinRoom(socket, room);
  }
  @SubscribeMessage('LEAVE_ROOM_REQUEST')
  async leaveRoom(socket: Socket, room: string) {
    await this._ServerService.leaveRoom(socket, room);
  }

  // ROOM //
  @SubscribeMessage('MESSAGE')
  async Message(socket: Socket, message: MessageFromClient) {
    await this._ServerService.message(socket, message);
  }

  @SubscribeMessage('GAME__TOGGLE_READY')
  async Game__ToggleReady(socket: Socket, data: ToggleReadyFromClient) {
    await this._ServerService.Game__ToggleReady(socket, data);
    await this._ServerService.update();
  }

  @SubscribeMessage('GAME__DIR_UPDATE')
  async Game__DirUpdate(socket: Socket, data: GameDirUpdateFromClient) {
    await this._ServerService.Game__DirUpdate(socket, data);
  }
}
