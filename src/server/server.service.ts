import { Injectable } from '@nestjs/common';
import { User, MessageFromClient, NetworkMessageFromServer } from '../dtos';
import { UsersService } from '../users/users.service';
import { Socket, Server } from 'socket.io';

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
      user = await this._UsersService.loginWithToken(
        user.username,
        user.password,
        user.token,
      );

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

    let room = await this.removeUserFromAll(user);

    this.update(room);
  }

  async joinRoom(socket: Socket, room: string): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    socket.join(room);
    await this.addUserToRoom(user, room);

    this.update(room);
  }

  async leaveRoom(socket: Socket, room: string): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    socket.leave(room);
    await this.removeUserFromRoom(user, room);

    this.update(room);
  }

  ////////////////////////////////////////////////
  ///////////////// UPDATELESS ///////////////////
  ////////////////////////////////////////////////

  async message(socket: Socket, message: MessageFromClient): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined || user.user.token !== message.token) return;

    this.sendMessageToRoom(user, message);
  }

  ////////////////////////////////////////////////
  //////////////////// UTILS /////////////////////
  ////////////////////////////////////////////////

  private async update(room: string) {
    let listOfUsers: string[] = await this.getUsersInRoom(room);
    let listOfRooms: string[] = await this.getRooms();

    this.server.to(room).emit('UPDATE_USERS_IN_ROOM', listOfUsers);
    this.server.emit('UPDATE_ROOMS_IN_SERVER', listOfRooms);
  }

  private async getUsersInRoom(_room: string): Promise<string[]> {
    let list: string[] = [];

    this._AppServer.rooms.forEach(room => {
      if (room.name === _room) {
        room.users.forEach(user => {
          list.push(user.user.username);
        });
      }
    });
    return list;
  }

  private async getRooms(): Promise<string[]> {
    let list: string[] = [];

    this._AppServer.rooms.forEach(room => {
      list.push(room.name);
    });
    return list;
  }

  private async sendMessageToRoom(
    user: ServerUser,
    message: MessageFromClient,
  ) {
    let room = await this.getUserRoom(user);
    let messageFromServer = new NetworkMessageFromServer();

    messageFromServer.data = message.data;
    messageFromServer.from = user.user.username;

    if (room != null) {
      this.server.to(room).emit('MESSAGE', messageFromServer);
      console.log('Message from ' + user.user.username + ' sent to ' + room);
    }
  }

  // return true if added
  private async addUserToRoom(
    user: ServerUser,
    roomName: string,
  ): Promise<Boolean> {
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
    return true;
  }

  // return true if removed
  private async removeUserFromRoom(
    serverUser: ServerUser,
    roomName: string,
  ): Promise<Boolean> {
    var room = await this.getRoomFromName(roomName);

    if (room) {
      this._AppServer.rooms.forEach(room => {
        if (room.name === roomName) {
          room.users = room.users.filter(
            user => user.socket.id !== serverUser.socket.id,
          );
          this.deleteEmptyRoom();
          return true;
        }
      });
    }
    return false;
  }

  // return true if removed
  private async removeUserFromAll(serverUser: ServerUser): Promise<string> {
    let roomName: string = null;
    this._AppServer.rooms.forEach(room => {
      let count = room.users.length;
      room.users = room.users.filter(
        user => user.socket.id !== serverUser.socket.id,
      );
      if (count !== room.users.length) roomName = room.name;
    });
    this._AppServer.users = this._AppServer.users.filter(
      user => user.socket.id !== serverUser.socket.id,
    );
    this.deleteEmptyRoom();
    return roomName;
  }

  // return ServerUser or undefined
  private async getUserFromSocket(socket: Socket): Promise<ServerUser> {
    return this._AppServer.users.find(user => user.socket.id === socket.id);
  }

  // return Room or undefined
  private async getRoomFromName(roomName: string): Promise<Room> {
    return this._AppServer.rooms.find(room => room.name === roomName);
  }

  // check if empty room and delete them
  private async deleteEmptyRoom(): Promise<void> {
    this._AppServer.rooms = this._AppServer.rooms.filter(
      room => room.users.length > 0,
    );
  }

  // return the room in which the user is
  private async getUserRoom(_user: ServerUser): Promise<string> {
    let roomName: string = null;

    this._AppServer.rooms.forEach(room => {
      room.users.forEach(user => {
        if (user.user.username === _user.user.username) {
          roomName = room.name;
          return;
        }
      });
    });
    return roomName;
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
