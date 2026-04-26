import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SearchService } from '../src/modules/search/search.service';

async function main() {
  loadEnv({ path: resolve(process.cwd(), '.env') });

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

main().catch((error) => {
  console.error('Elasticsearch 索引重建失败:', error);
  process.exit(1);
});
