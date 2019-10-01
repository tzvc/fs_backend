import {
  Controller,
  Post,
  Body,
  Get,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users/users.service';
import { User } from './dtos';

@Controller('api')
export class AppController {
  constructor(private readonly _UsersService: UsersService) {}

  // LOGIN //
  @Post('login')
  async login(@Body() user: User) {
    try {
      user = await this._UsersService.login(user.username, user.password);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
    return user;
  }

  // REGISTER //
  @Post('register')
  async register(@Body() user: User) {
    try {
      user = await this._UsersService.register(user.username, user.password);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
    return user;
  }

  // GET ALL USERS //
  @Get('users')
  async getAllUsers() {
    return await this._UsersService.getAllUsers();
  }
}
