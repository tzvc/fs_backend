import { Injectable } from '@nestjs/common';
import { User, MessageFromClient, MessageFromServer, ToggleReadyFromClient } from '../dtos';
import { UsersService } from '../users/users.service';
import { Socket, Server } from 'socket.io';

type ServerUser = {
  user: User;
  socket: Socket;
  isReady: boolean
};

type Room = {
  name: string;
  users: ServerUser[];
  isPlaying: boolean
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
        isReady: false
      };
      this._AppServer.users.push(newUser);
    } catch (e) {
      console.log(e.message);
    }
  }

  async logout(socket: Socket): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    await this.removeUserFromAll(user);
  }

  async joinRoom(socket: Socket, room: string): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    socket.join(room);
    await this.addUserToRoom(user, room);
  }

  async leaveRoom(socket: Socket, room: string): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    socket.leave(room);
    await this.removeUserFromRoom(user, room);
  }

  // ROOM //
  async message(socket: Socket, data: MessageFromClient): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined || user.user.token !== data.token) return;

    await this.sendMessageToRoom(user, data);
  }

  async Game__ToggleReady(socket: Socket, data: ToggleReadyFromClient): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined || user.user.token !== data.token) return;

    var room: string = await this.getUserRoom(user);
    if (room === null) return;

    await this.toggleReady(user, room, data.isReady);
  }



  ////////////////////////////////////////////////
  //////////////////// UTILS /////////////////////
  ////////////////////////////////////////////////

  async update() {
    // Update each client about available rooms
    let listOfRooms: string[] = await this.getRooms();
    this.server.emit('UPDATE_ROOMS_IN_SERVER', listOfRooms);

    // Update each room's users about its state
    this._AppServer.rooms.forEach(async room => {
      let listOfUsers: string[] = await this.getUsersInRoom(room.name);
      let listOfReadyUsers: string[] = await this.getReadyUsersInRoom(room.name);
      this.server.to(room.name).emit('UPDATE_ROOM_STATE', {
        users: listOfUsers,
        readyUsers: listOfReadyUsers,
        isGameRunning: room.isPlaying
      });
    })
  }

  private async toggleReady(_user: ServerUser, _room: string, isReady: boolean): Promise<void> {
    for (var room of this._AppServer.rooms) {
      if (room.name === _room) {
        for (var user of room.users) {
          if (user.user.username === _user.user.username) {
            user.isReady = isReady
            return;
          }
        }
      }
    }
  }

  private async getUsersInRoom(_room: string): Promise<string[]> {
    let list: string[] = [];

    for (var room of this._AppServer.rooms) {
      if (room.name === _room) {
        for (var user of room.users) {
          list.push(user.user.username);
        }
      }
    };
    return list;
  }

  private async getReadyUsersInRoom(_room: string): Promise<string[]> {
    let list: string[] = [];

    for (var room of this._AppServer.rooms) {
      if (room.name === _room) {
        for (var user of room.users) {
          if (user.isReady)
            list.push(user.user.username);
        };
      }
    };
    return list;
  }

  private async getRooms(): Promise<string[]> {
    let list: string[] = [];

    for (var room of this._AppServer.rooms) {
      list.push(room.name);
    };
    return list;
  }

  private async sendMessageToRoom(
    user: ServerUser,
    message: MessageFromClient,
  ) {
    let room = await this.getUserRoom(user);
    let messageFromServer = new MessageFromServer();

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
    for (var room of this._AppServer.rooms) {
        if (room.name === roomName) {
          room.users.push(user);
          return true;
        }
      };
      return false;
    }
    var users: ServerUser[] = [user];
    var newRoom: Room = {
      name: roomName,
      users: users,
      isPlaying: false
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
      for (var room of this._AppServer.rooms) {
        if (room.name === roomName) {
          room.users = room.users.filter(user => user.socket.id !== serverUser.socket.id);
          this.deleteEmptyRoom();
          return true;
        }
      };
    }
    return false;
  }

  // return true if removed
  private async removeUserFromAll(serverUser: ServerUser): Promise<string> {
    let roomName: string = null;
    for (var room of this._AppServer.rooms) {
      let count = room.users.length;
      room.users = room.users.filter(
        user => user.socket.id !== serverUser.socket.id,
      );
      if (count !== room.users.length) roomName = room.name;
    };
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
    for (var room of this._AppServer.rooms) {
      for (var user of room.users) {
        if (user.user.username === _user.user.username) {
          return room.name;
        }
      };
    };
    return null;
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
