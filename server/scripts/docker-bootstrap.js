const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { setTimeout: delay } = require('timers/promises');

const projectRoot = process.cwd();
const waitTimeoutMs = Number.parseInt(
  process.env.DOCKER_BOOTSTRAP_WAIT_TIMEOUT_MS || '180000',
  10,
);

function parseBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return value === 'true';
}

function resolveHostPort(defaultHost, defaultPort, hostEnvKey, portEnvKey) {
  return {
    host: process.env[hostEnvKey] || defaultHost,
    port: Number.parseInt(process.env[portEnvKey] || String(defaultPort), 10),
  };
}

async function waitForTcpService(name, host, port, timeoutMs) {
  const startAt = Date.now();

  while (Date.now() - startAt < timeoutMs) {
    const reachable = await new Promise((resolve) => {
      const socket = net.createConnection({ host, port });

      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.setTimeout(3000, () => {
        socket.destroy();
        resolve(false);
      });
    });

    if (reachable) {
      console.log(`✅ ${name} 已就绪: ${host}:${port}`);
      return;
    }

    console.log(`⏳ 等待 ${name} 就绪: ${host}:${port}`);
    await delay(2000);
  }

  throw new Error(`等待 ${name} 超时: ${host}:${port}`);
}

async function waitForHttpService(name, url, timeoutMs) {
  const startAt = Date.now();

  while (Date.now() - startAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ ${name} HTTP 检查通过: ${url}`);
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`⏳ 等待 ${name} HTTP 就绪: ${message}`);
    }

    await delay(2000);
  }

  throw new Error(`等待 ${name} HTTP 检查超时: ${url}`);
}

function runNodeScript(label, args) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 开始执行${label}...`);

    const child = spawn(process.execPath, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`✅ ${label}执行完成`);
        resolve();
        return;
      }

      reject(new Error(`${label}执行失败，退出码: ${code ?? 'unknown'}`));
    });

    child.on('error', reject);
  });
}

async function runBuiltScript(scriptName, label) {
  const scriptPath = path.resolve(projectRoot, 'dist', 'scripts', scriptName);

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`未找到已编译脚本: ${scriptPath}`);
  }

  await runNodeScript(label, [scriptPath]);
}

async function startServer() {
  const distEntry = path.resolve(projectRoot, 'dist', 'src', 'main.js');

  if (!fs.existsSync(distEntry)) {
    throw new Error(`未找到服务启动入口: ${distEntry}`);
  }

  console.log('🚀 开始启动 NestJS 服务...');

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [distEntry], {
      cwd: projectRoot,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`NestJS 服务异常退出，退出码: ${code ?? 'unknown'}`));
    });

    child.on('error', reject);
  });
}

async function main() {
  const mysql = resolveHostPort('mysql', 3306, 'DB_HOST', 'DB_PORT');
  const redis = resolveHostPort('redis', 6379, 'REDIS_HOST', 'REDIS_PORT');
  const elasticsearchUrl = process.env.ES_NODE || 'http://elasticsearch:9200';
  const initDb = parseBoolean(process.env.DOCKER_BOOTSTRAP_INIT_DB, true);
  const seedDemo = parseBoolean(process.env.DOCKER_BOOTSTRAP_SEED_DEMO, true);
  const rebuildIndex = parseBoolean(process.env.DOCKER_BOOTSTRAP_REINDEX, true);

  console.log('📦 容器启动引导开始...');

  await waitForTcpService('MySQL', mysql.host, mysql.port, waitTimeoutMs);
  await waitForTcpService('Redis', redis.host, redis.port, waitTimeoutMs);
  await waitForHttpService('Elasticsearch', `${elasticsearchUrl}/_cluster/health`, waitTimeoutMs);

  if (initDb) {
    await runBuiltScript('init-db.js', '数据库初始化');
  }

  if (seedDemo) {
    await runBuiltScript('seed-demo.js', '演示数据初始化');
  } else if (rebuildIndex) {
    await runBuiltScript('rebuild-search-index.js', 'Elasticsearch 索引重建');
  }

  await startServer();
}

main().catch((error) => {
  console.error('❌ 容器启动失败:', error);
  process.exit(1);
});
