import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

const GRID_SIZE = 100;

type Player = {
  id: string;
  status: PlayerStatus;
  gameId: number;
  dirx: number;
  diry: number;
  x: number;
  y: number;
};

enum PlayerStatus {
  IN_LOBBY,
  IN_GAME,
}

function randInRange(min: number, max: number) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

@Injectable()
export class GameService {
  private _engineTicker: number = null;
  private _players: Map<string, Player> = new Map();
  private _map: number[][];
  private _gameIds: number = 1;

  addPlayer(playerId: string) {
    this._players.set(playerId, {
      id: playerId,
      status: PlayerStatus.IN_LOBBY,
      gameId: this._gameIds++,
      dirx: 1, // generate playren fejkgkj
      diry: 0,
      x: 0,
      y: 0,
    });
  }

  removePlayer(playerId: string) {
    this._players.delete(playerId);
    //if (this._players.size === 0) this._stopEngine(null);
  }

  getPlayers(): Player[] {
    return [...this._players.values()];
  }

  isGameRunning(): boolean {
    return this._engineTicker !== null;
  }

  // GAME

  _stopEngine(server: Server) {
    console.log('Stoping engine...');
    clearInterval(this._engineTicker);
    this._engineTicker = null;
    this._players.forEach(player => {
      player.status = PlayerStatus.IN_LOBBY;
    });
    server.emit('lobby_update', {
      users: this.getPlayers(),
      isGameRunning: this.isGameRunning(),
    });
  }

  _clearMap() {
    this._map = new Array(GRID_SIZE)
      .fill(0)
      .map(() => new Array(GRID_SIZE).fill(0));
  }

  _updatePlayerPos(player: Player, x: number, y: number): boolean {
    // test for collision on trace & borders
    if (
      x < 0 ||
      x >= GRID_SIZE ||
      y < 0 ||
      y >= GRID_SIZE ||
      this._map[y][x] !== 0
    )
      return false;
    this._map[y][x] = player.gameId;
    player.x = x;
    player.y = y;
    return true;
  }

  updatePlayerDirection(playerId: string, key: number) {
    const player = this._players.get(playerId);

    // prevent this.player from backtracking on itself by checking that it's
    // not already moving on the same axis (pressing left while moving
    // left won't do anything, and pressing right while moving left
    // shouldn't let you collide with your own trace)

    // left arrow key
    if (key === 37 && player.dirx === 0) {
      player.dirx = -1;
      player.diry = 0;
    }
    // up arrow key
    else if (key === 38 && player.diry === 0) {
      player.diry = -1;
      player.dirx = 0;
    }
    // right arrow key
    else if (key === 39 && player.dirx === 0) {
      player.dirx = 1;
      player.diry = 0;
    }
    // down arrow key
    else if (key === 40 && player.diry === 0) {
      player.diry = 1;
      player.dirx = 0;
    }
  }

  startGame(server: Server) {
    let gameId = 1;
    if (this._engineTicker !== null)
      return console.warn('Game already in progress, ignoring...');
    // clear game map
    this._clearMap();
    // place player randomly on map
    this._players.forEach(player => {
      // place player at random start pos
      while (
        !this._updatePlayerPos(
          player,
          randInRange(0, GRID_SIZE),
          randInRange(0, GRID_SIZE),
        )
      ) {}
      // send player default direction
      player.dirx = Math.round(Math.random()) * 2 - 1;
      player.diry = 0;
      player.gameId = gameId++;
      player.status = PlayerStatus.IN_GAME;
    });
    this._engineTicker = <any>setInterval(() => this._tick(server), 100);
  }

  _tick(server: Server) {
    server.emit('game_update', this.getPlayers());

    //if player is last remaining, end game
    if (
      [...this._players.values()].filter(
        player => player.status == PlayerStatus.IN_GAME,
      ).length <= 0
    ) {
      this._stopEngine(server);
      return;
    }

    this._players.forEach(player => {
      if (player.status == PlayerStatus.IN_LOBBY) return;
      // update player position on map (and check for collision)
      if (
        !this._updatePlayerPos(
          player,
          player.x + player.dirx,
          player.y + player.diry,
        )
      ) {
        console.log('player died', player);
        player.status = PlayerStatus.IN_LOBBY;
        server.emit('lobby_update', {
          users: this.getPlayers(),
          isGameRunning: this.isGameRunning(),
        });
      }
    });
  }
}
