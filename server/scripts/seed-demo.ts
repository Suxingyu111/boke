import { spawnSync } from 'child_process';
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SearchService } from '../src/modules/search/search.service';

function runScript(scriptName: string, label: string) {
  const tsNodeBin = resolve(process.cwd(), 'node_modules', 'ts-node', 'dist', 'bin.js');
  const scriptPath = resolve(process.cwd(), 'scripts', scriptName);
  console.log(`开始执行${label}...`);

  const result = spawnSync(
    process.execPath,
    ['-r', 'tsconfig-paths/register', tsNodeBin, '--project', 'tsconfig.json', scriptPath],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    },
  );

  if (result.status !== 0) {
    throw new Error(`${label}失败，退出码: ${result.status ?? 'unknown'}`);
  }
}

async function rebuildSearchIndex() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const searchService = app.get(SearchService);
    const result = await searchService.rebuildIndex();
    console.log('Elasticsearch 索引重建完成:', result);
  } finally {
    await app.close();
  }
}

async function main() {
  loadEnv({ path: resolve(process.cwd(), '.env') });

  runScript('seed-content.ts', '基础内容种子');
  runScript('seed-bulk-articles.ts', '批量文章扩展');
  runScript('seed-about.ts', '关于页设置种子');
  runScript('seed-showcase.ts', '展示数据种子');

  console.log('开始重建 Elasticsearch 索引...');
  await rebuildSearchIndex();
}

main().catch((error) => {
  console.error('演示数据初始化失败:', error);
  process.exit(1);
});
