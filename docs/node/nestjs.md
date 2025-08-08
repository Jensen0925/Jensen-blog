# NestJS 框架开发指南

NestJS 是一个用于构建高效、可扩展的 Node.js 服务器端应用程序的框架。它使用 TypeScript 构建，并结合了 OOP（面向对象编程）、FP（函数式编程）和 FRP（函数响应式编程）的元素。

## NestJS 简介

### 什么是 NestJS？

NestJS 是一个渐进式的 Node.js 框架，用于构建高效且可扩展的服务器端应用程序。它在底层使用了强大的 HTTP 服务器框架，如 Express（默认）或 Fastify。

### 核心特性

- **TypeScript 优先**：完全支持 TypeScript，提供强类型检查
- **装饰器模式**：大量使用装饰器简化开发
- **依赖注入**：内置强大的依赖注入系统
- **模块化架构**：清晰的模块化结构
- **微服务支持**：原生支持微服务架构
- **GraphQL 集成**：内置 GraphQL 支持
- **WebSocket 支持**：实时通信支持
- **测试友好**：内置测试工具和最佳实践

### 与 Express 的对比

| 特性            | Express      | NestJS       |
| --------------- | ------------ | ------------ |
| 学习曲线        | 简单         | 中等         |
| TypeScript 支持 | 需要配置     | 原生支持     |
| 架构模式        | 灵活，无约束 | 约定优于配置 |
| 依赖注入        | 无           | 内置         |
| 装饰器          | 无           | 大量使用     |
| 微服务          | 需要额外配置 | 原生支持     |
| 测试            | 需要配置     | 内置支持     |

## 环境搭建

### 安装 NestJS CLI

```bash
# 全局安装 NestJS CLI
npm install -g @nestjs/cli

# 创建新项目
nest new my-nest-app

# 进入项目目录
cd my-nest-app

# 启动开发服务器
npm run start:dev
```

### 项目结构

```
my-nest-app/
├── src/
│   ├── app.controller.ts      # 应用控制器
│   ├── app.controller.spec.ts # 控制器测试
│   ├── app.module.ts          # 应用模块
│   ├── app.service.ts         # 应用服务
│   └── main.ts                # 应用入口
├── test/                      # 测试文件
├── nest-cli.json             # NestJS CLI 配置
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

### 基础应用结构

```typescript
// src/main.ts - 应用入口
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 启用 CORS
  app.enableCors();
  
  // 设置全局前缀
  app.setGlobalPrefix('api');
  
  await app.listen(3000);
  console.log('Application is running on: http://localhost:3000');
}

bootstrap();
```

```typescript
// src/app.module.ts - 根模块
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

```typescript
// src/app.controller.ts - 控制器
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): object {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
```

```typescript
// src/app.service.ts - 服务
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello NestJS!';
  }
}
```

## 核心概念

### 1. 控制器 (Controllers)

控制器负责处理传入的请求并向客户端返回响应。

```typescript
// users.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users
  @Get()
  async findAll(@Query() query: any) {
    const { page = 1, limit = 10 } = query;
    return this.usersService.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }

  // GET /users/:id
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  // POST /users
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // PUT /users/:id
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  // DELETE /users/:id
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }
}
```

### 2. 服务 (Services)

服务用于处理业务逻辑和数据访问。

```typescript
// users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(options: { page: number; limit: number }) {
    const { page, limit } = options;
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { email } });
  }
}
```

### 3. 模块 (Modules)

模块是组织应用程序结构的基本单元。

```typescript
// users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // 导出服务供其他模块使用
})
export class UsersModule {}
```

### 依赖注入与 Provider（IoC）

- Provider 类型：class、useValue、useClass、useFactory；通过 Token 注入
- 作用域：默认单例，可设为 REQUEST/TRANSIENT
- 动态模块：以配置创建可复用模块

```ts
// token 与 useClass/useValue/useFactory 示例
export const EMAIL_FROM = 'EMAIL_FROM';
@Injectable()
export class EmailSender { /* ... */ }

export abstract class CaptchaService { abstract verify(t: string): Promise<boolean> }
@Injectable() export class GoogleCaptchaService implements CaptchaService { async verify(){ return true } }
@Injectable() export class MockCaptchaService implements CaptchaService { async verify(){ return true } }

export const EmailFromProvider = { provide: EMAIL_FROM, useValue: 'noreply@example.com' };
export const CaptchaProvider = {
  provide: CaptchaService,
  useClass: process.env.NODE_ENV === 'production' ? GoogleCaptchaService : MockCaptchaService
};
export const MailConfigToken = Symbol('MailConfig');
export const MailConfigProvider = {
  provide: MailConfigToken,
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => ({ host: cfg.get('MAIL_HOST'), port: cfg.get('MAIL_PORT') })
};
```

```ts
// 注入与作用域
@Injectable({ scope: Scope.REQUEST })
export class RequestContextStore {}

@Injectable()
export class NoticeService {
  constructor(
    private readonly email: EmailSender,
    @Inject(EMAIL_FROM) private readonly from: string,
    @Inject(MailConfigToken) private readonly mailCfg: any,
    private readonly captcha: CaptchaService,
  ) {}
}
```

### 4. 数据传输对象 (DTOs)

```typescript
// dto/create-user.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  readonly name: string;

  @IsEmail()
  readonly email: string;

  @IsNotEmpty()
  @MinLength(6)
  readonly password: string;

  @IsOptional()
  @IsString()
  readonly avatar?: string;
}
```

```typescript
// dto/update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

### 5. 实体 (Entities)

```typescript
// entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import * as bcrypt from 'bcrypt';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
```

## 中间件和拦截器

### 1. 中间件 (Middleware)

```typescript
// middleware/logger.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      console.log(
        `${method} ${originalUrl} ${statusCode} - ${duration}ms`,
      );
    });

    next();
  }
}
```

```typescript
// 在模块中应用中间件
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './middleware/logger.middleware';

@Module({
  // ...
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*'); // 应用到所有路由
  }
}
```

### 2. 拦截器 (Interceptors)

```typescript
// interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        message: 'Request successful',
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

### 3. 守卫 (Guards)

```typescript
// guards/auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

### 4. 管道 (Pipes)

```typescript
// pipes/validation.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const errorMessages = errors.map((error) =>
        Object.values(error.constraints).join(', '),
      );
      throw new BadRequestException(
        `Validation failed: ${errorMessages.join('; ')}`,
      );
    }

    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
```

### 5. AOP（横切关注点）

在 Nest 中，AOP 思想通过 Interceptor/Guard/Pipe/Filter 实现横切：
- Before：Guard（鉴权）、Pipe（校验/转换）
- Around：Interceptor（耗时统计、响应包装、缓存）
- AfterReturning：Interceptor（结果后处理）
- AfterThrowing：Exception Filter（错误映射）

```ts
// aop/trace.interceptor.ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    return next.handle().pipe(
      map((data) => ({ success: true, data, timestamp: new Date().toISOString() })),
      tap(() => {
        const req = ctx.switchToHttp().getRequest();
        console.log(`[TRACE] ${req.method} ${req.url} - ${Date.now() - start}ms`);
      })
    );
  }
}
```

```ts
// aop/trace.decorator.ts（自定义切点）
import { SetMetadata } from '@nestjs/common';
export const TRACE_KEY = 'trace';
export const Trace = (label?: string) => SetMetadata(TRACE_KEY, label ?? true);
```

```ts
// 仅对打了 @Trace 的方法切入
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { Trace } from './aop/trace.decorator';
import { TraceByDecoratorInterceptor } from './aop/trace-by-decorator.interceptor';

@Controller('users')
@UseInterceptors(TraceByDecoratorInterceptor)
export class UsersController {
  @Get()
  @Trace('list-users')
  list() { return [{ id: 1, name: 'Jensen' }]; }
}
```

> 组合建议：全局挂载 Interceptor/Filter；差异化用装饰器选择性切入；避免在拦截器内做重 IO。

## 数据库集成

### TypeORM 集成

```bash
# 安装 TypeORM 相关包
npm install @nestjs/typeorm typeorm mysql2
# 或者使用 PostgreSQL
npm install @nestjs/typeorm typeorm pg
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: +configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    UsersModule,
  ],
})
export class AppModule {}
```

### Mongoose 集成

```bash
# 安装 Mongoose 相关包
npm install @nestjs/mongoose mongoose
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

```typescript
// schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  avatar: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

## 认证和授权

### JWT 认证

```bash
# 安装 JWT 相关包
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install --save-dev @types/passport-jwt
```

```typescript
// auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

```typescript
// auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    const { password, ...result } = user;
    return {
      user: result,
      access_token: this.jwtService.sign({ sub: user.id, email: user.email }),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      user,
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await user.validatePassword(password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
}
```

```typescript
// auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}
```

## 测试

### 单元测试

```typescript
// users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const createUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      const user = { id: '1', ...createUserDto };
      mockRepository.create.mockReturnValue(user);
      mockRepository.save.mockResolvedValue(user);

      const result = await service.create(createUserDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createUserDto);
      expect(mockRepository.save).toHaveBeenCalledWith(user);
      expect(result).toEqual(user);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }];
      mockRepository.findAndCount.mockResolvedValue([users, 2]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: users,
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });
  });
});
```

### 集成测试

```typescript
// users.controller.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('UsersController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/users (GET)', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('meta');
      });
  });

  it('/users (POST)', () => {
    const createUserDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    return request(app.getHttpServer())
      .post('/users')
      .send(createUserDto)
      .expect(201)
      .expect((res) => {
        expect(res.body.name).toBe(createUserDto.name);
        expect(res.body.email).toBe(createUserDto.email);
        expect(res.body).not.toHaveProperty('password');
      });
  });
});
```

## 配置管理

### 环境配置

```bash
# 安装配置相关包
npm install @nestjs/config
```

```typescript
// config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: process.env.DB_TYPE || 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nestjs_app',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
}));
```

```typescript
// config/app.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  environment: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
}));
```

```env
# .env
NODE_ENV=development
PORT=3000

# Database
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_NAME=nestjs_app

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 微服务

### TCP 微服务

```typescript
// microservices/user-service/main.ts
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { UserServiceModule } from './user-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UserServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3001,
      },
    },
  );

  await app.listen();
  console.log('User microservice is listening on port 3001');
}

bootstrap();
```

```typescript
// microservices/user-service/user.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern({ cmd: 'get_user' })
  async getUser(@Payload() data: { id: string }) {
    return this.userService.findOne(data.id);
  }

  @MessagePattern({ cmd: 'create_user' })
  async createUser(@Payload() userData: any) {
    return this.userService.create(userData);
  }

  @MessagePattern({ cmd: 'get_users' })
  async getUsers(@Payload() data: { page: number; limit: number }) {
    return this.userService.findAll(data);
  }
}
```

### API Gateway

```typescript
// api-gateway/app.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UsersController } from './users.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3001,
        },
      },
    ]),
  ],
  controllers: [UsersController],
})
export class AppModule {}
```

```typescript
// api-gateway/users.controller.ts
import { Controller, Get, Post, Body, Param, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Controller('users')
export class UsersController {
  constructor(
    @Inject('USER_SERVICE') private readonly userService: ClientProxy,
  ) {}

  @Get()
  getUsers(): Observable<any> {
    return this.userService.send({ cmd: 'get_users' }, { page: 1, limit: 10 });
  }

  @Get(':id')
  getUser(@Param('id') id: string): Observable<any> {
    return this.userService.send({ cmd: 'get_user' }, { id });
  }

  @Post()
  createUser(@Body() userData: any): Observable<any> {
    return this.userService.send({ cmd: 'create_user' }, userData);
  }
}
```

## GraphQL 集成

```bash
# 安装 GraphQL 相关包
npm install @nestjs/graphql @nestjs/apollo graphql apollo-server-express
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      introspection: true,
    }),
  ],
})
export class AppModule {}
```

```typescript
// users/models/user.model.ts
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field()
  isActive: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
```

```typescript
// users/users.resolver.ts
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './models/user.model';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => [User], { name: 'users' })
  findAll() {
    return this.usersService.findAll({ page: 1, limit: 100 });
  }

  @Query(() => User, { name: 'user' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.usersService.findOne(id);
  }

  @Mutation(() => User)
  createUser(@Args('createUserInput') createUserInput: CreateUserInput) {
    return this.usersService.create(createUserInput);
  }

  @Mutation(() => User)
  updateUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
  ) {
    return this.usersService.update(id, updateUserInput);
  }

  @Mutation(() => Boolean)
  async removeUser(@Args('id', { type: () => ID }) id: string) {
    await this.usersService.remove(id);
    return true;
  }
}
```

## 性能优化

### 缓存

```bash
# 安装缓存相关包
npm install cache-manager cache-manager-redis-store redis
```

```typescript
// app.module.ts
import { Module, CacheModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        ttl: 600, // 10 minutes
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

```typescript
// users.service.ts
import { Injectable, CACHE_MANAGER, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class UsersService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    // ... other dependencies
  ) {}

  async findOne(id: string): Promise<User> {
    const cacheKey = `user:${id}`;
    
    // 尝试从缓存获取
    let user = await this.cacheManager.get<User>(cacheKey);
    
    if (!user) {
      // 从数据库获取
      user = await this.userRepository.findOne({ where: { id } });
      
      if (user) {
        // 存入缓存
        await this.cacheManager.set(cacheKey, user, { ttl: 300 });
      }
    }
    
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.update(id, updateUserDto);
    
    // 清除缓存
    await this.cacheManager.del(`user:${id}`);
    
    return this.findOne(id);
  }
}
```

### 压缩和安全

```bash
# 安装相关包
npm install compression helmet
```

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as compression from 'compression';
import * as helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 安全头
  app.use(helmet());
  
  // 启用压缩
  app.use(compression());
  
  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // 启用 CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });
  
  await app.listen(3000);
}

bootstrap();
```

## 部署

### Docker 部署

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产镜像
FROM node:18-alpine AS production

WORKDIR /app

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# 复制构建结果和依赖
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# 切换到非 root 用户
USER nestjs

EXPOSE 3000

CMD ["node", "dist/main"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_PORT=3306
      - DB_USERNAME=root
      - DB_PASSWORD=password
      - DB_NAME=nestjs_app
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=nestjs_app
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - '3306:3306'
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    restart: unless-stopped

volumes:
  mysql_data:
```

### PM2 部署

```json
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'nestjs-app',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_file: './logs/app.log',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
    },
  ],
};
```

## 最佳实践

### 1. 项目结构

```
src/
├── common/                 # 通用模块
│   ├── decorators/        # 自定义装饰器
│   ├── filters/           # 异常过滤器
│   ├── guards/            # 守卫
│   ├── interceptors/      # 拦截器
│   ├── pipes/             # 管道
│   └── utils/             # 工具函数
├── config/                # 配置文件
├── modules/               # 业务模块
│   ├── auth/
│   ├── users/
│   └── posts/
├── shared/                # 共享模块
│   ├── database/
│   └── redis/
├── app.module.ts
└── main.ts
```

### 2. 错误处理

```typescript
// common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: exception.message || 'Internal server error',
    };

    response.status(status).json(errorResponse);
  }
}
```

### 3. 日志记录

```bash
# 安装日志相关包
npm install winston nest-winston
```

```typescript
// common/logger/logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class CustomLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
      ],
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      );
    }
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}
```

### 4. 异常过滤器

```typescript
// filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const message = exception.message || 'Internal server error';

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception.stack,
      }),
    };

    this.logger.error(
      `HTTP Exception: ${status} - ${message}`,
      exception.stack,
    );

    response.status(status).json(errorResponse);
  }
}
```

```typescript
// filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    this.logger.error(
      `Exception: ${status} - ${message}`,
      exception instanceof Error ? exception.stack : exception,
    );

    response.status(status).json(errorResponse);
  }
}
```

```typescript
// 在 main.ts 中全局应用异常过滤器
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());
  
  await app.listen(3000);
}

bootstrap();
```

### 5. API 文档

```bash
# 安装 Swagger
npm install @nestjs/swagger swagger-ui-express
```

```typescript
// main.ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger 配置
  const config = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription('The NestJS API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
```

```typescript
// 在 DTO 中使用 Swagger 装饰器
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'User name', example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  readonly name: string;

  @ApiProperty({ description: 'User email', example: 'john@example.com' })
  @IsEmail()
  readonly email: string;

  @ApiProperty({ description: 'User password', minLength: 6 })
  @IsNotEmpty()
  @MinLength(6)
  readonly password: string;
}
```

## 高级特性

### 1. 定时任务

```bash
# 安装定时任务相关包
npm install @nestjs/schedule
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks/tasks.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [TasksService],
})
export class AppModule {}
```

```typescript
// tasks/tasks.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval, Timeout } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  // 每天凌晨 2 点执行
  @Cron('0 2 * * *')
  handleDailyCron() {
    this.logger.debug('执行每日清理任务');
    // 执行清理逻辑
  }

  // 使用预定义的 cron 表达式
  @Cron(CronExpression.EVERY_30_SECONDS)
  handleCron() {
    this.logger.debug('每 30 秒执行一次');
  }

  // 每 10 秒执行一次
  @Interval(10000)
  handleInterval() {
    this.logger.debug('每 10 秒执行一次');
  }

  // 应用启动后 3 秒执行一次
  @Timeout(3000)
  handleTimeout() {
    this.logger.debug('应用启动后 3 秒执行');
  }
}
```

### 2. 队列处理

```bash
# 安装队列相关包
npm install @nestjs/bull bull
npm install --save-dev @types/bull
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'email',
    }),
    EmailModule,
  ],
})
export class AppModule {}
```

```typescript
// email/email.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class EmailService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async sendWelcomeEmail(email: string, name: string) {
    await this.emailQueue.add(
      'welcome',
      {
        email,
        name,
      },
      {
        delay: 5000, // 延迟 5 秒发送
        attempts: 3, // 重试 3 次
      },
    );
  }

  async sendBulkEmails(emails: string[]) {
    const jobs = emails.map((email) => ({
      name: 'bulk-email',
      data: { email },
    }));

    await this.emailQueue.addBulk(jobs);
  }
}
```

```typescript
// email/email.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process('welcome')
  async handleWelcomeEmail(job: Job<{ email: string; name: string }>) {
    this.logger.debug(`发送欢迎邮件给 ${job.data.email}`);
    
    // 模拟邮件发送
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    this.logger.debug(`欢迎邮件发送完成: ${job.data.email}`);
  }

  @Process('bulk-email')
  async handleBulkEmail(job: Job<{ email: string }>) {
    this.logger.debug(`发送批量邮件给 ${job.data.email}`);
    
    // 邮件发送逻辑
    await this.sendEmail(job.data.email);
  }

  private async sendEmail(email: string) {
    // 实际的邮件发送逻辑
    console.log(`邮件已发送给: ${email}`);
  }
}
```

### 3. 自定义装饰器

```typescript
// decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
// decorators/user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

```typescript
// decorators/api-response.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiOperation } from '@nestjs/swagger';

export function ApiStandardResponse(operation: string) {
  return applyDecorators(
    ApiOperation({ summary: operation }),
    ApiResponse({ status: 200, description: '成功' }),
    ApiResponse({ status: 400, description: '请求参数错误' }),
    ApiResponse({ status: 401, description: '未授权' }),
    ApiResponse({ status: 500, description: '服务器内部错误' }),
  );
}
```

```typescript
// 使用自定义装饰器
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/user.decorator';
import { ApiStandardResponse } from '../decorators/api-response.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { AuthGuard } from '../guards/auth.guard';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  @Get('users')
  @Roles('admin', 'moderator')
  @ApiStandardResponse('获取用户列表')
  getUsers(@CurrentUser() user: any) {
    return { message: `Hello ${user.name}, you are an admin!` };
  }
}
```

### 4. 事件系统

```typescript
// events/user-created.event.ts
export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
  ) {}
}
```

```typescript
// users/users.service.ts
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserCreatedEvent } from '../events/user-created.event';

@Injectable()
export class UsersService {
  constructor(private eventEmitter: EventEmitter2) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = await this.userRepository.save(createUserDto);
    
    // 发出事件
    this.eventEmitter.emit(
      'user.created',
      new UserCreatedEvent(user.id, user.email, user.name),
    );
    
    return user;
  }
}
```

```typescript
// listeners/user.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedEvent } from '../events/user-created.event';
import { EmailService } from '../email/email.service';

@Injectable()
export class UserListener {
  private readonly logger = new Logger(UserListener.name);

  constructor(private emailService: EmailService) {}

  @OnEvent('user.created')
  async handleUserCreatedEvent(event: UserCreatedEvent) {
    this.logger.log(`用户创建事件: ${event.userId}`);
    
    // 发送欢迎邮件
    await this.emailService.sendWelcomeEmail(event.email, event.name);
    
    // 其他业务逻辑
    this.logger.log(`欢迎邮件已发送给: ${event.email}`);
  }

  @OnEvent('user.created', { async: true })
  async handleUserCreatedEventAsync(event: UserCreatedEvent) {
    // 异步处理
    await this.processUserAnalytics(event.userId);
  }

  private async processUserAnalytics(userId: string) {
    // 用户分析逻辑
    this.logger.log(`处理用户分析: ${userId}`);
  }
}
```

### 5. 文件上传

```bash
# 安装文件上传相关包
npm install @nestjs/platform-express multer
npm install --save-dev @types/multer
```

```typescript
// upload/upload.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import {
  FileInterceptor,
  FilesInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('upload')
export class UploadController {
  // 单文件上传
  @Post('single')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new BadRequestException('只允许上传图片文件'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  uploadSingle(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }
    
    return {
      message: '文件上传成功',
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      path: file.path,
    };
  }

  // 多文件上传
  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('请选择要上传的文件');
    }

    return {
      message: '文件上传成功',
      files: files.map((file) => ({
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
      })),
    };
  }

  // 多字段文件上传
  @Post('fields')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'background', maxCount: 1 },
    ]),
  )
  uploadFields(
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File[];
      background?: Express.Multer.File[];
    },
  ) {
    return {
      message: '文件上传成功',
      avatar: files.avatar?.[0],
      background: files.background?.[0],
    };
  }
}
```

### 6. 限流和安全

```bash
# 安装限流相关包
npm install @nestjs/throttler
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60, // 时间窗口（秒）
      limit: 10, // 限制次数
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

```typescript
// 在控制器中使用限流
import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

@Controller('api')
export class ApiController {
  // 覆盖全局限流设置
  @Throttle(5, 60) // 60 秒内最多 5 次请求
  @Get('limited')
  getLimited() {
    return { message: '这是一个受限制的接口' };
  }

  // 跳过限流
  @SkipThrottle()
  @Get('unlimited')
  getUnlimited() {
    return { message: '这是一个不受限制的接口' };
  }
}
```

### 7. 国际化 (i18n)

```bash
# 安装国际化相关包
npm install nestjs-i18n
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import {
  I18nModule,
  AcceptLanguageResolver,
  QueryResolver,
  HeaderResolver,
} from 'nestjs-i18n';
import * as path from 'path';

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
        new HeaderResolver(['x-lang']),
      ],
    }),
  ],
})
export class AppModule {}
```

```json
// i18n/en/messages.json
{
  "welcome": "Welcome to our application",
  "user": {
    "created": "User created successfully",
    "notFound": "User not found"
  }
}
```

```json
// i18n/zh/messages.json
{
  "welcome": "欢迎使用我们的应用",
  "user": {
    "created": "用户创建成功",
    "notFound": "用户未找到"
  }
}
```

```typescript
// 在服务中使用国际化
import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class UsersService {
  constructor(private readonly i18n: I18nService) {}

  async create(createUserDto: CreateUserDto, lang: string) {
    // 创建用户逻辑
    const user = await this.userRepository.save(createUserDto);
    
    return {
      user,
      message: await this.i18n.translate('messages.user.created', {
        lang,
      }),
    };
  }
}
```

### 8. 健康检查

```bash
# 安装健康检查相关包
npm install @nestjs/terminus
```

```typescript
// health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // 数据库健康检查
      () => this.db.pingCheck('database'),
      
      // HTTP 服务健康检查
      () => this.http.pingCheck('nestjs-docs', 'https://docs.nestjs.com'),
      
      // 内存使用检查
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      
      // 磁盘空间检查
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.5,
        }),
    ]);
  }

  // 简单的存活检查
  @Get('live')
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // 就绪检查
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
```

### 9. WebSocket 实时通信

```bash
# 安装 WebSocket 相关包
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

```typescript
// chat/chat.gateway.ts
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('ChatGateway');

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.room);
    client.to(data.room).emit('userJoined', {
      userId: client.id,
      message: `用户 ${client.id} 加入了房间`,
    });
    return { event: 'joinedRoom', data: { room: data.room } };
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    @MessageBody() data: { room: string; message: string; user: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(data.room).emit('newMessage', {
      user: data.user,
      message: data.message,
      timestamp: new Date(),
    });
    return { event: 'messageSent', data: 'Message sent successfully' };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.room);
    client.to(data.room).emit('userLeft', {
      userId: client.id,
      message: `用户 ${client.id} 离开了房间`,
    });
    return { event: 'leftRoom', data: { room: data.room } };
  }
}
```

### 10. 缓存策略

```bash
# 安装缓存相关包
npm install cache-manager
npm install --save-dev @types/cache-manager
```

```typescript
// cache/cache.service.ts
import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return await this.cacheManager.get<T>(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async reset(): Promise<void> {
    await this.cacheManager.reset();
  }

  // 缓存装饰器使用示例
  async getOrSetCache<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 300,
  ): Promise<T> {
    let result = await this.get<T>(key);
    
    if (!result) {
      result = await factory();
      await this.set(key, result, ttl);
    }
    
    return result;
  }
}
```

```typescript
// 使用缓存装饰器
import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@Controller('users')
@UseInterceptors(CacheInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @CacheTTL(60) // 缓存 60 秒
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @CacheTTL(300) // 缓存 5 分钟
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }
}
```

### 11. 数据验证和序列化

```bash
# 安装验证相关包
npm install class-validator class-transformer
```

```typescript
// dto/create-user.dto.ts
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  IsDateString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

class AddressDto {
  @ApiProperty({ description: '街道地址' })
  @IsString()
  @MinLength(5)
  street: string;

  @ApiProperty({ description: '城市' })
  @IsString()
  city: string;

  @ApiProperty({ description: '邮政编码' })
  @IsString()
  zipCode: string;
}

export class CreateUserDto {
  @ApiProperty({ description: '用户名', minLength: 3, maxLength: 20 })
  @IsString()
  @MinLength(3, { message: '用户名至少需要3个字符' })
  @MaxLength(20, { message: '用户名不能超过20个字符' })
  @Transform(({ value }) => value.trim())
  username: string;

  @ApiProperty({ description: '邮箱地址' })
  @IsEmail({}, { message: '请提供有效的邮箱地址' })
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @ApiProperty({ description: '密码', minLength: 8 })
  @IsString()
  @MinLength(8, { message: '密码至少需要8个字符' })
  password: string;

  @ApiProperty({ description: '用户角色', enum: UserRole })
  @IsEnum(UserRole, { message: '无效的用户角色' })
  role: UserRole;

  @ApiProperty({ description: '生日', required: false })
  @IsOptional()
  @IsDateString({}, { message: '请提供有效的日期格式' })
  birthDate?: string;

  @ApiProperty({ description: '地址信息', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiProperty({ description: '标签列表', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
```

```typescript
// entities/user.entity.ts
import { Exclude, Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserEntity {
  @ApiProperty({ description: '用户ID' })
  id: number;

  @ApiProperty({ description: '用户名' })
  username: string;

  @ApiProperty({ description: '邮箱地址' })
  email: string;

  @Exclude() // 序列化时排除密码字段
  password: string;

  @ApiProperty({ description: '用户角色' })
  role: string;

  @ApiProperty({ description: '创建时间' })
  @Transform(({ value }) => value.toISOString())
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @Transform(({ value }) => value.toISOString())
  updatedAt: Date;

  @ApiProperty({ description: '全名' })
  @Expose() // 计算属性
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
```

### 12. 自定义日志记录

```bash
# 安装日志相关包
npm install winston nest-winston
```

```typescript
// logger/winston.config.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const winstonConfig = {
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    
    // 错误日志文件
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '14d',
    }),
    
    // 应用日志文件
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
};
```

```typescript
// logger/custom-logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';
import { Logger } from 'winston';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class CustomLoggerService implements LoggerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  log(message: any, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context });
  }

  // 自定义日志方法
  logUserAction(userId: number, action: string, details?: any) {
    this.logger.info('User action', {
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  logApiRequest(method: string, url: string, statusCode: number, responseTime: number) {
    this.logger.info('API Request', {
      method,
      url,
      statusCode,
      responseTime,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 13. 请求响应拦截器

```typescript
// interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, body, query, params } = request;
    const userAgent = request.get('User-Agent') || '';
    const ip = request.ip;
    
    const startTime = Date.now();
    
    this.logger.log(
      `Incoming Request: ${method} ${url} - ${ip} - ${userAgent}`,
    );
    
    if (Object.keys(body).length > 0) {
      this.logger.debug(`Request Body: ${JSON.stringify(body)}`);
    }
    
    if (Object.keys(query).length > 0) {
      this.logger.debug(`Query Params: ${JSON.stringify(query)}`);
    }
    
    if (Object.keys(params).length > 0) {
      this.logger.debug(`Route Params: ${JSON.stringify(params)}`);
    }

    return next.handle().pipe(
      tap((data) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        this.logger.log(
          `Outgoing Response: ${method} ${url} - ${response.statusCode} - ${responseTime}ms`,
        );
        
        if (data) {
          this.logger.debug(`Response Data: ${JSON.stringify(data)}`);
        }
      }),
    );
  }
}
```

### 14. 数据库事务处理

```typescript
// services/user-transaction.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Profile } from '../entities/profile.entity';
import { CreateUserDto } from '../dto/create-user.dto';

@Injectable()
export class UserTransactionService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    private dataSource: DataSource,
  ) {}

  // 使用 QueryRunner 进行事务处理
  async createUserWithProfile(createUserDto: CreateUserDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // 创建用户
      const user = queryRunner.manager.create(User, {
        username: createUserDto.username,
        email: createUserDto.email,
        password: createUserDto.password,
      });
      
      const savedUser = await queryRunner.manager.save(user);
      
      // 创建用户档案
      const profile = queryRunner.manager.create(Profile, {
        userId: savedUser.id,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        bio: createUserDto.bio,
      });
      
      await queryRunner.manager.save(profile);
      
      // 提交事务
      await queryRunner.commitTransaction();
      
      return { user: savedUser, profile };
    } catch (error) {
      // 回滚事务
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // 释放查询运行器
      await queryRunner.release();
    }
  }

  // 使用装饰器进行事务处理
  @Transaction()
  async updateUserAndProfile(
    userId: number,
    updateData: any,
    @TransactionManager() manager: EntityManager,
  ) {
    // 更新用户信息
    await manager.update(User, userId, {
      username: updateData.username,
      email: updateData.email,
    });
    
    // 更新档案信息
    await manager.update(Profile, { userId }, {
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      bio: updateData.bio,
    });
    
    return { message: '用户信息更新成功' };
  }
}
```

## 总结

NestJS 是一个功能强大的 Node.js 框架，它提供了：

### 🎯 核心优势
- **TypeScript 优先**：完整的类型安全支持
- **装饰器驱动**：简洁优雅的代码组织
- **依赖注入**：强大的 IoC 容器
- **模块化架构**：清晰的代码结构
- **丰富的生态**：内置多种功能模块

### 🚀 适用场景
- **企业级应用**：大型、复杂的后端系统
- **微服务架构**：分布式系统开发
- **API 服务**：RESTful 和 GraphQL API
- **实时应用**：WebSocket 和 SSE 支持

### 📚 学习建议
1. **掌握 TypeScript**：NestJS 的基础
2. **理解装饰器**：NestJS 的核心概念
3. **学习依赖注入**：理解 IoC 容器
4. **实践项目**：通过实际项目加深理解
5. **关注生态**：了解 NestJS 生态系统

### 🔗 相关资源
- [NestJS 官方文档](https://docs.nestjs.com/)
- [NestJS GitHub](https://github.com/nestjs/nest)
- [NestJS 示例项目](https://github.com/nestjs/nest/tree/master/sample)

