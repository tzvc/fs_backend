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

  async login(socket: Socket, user: User): Promise<void> {
    try {
      user = await this._UsersService.loginWithToken(user.username, user.password, user.token);

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

    this.removeUserFromAll(user)
  }

  async joinRoom(socket: Socket, room: string): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    socket.join(room);
    this.server
      .to(room)
      .emit('EVENT_ROOM', user.user.username + ' joined the room');

    this.addUserToRoom(user, room);
  }

  async leaveRoom(socket: Socket, room: string): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    socket.leave(room);
    this.server
      .to(room)
      .emit('EVENT_ROOM', user.user.username + ' left the room')
    
    this.removeUserFromRoom(user, room);
  }

  ////////////////////////////////////////////////
  ////////////////////// UTILS ///////////////////
  ////////////////////////////////////////////////

  // return true if added
  private async addUserToRoom(user: ServerUser, roomName: string): Promise<Boolean> {
    var room = this._AppServer.rooms.find(room => room.name === roomName);

    if (room) {
      this._AppServer.rooms.forEach(room => {
        if (room.name === roomName) {
          room.users.push(user);
          return true;
        }
      });
      return false;
    }
    var users: ServerUser[] = [user];
    var newRoom: Room = {
      name: roomName,
      users: users,
    };
    this._AppServer.rooms.push(newRoom);
    return true
  }

  // return true if removed
  private async removeUserFromRoom(serverUser: ServerUser, roomName: string): Promise<Boolean> {
    var room = await this.getRoomFromName(roomName);

    if (room) {
      this._AppServer.rooms.forEach(room => {
        if (room.name === roomName) {
          room.users = room.users.filter(user => user.socket.id !== serverUser.socket.id);
          this.deleteEmptyRoom()
          return true
        }
      });
    }
    return false
  }

    // return true if removed
    private async removeUserFromAll(serverUser: ServerUser): Promise<void> {
      this._AppServer.rooms.forEach(room => {
        room.users = room.users.filter(user => user.socket.id !== serverUser.socket.id);
      });
      this._AppServer.users = this._AppServer.users.filter(
        user => user.socket.id !== serverUser.socket.id,
      );
      this.deleteEmptyRoom()
    }

  // return ServerUser or undefined
  private async getUserFromSocket(socket: Socket): Promise<ServerUser> {
    return this._AppServer.users.find(user => user.socket.id === socket.id);
  }

  // return Room or undefined
  private async getRoomFromName(roomName: string): Promise<Room> {
    return this._AppServer.rooms.find(room => room.name === roomName)
  }

  // check if empty room and delete them
  private async deleteEmptyRoom(): Promise<void> {
    this._AppServer.rooms = this._AppServer.rooms.filter(
      room => room.users.length > 0,
    );
  }

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
}
