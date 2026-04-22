export interface SupplyChainVerificationResult {
  ok: boolean;
  errors: string[];
  imageReferences: string[];
}

const IMAGE_PATTERN = /^\s*image:\s*([^\s#]+)\s*$/gm;
const FROM_PATTERN = /^\s*FROM\s+([^\s]+)(?:\s+AS\s+\S+)?\s*$/gim;
const USER_PATTERN = /^\s*USER\s+([^\s#]+)\s*$/gim;

export const isDigestPinnedImage = (value: string): boolean => {
  return /@sha256:[a-f0-9]{64}$/i.test(value.trim());
};

export const extractComposeImageReferences = (composeContent: string): string[] => {
  return [...composeContent.matchAll(IMAGE_PATTERN)].map(match => match[1].trim());
};

export const extractDockerfileBaseImages = (dockerfileContent: string): string[] => {
  return [...dockerfileContent.matchAll(FROM_PATTERN)].map(match => match[1].trim());
};

export const getFinalDockerfileUser = (dockerfileContent: string): string | null => {
  const matches = [...dockerfileContent.matchAll(USER_PATTERN)];
  if (matches.length === 0) {
    return null;
  }

  return matches[matches.length - 1][1].trim();
};

export const isNonRootUser = (user: string | null): boolean => {
  if (!user) {
    return false;
  }

  const normalizedUser = user.trim().toLowerCase();
  return normalizedUser !== 'root' && normalizedUser !== '0' && normalizedUser !== '0:0';
};

export const verifySupplyChainPolicy = (input: {
  packageManager?: string;
  hasPackageLock: boolean;
  hasPnpmLock: boolean;
  dockerfileContent: string;
  composeContent: string;
}): SupplyChainVerificationResult => {
  const errors: string[] = [];
  const dockerfileImages = extractDockerfileBaseImages(input.dockerfileContent);
  const composeImages = extractComposeImageReferences(input.composeContent);
  const imageReferences = [...dockerfileImages, ...composeImages];

  if (!input.packageManager?.startsWith('npm@')) {
    errors.push('package.json 必须使用 packageManager 锁定 npm 版本。');
  }

  if (!input.hasPackageLock) {
    errors.push('必须保留 package-lock.json 作为唯一锁文件。');
  }

  if (input.hasPnpmLock) {
    errors.push('检测到 pnpm-lock.yaml，当前供应链策略只允许 npm 锁文件。');
  }

  for (const imageReference of imageReferences) {
    if (!isDigestPinnedImage(imageReference)) {
      errors.push(`镜像未固定 digest：${imageReference}`);
    }
  }

  const runtimeUser = getFinalDockerfileUser(input.dockerfileContent);
  if (!isNonRootUser(runtimeUser)) {
    errors.push('Dockerfile 最终运行用户必须是非 root。');
  }

  return {
    ok: errors.length === 0,
    errors,
    imageReferences,
  };
};
