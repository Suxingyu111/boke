import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function getNpmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function getSbomCommand(): { command: string; args: string[] } {
  const npmArgs = ['sbom', '--sbom-format', 'cyclonedx', '--omit', 'dev'];
  if (process.platform === 'win32') {
    return {
      command: process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', 'npm', ...npmArgs],
    };
  }

  return {
    command: getNpmCommand(),
    args: npmArgs,
  };
}

async function generateSbom(): Promise<void> {
  const outputDir = join(process.cwd(), 'docs');
  const outputPath = join(outputDir, 'sbom.cyclonedx.json');
  mkdirSync(outputDir, { recursive: true });
  const sbomCommand = getSbomCommand();

  const { stdout } = await execFileAsync(
    sbomCommand.command,
    sbomCommand.args,
    {
      cwd: process.cwd(),
      maxBuffer: 20 * 1024 * 1024,
    },
  );

  writeFileSync(outputPath, stdout, 'utf8');
  console.log(`SBOM 已生成: ${outputPath}`);
}

generateSbom().catch(error => {
  console.error('生成 SBOM 失败');
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
