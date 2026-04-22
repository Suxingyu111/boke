import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { verifySupplyChainPolicy } from '../src/config/supply-chain-policy';

function readRequiredFile(pathname: string): string {
  return readFileSync(pathname, 'utf8');
}

function main(): void {
  const rootDir = process.cwd();
  const packageJsonPath = join(rootDir, 'package.json');
  const packageLockPath = join(rootDir, 'package-lock.json');
  const pnpmLockPath = join(rootDir, 'pnpm-lock.yaml');
  const dockerfilePath = join(rootDir, 'Dockerfile');
  const composePath = join(rootDir, 'docker-compose.yml');

  const packageJson = JSON.parse(readRequiredFile(packageJsonPath)) as {
    packageManager?: string;
  };

  const result = verifySupplyChainPolicy({
    packageManager: packageJson.packageManager,
    hasPackageLock: existsSync(packageLockPath),
    hasPnpmLock: existsSync(pnpmLockPath),
    dockerfileContent: readRequiredFile(dockerfilePath),
    composeContent: readRequiredFile(composePath),
  });

  if (!result.ok) {
    console.error('供应链策略校验失败：');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('供应链策略校验通过。');
  console.log(`已校验镜像数量: ${result.imageReferences.length}`);
}

try {
  main();
} catch (error) {
  console.error('执行供应链策略校验失败');
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
}
