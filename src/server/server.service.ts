import { Injectable } from '@nestjs/common';
import { User, MessageFromClient, MessageFromServer, ToggleReadyFromClient, GameDirUpdateFromClient } from '../dtos';
import { UsersService } from '../users/users.service';
import { Socket, Server } from 'socket.io';
import { userInfo } from 'os';

const GRID_SIZE = 100;

type ServerUser = {
  user: User;
  socket: Socket;
  gameId: number;

  isReady: boolean;
  dirx: number;
  diry: number;
  x: number;
  y: number;
};

type Room = {
  name: string;
  users: ServerUser[];
  isPlaying: boolean;
  engineTicker: number;
  map: number[][];
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
        gameId: 0,

        isReady: false,
        dirx: 1,
        diry: 0,
        x: 0,
        y: 0,
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

    socket.join(room, async () => {
      await this.addUserToRoom(user, room);
      await this.update();
     });
  }

  async leaveRoom(socket: Socket, room: string): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

     socket.leave(room, async () => {
       await this.removeUserFromRoom(user, room);
       await this.update();
      });
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
    await this.checkStart(room)
  }

  async Game__DirUpdate(socket: Socket, data: GameDirUpdateFromClient): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined || user.user.token !== data.token) return;

    var room: string = await this.getUserRoom(user);
    if (room === null) return;

    await this.dirUpdate(user, room, data.key);
  }

  ////////////////////////////////////////////////
  //////////////////// UTILS /////////////////////
  ////////////////////////////////////////////////

  async update() {
    // Update each client about available rooms
    let listOfRooms: string[] = await this.getRooms();
    this.server.emit('UPDATE_ROOMS_IN_SERVER', listOfRooms);

    // Update each room's users about its state
    for (var room of this._AppServer.rooms) {
      let _users = await this.getUsersInRoom(room)
      this.server.to(room.name).emit('UPDATE_ROOM_STATE', {
        users: _users,
        isGameRunning: room.isPlaying
      });
    }
  }

  private async dirUpdate(_user: ServerUser, roomName: string, key: number): Promise<void> {
    this._AppServer.rooms.forEach(room => {
      if (room.name === roomName) {
        room.users.forEach(user => {
          if (user.user.username === _user.user.username) {
            // left arrow key
            if (key === 37 && user.dirx === 0) {
              user.dirx = -1;
              user.diry = 0;
            }
            // up arrow key
            else if (key === 38 && user.diry === 0) {
              user.diry = -1;
              user.dirx = 0;
            }
            // right arrow key
            else if (key === 39 && user.dirx === 0) {
              user.dirx = 1;
              user.diry = 0;
            }
            // down arrow key
            else if (key === 40 && user.diry === 0) {
              user.diry = 1;
              user.dirx = 0;
            }
          }
        })
      }
    })
  }

  private randInRange(min: number, max: number) {
    // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  private async startGame(roomName: string): Promise<void> {
    this._AppServer.rooms.forEach(async room => {
      if (room.name === roomName) {
        room.map = new Array(GRID_SIZE).fill(0).map(() => new Array(GRID_SIZE).fill(0));
        if (room.engineTicker !== null)
          return console.warn('Game already in progress, ignoring...');
        room.users.forEach(user => {
          while (
            !this.updatePlayerPos(user, room, this.randInRange(0, GRID_SIZE), this.randInRange(0, GRID_SIZE))
          ) {}

          user.dirx = Math.round(Math.random()) * 2 - 1;
          user.diry = 0;
        })
      }
      room.engineTicker = <any>setInterval(() => this.tick(room), 100);
    })
  }

  private tick(room: Room) {
    if (room.isPlaying === false) {
      clearInterval(room.engineTicker)
      room.engineTicker = null;
    }

    var myObject = []
    room.users.forEach(user => {
      myObject.push({
          x : user.x,
          y : user.y,
          gameId: user.gameId
      })
      this.updatePlayerPos(user, room, user.x + user.dirx, user.y + user.diry)
    })
    this.server.to(room.name).emit('GAME__UPDATE', myObject);
  }

  private updatePlayerPos(user: ServerUser, room: Room, x: number, y: number): boolean {
    if (
      x < 0 ||
      x >= GRID_SIZE ||
      y < 0 ||
      y >= GRID_SIZE ||
      room.map[y][x] !== 0
    )
      return false;
    room.map[y][x] = user.gameId;
    user.x = x;
    user.y = y;
    return true;
  }

  private async clearMap(roomName: string): Promise<void> {
    this._AppServer.rooms.forEach(async room => {
      if (room.name === roomName) {
        room.map = new Array(GRID_SIZE)
        .fill(0)
        .map(() => new Array(GRID_SIZE).fill(0));
      }
    })
  }

  private async checkStart(roomName: string): Promise<void> {
    this._AppServer.rooms.forEach(async room => {
      if (room.name === roomName && room.users.length >= 2 && await this.AreUsersReady(roomName)) {
        room.isPlaying = true
        this.startGame(roomName)
      }
    })
  }

  private async AreUsersReady(roomName: string): Promise<boolean> {
    var ok: boolean;
    for (var room of this._AppServer.rooms) {
      if (room.name === roomName) {
        ok = true
        for (var user of room.users) {
          if (user.isReady === false) {
            ok = false
          }
        }
        if (ok) {
          return true
        }
        return false
      }
    }
    return false
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

  private async getUsersInRoom(room: Room): Promise<any> {
    let list: any[] = [];

    for (var user of room.users) {
      list.push({
        username: user.user.username,
        gameId: user.gameId,
        isReady: user.isReady,
      });
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
    }
  }

  // return true if added
  private async addUserToRoom(
    user: ServerUser,
    roomName: string,
  ): Promise<Boolean> {
    var room = this._AppServer.rooms.find(room => room.name === roomName);

    if (room) {
      user.gameId = room.users.length + 1
      for (var room of this._AppServer.rooms) {
        if (room.name === roomName) {
          room.users.push(user);
          return true;
        }
      };
      return false;
    }

    user.gameId = 1
    var users: ServerUser[] = [user];
    var newRoom: Room = {
      name: roomName,
      users: users,
      isPlaying: false,
      engineTicker: null,
      map: new Array(GRID_SIZE)
      .fill(0)
      .map(() => new Array(GRID_SIZE).fill(0))
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
    this._AppServer.rooms.forEach(room => {
      if (room.users.length === 0 && room.engineTicker !== null) {
        room.isPlaying = false
      }
    })
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
