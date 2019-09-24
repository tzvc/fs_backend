import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users/users.service';
import { User } from './dtos';
import { Response } from 'express';

// import { AuthGuard } from '@nestjs/passport';
// @UseGuards(AuthGuard('local'))

var _UsersService: UsersService = new UsersService();

@Controller('api')
export class AppController {
  // LOGIN //
  @Post('login')
  async login(@Body() user: User) {
    try {
      user = await _UsersService.login(user.username, user.password);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
    return user;
  }

  // REGISTER //
  @Post('register')
  async register(@Body() user: User) {
    try {
      user = await _UsersService.register(user.username, user.password);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
    return user;
  }

  // GET ALL USERS //
  @Get('users')
  async getAllUsers() {
    return await _UsersService.getAllUsers();
  }
}
