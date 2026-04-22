import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BackupService } from '../src/modules/backup/backup.service';

const readFilenameArg = (argv: string[]): string | undefined => {
  const explicitIndex = argv.findIndex(item => item === '--filename');
  if (explicitIndex >= 0) {
    return argv[explicitIndex + 1];
  }

  return argv.find(item => !item.startsWith('--'));
};

async function main() {
  loadEnv({ path: resolve(process.cwd(), '.env') });

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const backupService = app.get(BackupService);
    const requestedFilename = readFilenameArg(process.argv.slice(2));
    const backupFile =
      requestedFilename ??
      (await backupService.listBackups())[0]?.filename;

    if (!backupFile) {
      throw new Error('未找到可用于恢复演练的备份文件，请先创建备份或通过 --filename 指定文件');
    }

    const report = await backupService.runRecoveryDrill(backupFile);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await app.close();
  }
}

main().catch(error => {
  console.error('执行恢复演练失败:', error);
  process.exit(1);
});
