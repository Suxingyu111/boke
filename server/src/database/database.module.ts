import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const parsePoolSize = (value: string | number | undefined, fallback: number): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<TypeOrmModuleOptions> => {
        const databaseType = configService.get<string>('database.type', 'mysql');
        const poolSize = parsePoolSize(
          configService.get<string | number>('DB_POOL_SIZE', 10),
          10,
        );

        if (databaseType !== 'mysql') {
          throw new Error('当前项目仅支持 MySQL，请检查 DB_TYPE 配置');
        }

        return {
          type: 'mysql',
          host: configService.get<string>('database.host', 'localhost'),
          port: configService.get<number>('database.port', 3306),
          username: configService.get<string>('database.username', 'root'),
          password: configService.get<string>('database.password', ''),
          database: configService.get<string>('database.database', 'blog_system'),
          entities: [__dirname + '/entities/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          synchronize: configService.get<boolean>('database.synchronize', false),
          logging: configService.get<boolean>('database.logging', false),
          charset: 'utf8mb4',
          extra: {
            connectionLimit: poolSize,
            waitForConnections: true,
            queueLimit: 0,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
