import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { LoginRequest, LoginResult } from '../dto/login.dto';
import { LoginUseCase } from '../use-case/login.use-case';

@Controller('auth/login')
export class LoginController {
  constructor(private readonly useCase: LoginUseCase) {}

  @Public()
  @Post()
  @HttpCode(200)
  login(@Body() request: LoginRequest): Promise<LoginResult> {
    return this.useCase.execute(request);
  }
}
