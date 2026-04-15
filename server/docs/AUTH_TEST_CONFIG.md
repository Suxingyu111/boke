# Auth 测试配置参考

## 📦 测试数据准备

### 有效测试数据

```typescript
// test/fixtures/auth.fixtures.ts

export const validUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  username: 'testuser',
  email: 'test@example.com',
  password: 'SecureP@ss123',
  nickname: 'Test User',
  isActive: true,
  role: 'user' as const,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

export const validRegisterDto = {
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'SecureP@ss456',
  nickname: 'New User',
};

export const validLoginDto = {
  email: 'test@example.com',
  password: 'SecureP@ss123',
};

export const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890'; // bcrypt 哈希格式
```

### 无效测试数据（边界测试）

```typescript
export const invalidTestCases = {
  // Email 验证
  emptyEmail: {
    email: '',
    password: 'ValidPass123',
  },
  missingEmail: {
    password: 'ValidPass123',
  },
  invalidEmailFormat: {
    email: 'not-an-email',
    password: 'ValidPass123',
  },
  emailWithSpaces: {
    email: ' test@example.com ',
    password: 'ValidPass123',
  },

  // 密码验证
  emptyPassword: {
    email: 'test@example.com',
    password: '',
  },
  shortPassword: {
    email: 'test@example.com',
    password: '123', // < 8 字符
  },
  weakPassword: {
    email: 'test@example.com',
    password: 'password123', // 无特殊字符
  },
  noNumberPassword: {
    email: 'test@example.com',
    password: 'Password!@#', // 无数字
  },

  // 用户名验证
  emptyUsername: {
    username: '',
    email: 'test@example.com',
    password: 'ValidPass123',
  },
  tooLongUsername: {
    username: 'a'.repeat(51), // > 50 字符
    email: 'test@example.com',
    password: 'ValidPass123',
  },
  specialCharUsername: {
    username: 'test<script>',
    email: 'test@example.com',
    password: 'ValidPass123',
  },

  // 安全测试
  sqlInjection: {
    email: "' OR '1'='1",
    password: 'anything',
  },
  sqlInjectionUsername: {
    username: "admin'--",
    email: 'test@example.com',
    password: 'ValidPass123',
  },
  xssAttempt: {
    username: '<script>alert("XSS")</script>',
    email: 'test@example.com',
    password: 'ValidPass123',
  },
  xssNickname: {
    username: 'testuser',
    email: 'test@example.com',
    password: 'ValidPass123',
    nickname: '<img src=x onerror=alert(1)>',
  },

  // Unicode 和特殊字符
  unicodePassword: {
    email: 'test@example.com',
    password: 'P@ssw0rd中文🔐', // 有效
  },
  emojiUsername: {
    username: 'test😀user', // 取决于业务规则
    email: 'test@example.com',
    password: 'ValidPass123',
  },
};
```

### 禁用用户数据

```typescript
export const disabledUser = {
  ...validUser,
  id: '550e8400-e29b-41d4-a716-446655440001',
  email: 'disabled@example.com',
  isActive: false, // 禁用状态
};
```

---

## 🎭 Mock 配置

### UserRepository Mock

```typescript
// test/mocks/user-repository.mock.ts

import { User } from '../../src/database/entities/user.entity';
import { validUser, hashedPassword } from '../fixtures/auth.fixtures';

export const createMockUserRepository = () => {
  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };

  // 默认行为：用户不存在
  mockRepo.findOne.mockResolvedValue(null);

  // 保存返回保存的实体
  mockRepo.save.mockImplementation((user: Partial<User>) => {
    return Promise.resolve({
      ...user,
      id: 'generated-uuid',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User);
  });

  // 更新返回 affected 计数
  mockRepo.update.mockResolvedValue({ affected: 1 });

  // create 返回实体实例
  mockRepo.create.mockImplementation((data: Partial<User>) => data as User);

  return mockRepo;
};

// 预设场景
export const mockScenarios = {
  // 场景 1: 用户已存在（email 重复）
  userExistsByEmail: (mockRepo: any) => {
    mockRepo.findOne.mockResolvedValueOnce({
      ...validUser,
      password: hashedPassword,
    });
  },

  // 场景 2: 用户已存在（username 重复）
  userExistsByUsername: (mockRepo: any) => {
    mockRepo.findOne.mockResolvedValueOnce({
      ...validUser,
      password: hashedPassword,
    });
  },

  // 场景 3: 用户不存在
  userNotFound: (mockRepo: any) => {
    mockRepo.findOne.mockResolvedValueOnce(null);
  },

  // 场景 4: 数据库错误
  databaseError: (mockRepo: any) => {
    mockRepo.save.mockRejectedValueOnce(new Error('Database connection failed'));
  },

  // 场景 5: 禁用用户
  disabledUser: (mockRepo: any) => {
    mockRepo.findOne.mockResolvedValueOnce({
      ...validUser,
      isActive: false,
      password: hashedPassword,
    });
  },
};
```

### JwtService Mock

```typescript
// test/mocks/jwt-service.mock.ts

export const createMockJwtService = () => {
  const mockJwt = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  // 默认行为：生成有效 token
  mockJwt.sign.mockReturnValue('mock.jwt.token');

  // 验证返回 payload
  mockJwt.verify.mockReturnValue({
    sub: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  });

  return mockJwt;
};

// JWT 错误场景
export const jwtErrorScenarios = {
  // Token 过期
  expiredToken: (mockJwt: any) => {
    const error = new Error('jwt expired');
    error.name = 'TokenExpiredError';
    mockJwt.verify.mockImplementationOnce(() => {
      throw error;
    });
  },

  // 无效签名
  invalidSignature: (mockJwt: any) => {
    const error = new Error('invalid signature');
    error.name = 'JsonWebTokenError';
    mockJwt.verify.mockImplementationOnce(() => {
      throw error;
    });
  },

  // JWT 生成失败
  signError: (mockJwt: any) => {
    mockJwt.sign.mockImplementationOnce(() => {
      throw new Error('JWT sign failed');
    });
  },
};
```

### Bcrypt Mock

```typescript
// test/mocks/bcrypt.mock.ts

import { hashedPassword } from '../fixtures/auth.fixtures';

// 在测试文件顶部使用
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
  genSalt: jest.fn(),
}));

// 设置默认行为
export const setupBcryptMock = () => {
  const bcrypt = require('bcrypt');

  // hash 返回固定哈希
  bcrypt.hash.mockResolvedValue(hashedPassword);

  // compare 默认返回 true（密码匹配）
  bcrypt.compare.mockResolvedValue(true);

  // genSalt 返回固定盐值
  bcrypt.genSalt.mockResolvedValue('$2b$10$abcdefghijklmnopqrst');

  return bcrypt;
};

// Bcrypt 场景
export const bcryptScenarios = {
  // 密码匹配
  passwordMatch: (bcrypt: any) => {
    bcrypt.compare.mockResolvedValueOnce(true);
  },

  // 密码不匹配
  passwordMismatch: (bcrypt: any) => {
    bcrypt.compare.mockResolvedValueOnce(false);
  },

  // 哈希错误
  hashError: (bcrypt: any) => {
    bcrypt.hash.mockRejectedValueOnce(new Error('bcrypt hash failed'));
  },
};
```

### ConfigService Mock

```typescript
// test/mocks/config-service.mock.ts

export const createMockConfigService = () => {
  const mockConfig = {
    get: jest.fn(),
  };

  // 默认配置
  mockConfig.get.mockImplementation((key: string, fallback?: any) => {
    const config: Record<string, any> = {
      'jwt.secret': 'test-secret-key',
      'jwt.expiresIn': '7d',
      'app.name': 'Blog System',
      nodeEnv: 'test',
      port: 3000,
      'db.host': 'localhost',
    };

    return config[key] ?? fallback;
  });

  return mockConfig;
};
```

---

## 🔧 测试工具函数

### 测试数据生成器

```typescript
// test/utils/generators.ts

import { faker } from '@faker-js/faker';

export const generateUser = (overrides?: Partial<User>) => ({
  id: faker.string.uuid(),
  username: faker.internet.userName(),
  email: faker.internet.email(),
  password: 'SecureP@ss123',
  nickname: faker.person.fullName(),
  isActive: true,
  role: 'user' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const generateRegisterDto = (overrides?: Partial<RegisterDto>) => ({
  username: faker.internet.userName(),
  email: faker.internet.email(),
  password: 'SecureP@ss123',
  nickname: faker.person.fullName(),
  ...overrides,
});

// 生成多个用户
export const generateUsers = (count: number) => {
  return Array.from({ length: count }, () => generateUser());
};
```

### 测试数据库工具

```typescript
// test/utils/database.ts

import { DataSource } from 'typeorm';
import { User } from '../../src/database/entities/user.entity';

export const cleanDatabase = async (dataSource: DataSource) => {
  const entities = dataSource.entityMetadatas;

  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.clear();
  }
};

export const seedUser = async (dataSource: DataSource, user: Partial<User>) => {
  const userRepo = dataSource.getRepository(User);
  const createdUser = userRepo.create(user);
  return userRepo.save(createdUser);
};
```

### HTTP 测试工具

```typescript
// test/utils/http.ts

import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

export const registerUser = async (app: INestApplication, dto: RegisterDto) => {
  return request(app.getHttpServer())
    .post('/auth/register')
    .send(dto)
    .expect(201);
};

export const loginUser = async (app: INestApplication, dto: LoginDto) => {
  return request(app.getHttpServer())
    .post('/auth/login')
    .send(dto)
    .expect(200);
};

export const getProfile = async (app: INestApplication, token: string) => {
  return request(app.getHttpServer())
    .get('/auth/profile')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
};

// 完整注册-登录流程
export const registerAndLogin = async (app: INestApplication) => {
  const registerDto = generateRegisterDto();

  await registerUser(app, registerDto);

  const loginResponse = await loginUser(app, {
    email: registerDto.email,
    password: registerDto.password,
  });

  return {
    user: loginResponse.body.user,
    token: loginResponse.body.access_token,
    credentials: registerDto,
  };
};
```

---

## 🧪 测试套件模板

### AuthService 测试模板

```typescript
// test/auth.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/modules/auth/auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../src/database/entities/user.entity';
import * as bcrypt from 'bcrypt';
import {
  createMockUserRepository,
  mockScenarios,
} from './mocks/user-repository.mock';
import { createMockJwtService } from './mocks/jwt-service.mock';
import { createMockConfigService } from './mocks/config-service.mock';
import { validRegisterDto, validLoginDto } from './fixtures/auth.fixtures';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: ReturnType<typeof createMockUserRepository>;
  let mockJwt: ReturnType<typeof createMockJwtService>;
  let bcryptMock: any;

  beforeEach(async () => {
    // 创建新 mock
    mockUserRepo = createMockUserRepository();
    mockJwt = createMockJwtService();
    const mockConfig = createMockConfigService();

    // 设置 bcrypt mock
    bcryptMock = require('bcrypt');
    bcryptMock.hash.mockResolvedValue('$2b$10$hashedpassword');
    bcryptMock.compare.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: JwtService,
          useValue: mockJwt,
        },
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register()', () => {
    it('应成功注册新用户', async () => {
      // RED: 此测试应先失败，因为 register() 还不存在

      // Arrange
      mockUserRepo.findOne.mockResolvedValue(null); // 用户不存在

      // Act
      const result = await service.register(validRegisterDto);

      // Assert
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validRegisterDto.email,
          username: validRegisterDto.username,
        }),
      );
      expect(result).not.toHaveProperty('password');
    });

    it('应拒绝已存在的 email', async () => {
      // RED: 应先失败

      // Arrange
      mockScenarios.userExistsByEmail(mockUserRepo);

      // Act & Assert
      await expect(service.register(validRegisterDto)).rejects.toThrow(
        ConflictException,
      );
    });

    // ... 更多测试
  });

  describe('login()', () => {
    it('应成功登录并返回 token', async () => {
      // ... 测试实现
    });

    // ... 更多测试
  });
});
```

### E2E 测试模板

```typescript
// test/auth.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { cleanDatabase, seedUser } from './utils/database';
import { generateRegisterDto } from './utils/generators';
import { validUser, hashedPassword } from './fixtures/auth.fixtures';

describe('Auth E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  beforeEach(async () => {
    // 清理测试数据库
    await cleanDatabase(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('应成功注册新用户', async () => {
      // RED: 端点还不存在，应失败

      const registerDto = generateRegisterDto();

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(registerDto.email);
      expect(response.body).not.toHaveProperty('password');

      // 验证数据库
      const userRepo = dataSource.getRepository(User);
      const savedUser = await userRepo.findOne({
        where: { email: registerDto.email },
      });

      expect(savedUser).toBeDefined();
      expect(savedUser.password).not.toBe(registerDto.password); // 已哈希
    });

    // ... 更多测试
  });

  describe('POST /auth/login', () => {
    it('应成功登录并返回 token', async () => {
      // Arrange: 先创建用户
      const user = await seedUser(dataSource, {
        ...validUser,
        password: hashedPassword,
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: 'SecureP@ss123', // 原始密码
        })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).not.toHaveProperty('password');
    });

    // ... 更多测试
  });
});
```

---

## 📚 有用的断言模式

```typescript
// 验证对象部分匹配
expect(result).toMatchObject({
  email: 'test@example.com',
  username: 'testuser',
});

// 验证不包含字段
expect(result).not.toHaveProperty('password');

// 验证 UUID 格式
expect(result.id).toMatch(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
);

// 验证日期
expect(result.createdAt).toBeInstanceOf(Date);

// 验证 JWT 格式
expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);

// 验证 bcrypt 哈希格式
expect(hashedPassword).toMatch(/^\$2[aby]\$\d{2}\$/);

// 验证函数调用次数
expect(mockRepo.save).toHaveBeenCalledTimes(1);

// 验证函数调用参数
expect(mockRepo.findOne).toHaveBeenCalledWith({
  where: { email: 'test@example.com' },
});

// 验证异步异常
await expect(service.register(dto)).rejects.toThrow(ConflictException);
await expect(service.register(dto)).rejects.toThrow('Email already exists');
```

---

**参考链接**:
- [NestJS Testing 文档](https://docs.nestjs.com/fundamentals/testing)
- [Jest Mock 函数](https://jestjs.io/docs/mock-functions)
- [Supertest GitHub](https://github.com/visionmedia/supertest)
