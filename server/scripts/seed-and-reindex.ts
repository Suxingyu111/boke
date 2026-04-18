import { spawnSync } from 'child_process';
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SearchService } from '../src/modules/search/search.service';

function runSeedScript() {
  const tsNodeBin = resolve(process.cwd(), 'node_modules', 'ts-node', 'dist', 'bin.js');
  const seedScript = resolve(process.cwd(), 'scripts', 'seed-content.ts');
  const result = spawnSync(process.execPath, ['-r', 'tsconfig-paths/register', tsNodeBin, '--project', 'tsconfig.json', seedScript], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`内容导入失败，退出码: ${result.status ?? 'unknown'}`);
  }
}

async function rebuildSearchIndex() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const searchService = app.get(SearchService);
    const result = await searchService.rebuildIndex();
    console.log('索引重建完成:', result);
  } finally {
    await app.close();
  }
}

async function main() {
  loadEnv({ path: resolve(process.cwd(), '.env') });

  console.log('开始导入内容数据...');
  runSeedScript();

  console.log('开始重建 Elasticsearch 索引...');
  await rebuildSearchIndex();

  process.exit(0);
}

main().catch((error) => {
  console.error('执行内容导入与索引重建失败:', error);
  process.exit(1);
});