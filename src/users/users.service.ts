import { Injectable } from '@nestjs/common';
import { User } from '../dtos';

@Injectable()
export class UsersService {
  private readonly users: User[];

  constructor() {
    this.users = [
      {
        userId: 1,
        username: 'root',
        password: 'alpine',
      },
    ];
  }

  async login(username: string, password: string): Promise<User> {
    if (!username || !password) throw Error('(Username | Password) null');

    let user = this.users.find(user => user.username === username);
    if (!user || user.password !== password) throw Error('Invalid credentials');

    return user;
  }

  async register(username: string, password: string): Promise<User> {
    if (!username || !password) throw Error('(Username | Password) null');

    let user: User = this.users.find(user => user.username === username);
    if (user) throw Error('Username already taken');

    user.userId = this.users.length + 1;
    user.username = username;
    user.password = password;

    this.users.push(user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return this.users;
  }
}
