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
import { User } from '../dtos';
import { ServerService } from './server.service';

@WebSocketGateway({ namespace: '/lobby' })
export class ServerGateway implements OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer() server: Server;
  constructor(private readonly _ServerService: ServerService) {}
  afterInit() {
    this._ServerService.init(this.server);
  }

  @SubscribeMessage('LOGIN_REQUEST')
  async login(socket: Socket, user: User) {
    this._ServerService.login(socket, user);
  }

  @SubscribeMessage('JOIN_ROOM_REQUEST')
  async joinRoom(socket: Socket, room: string) {
    this._ServerService.joinRoom(socket, room);
  }

  @SubscribeMessage('LEAVE_ROOM_REQUEST')
  async leaveRoom(socket: Socket, room: string) {
    this._ServerService.leaveRoom(socket, room);
  }

  async handleDisconnect(socket: Socket) {
    this._ServerService.logout(socket);
  }
}
