import { readFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import {
  extractComposeImageReferences,
  extractDockerfileBaseImages,
} from '../src/config/supply-chain-policy';

type ScannerName = 'trivy' | 'grype';

function getExecutable(name: ScannerName): string {
  return process.platform === 'win32' ? `${name}.exe` : name;
}

function getImages(): string[] {
  const dockerfilePath = join(process.cwd(), 'Dockerfile');
  const composePath = join(process.cwd(), 'docker-compose.yml');
  const dockerfileImages = extractDockerfileBaseImages(readFileSync(dockerfilePath, 'utf8'));
  const composeImages = extractComposeImageReferences(readFileSync(composePath, 'utf8'));

  return [...new Set([...dockerfileImages, ...composeImages])];
}

function parseArgs(argv: string[]): { dryRun: boolean; scanner: ScannerName } {
  const dryRun = argv.includes('--dry-run');
  const scannerArg = argv.find(arg => arg.startsWith('--scanner='))?.split('=')[1];
  const scanner = scannerArg === 'grype' ? 'grype' : 'trivy';

  return {
    dryRun,
    scanner,
  };
}

function ensureScannerInstalled(scanner: ScannerName): void {
  const result = spawnSync(getExecutable(scanner), ['--version'], {
    stdio: 'ignore',
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`未检测到 ${scanner}，请先安装对应扫描器后再执行镜像扫描。`);
  }
}

function runScanner(scanner: ScannerName, image: string): void {
  const command = getExecutable(scanner);
  const args =
    scanner === 'trivy'
      ? ['image', '--severity', 'HIGH,CRITICAL', '--ignore-unfixed', image]
      : [image, '--fail-on', 'high'];

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`${scanner} 扫描失败：${image}`);
  }
}

function printPlan(scanner: ScannerName, images: string[]): void {
  console.log(`扫描器: ${scanner}`);
  console.log('待扫描镜像:');
  for (const image of images) {
    console.log(`- ${image}`);
  }
}

function main(): void {
  const { dryRun, scanner } = parseArgs(process.argv.slice(2));
  const images = getImages();

  printPlan(scanner, images);
  if (dryRun) {
    console.log('当前为 dry-run，仅输出扫描计划。');
    return;
  }

  ensureScannerInstalled(scanner);
  for (const image of images) {
    runScanner(scanner, image);
  }

  console.log('镜像扫描完成。');
}

try {
  main();
} catch (error) {
  console.error('执行镜像扫描失败');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
