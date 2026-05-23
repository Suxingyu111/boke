import {
  extractComposeImageReferences,
  isLocalBuildImageReference,
  extractDockerfileBaseImages,
  getFinalDockerfileUser,
  isDigestPinnedImage,
  isNonRootUser,
  verifySupplyChainPolicy,
} from '../src/config/supply-chain-policy';

describe('supply-chain policy', () => {
  const dockerfile = `
FROM node:18-alpine@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa AS deps
FROM node:18-alpine@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb AS runtime
USER node
`;

  const compose = `
services:
  mysql:
    image: mysql:8.0@sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc
  redis:
    image: redis:7-alpine@sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
`;

  it('应提取 docker-compose 中的镜像引用', () => {
    expect(extractComposeImageReferences(compose)).toEqual([
      'mysql:8.0@sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      'redis:7-alpine@sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    ]);
  });

  it('应提取 Dockerfile 基础镜像并识别最终运行用户', () => {
    expect(extractDockerfileBaseImages(dockerfile)).toEqual([
      'node:18-alpine@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'node:18-alpine@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    ]);
    expect(getFinalDockerfileUser(dockerfile)).toBe('node');
    expect(isNonRootUser('node')).toBe(true);
    expect(isNonRootUser('root')).toBe(false);
    expect(isLocalBuildImageReference('blog-server:local')).toBe(true);
    expect(isLocalBuildImageReference('blog-elasticsearch-ik:8.13.4')).toBe(true);
    expect(isLocalBuildImageReference('mysql:8.0')).toBe(false);
  });

  it('应校验 digest 固定策略', () => {
    expect(
      isDigestPinnedImage(
        'node:18-alpine@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ),
    ).toBe(true);
    expect(isDigestPinnedImage('node:18-alpine')).toBe(false);
  });

  it('应在 npm 锁文件、digest 与非 root 都满足时通过策略校验', () => {
    const result = verifySupplyChainPolicy({
      packageManager: 'npm@10.8.2',
      hasPackageLock: true,
      hasPnpmLock: false,
      dockerfileContent: dockerfile,
      composeContent: compose,
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.imageReferences).toHaveLength(4);
  });

  it('应拒绝缺少 digest 或仍使用 pnpm 锁文件的配置', () => {
    const result = verifySupplyChainPolicy({
      packageManager: 'npm@10.8.2',
      hasPackageLock: true,
      hasPnpmLock: true,
      dockerfileContent: 'FROM node:18-alpine\nUSER root\n',
      composeContent: 'services:\n  mysql:\n    image: mysql:8.0\n',
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        '检测到 pnpm-lock.yaml，当前供应链策略只允许 npm 锁文件。',
        '镜像未固定 digest：node:18-alpine',
        '镜像未固定 digest：mysql:8.0',
        'Dockerfile 最终运行用户必须是非 root。',
      ]),
    );
  });

  it('应忽略本地构建产物镜像，但校验构建参数中的远程基础镜像', () => {
    const result = verifySupplyChainPolicy({
      packageManager: 'npm@10.8.2',
      hasPackageLock: true,
      hasPnpmLock: false,
      dockerfileContent: dockerfile,
      composeContent: `
services:
  elasticsearch:
    build:
      context: ./server
      args:
        ELASTICSEARCH_IMAGE: docker.elastic.co/elasticsearch/elasticsearch:8.13.4
    image: blog-elasticsearch-ik:8.13.4
  server:
    build:
      context: ./server
    image: blog-server:local
`,
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      '镜像未固定 digest：docker.elastic.co/elasticsearch/elasticsearch:8.13.4',
    ]);
    expect(result.imageReferences).toEqual([
      'node:18-alpine@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'node:18-alpine@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'docker.elastic.co/elasticsearch/elasticsearch:8.13.4',
    ]);
  });
});
