import { Injectable, Provider } from '@nestjs/common';
import { User } from '../dtos';
import { UsersService } from '../users/users.service';
import { Socket, Server } from 'socket.io';
import { WebSocketServer } from '@nestjs/websockets';
type ServerUser = {
  user: User;
  socket: Socket;
};

type Room = {
  name: string;
  users: ServerUser[];
};

class AppServer {
  users: ServerUser[] = [];
  rooms: Room[] = [];
}

@Injectable()
export class ServerService {
  private _AppServer = new AppServer();
  constructor(private readonly _UsersService: UsersService) {}
  server: Server;

  async init(server: Server) {
    this.server = server;
  }

  async displayServerState() {
    console.log('Global Users:');
    this._AppServer.users.forEach(user => {
      console.log(user);
    });

    console.log('Rooms:');
    this._AppServer.rooms.forEach(room => {
      console.log(room.name);
      room.users.forEach(user => {
        console.log(user.user);
      });
    });
  }

  async doesRoomExist(roomName: string): Promise<boolean> {
    this._AppServer.rooms.forEach(room => {
      if (room.name === roomName) return true;
    });
    return false;
  }

  async addUserToRoom(user: ServerUser, roomName: string): Promise<void> {
    var room = this._AppServer.rooms.find(room => room.name === roomName);

    if (room === undefined) {
      var users: ServerUser[] = [user];
      var newRoom: Room = {
        name: roomName,
        users: users,
      };
      this._AppServer.rooms.push(newRoom);
    } else {
      this._AppServer.rooms.forEach(room => {
        if (room.name === roomName) {
          room.users.push(user);
          return;
        }
      });
    }
  }

  async login(socket: Socket, user: User): Promise<void> {
    try {
      user = await this._UsersService.login(user.username, user.password);

      var newUser: ServerUser = {
        user: user,
        socket: socket,
      };
      this._AppServer.users.push(newUser);
    } catch (e) {
      console.log(e.message);
    }
  }

  async logout(socket: Socket): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    // Remove user from any room
    this._AppServer.rooms.forEach(room => {
      var oldUserNb = room.users.length;
      room.users = room.users.filter(user => user.socket.id !== socket.id);
      if (oldUserNb !== room.users.length) this.leaveRoom(socket, room.name);
    });

    // Delete empty rooms
    this._AppServer.rooms = this._AppServer.rooms.filter(
      room => room.users.length > 0,
    );

    // Remove user from User Global Array
    this._AppServer.users = this._AppServer.users.filter(
      user => user.socket.id !== socket.id,
    );
    this.displayServerState();
  }

  private async getUserFromSocket(socket: Socket): Promise<ServerUser> {
    return this._AppServer.users.find(user => user.socket.id === socket.id);
  }

  async joinRoom(socket: Socket, room: string): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    socket.join(room);
    this.server
      .emit('eventRoom', user.user.username + ' joined the room')
      .to(room);

    this.addUserToRoom(user, room);
    this.displayServerState();
  }

  async leaveRoom(socket: Socket, room: string): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    socket.leave(room);
    this.server
      .emit('eventRoom', user.user.username + ' left the room')
      .to(room);
  }
}
