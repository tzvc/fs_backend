import { Injectable } from '@nestjs/common';
import { User } from '../dtos';

@Injectable()
export class UsersService {
  private readonly users: User[];

  constructor() {
    this.users = [
      {
        userId: 0,
        username: 'root',
        password: 'alpine',
        token: '',
      },
      {
        userId: 1,
        username: 'root1',
        password: 'alpine1',
        token: '',
      },
    ];
  }

  private async generateToken(user: User): Promise<string> {
    return user.username + user.userId;
  }

  async login(username: string, password: string): Promise<User> {
    if (!username || !password) throw Error('(Username | Password) null');

    let user = this.users.find(user => user.username === username);
    if (!user || user.password !== password) throw Error('Invalid credentials');

    user.token = await this.generateToken(user);

    return user;
  }

  async loginWithToken(
    username: string,
    password: string,
    token: string,
  ): Promise<User> {
    if (!username || !password || !token)
      throw Error('(Username | Password | Token) null');

    let user = this.users.find(user => user.username === username);
    if (!user || user.password !== password || user.token !== token)
      throw Error('Invalid credentials');

    return user;
  }

  async register(username: string, password: string): Promise<User> {
    if (!username || !password) throw Error('(Username | Password) null');

    if (this.users.find(user => user.username === username))
      throw Error('Username already taken');

    let user: User = new User();

    user.userId = this.users.length;
    user.username = username;
    user.password = password;
    this.users.push(user);

    user.token = await this.generateToken(user);

    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return this.users;
  }
}
