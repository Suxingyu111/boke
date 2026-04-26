import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { existsSync, readFileSync } from 'fs';
import { isAbsolute, resolve } from 'path';

export const ELASTICSEARCH_CLIENT = 'ELASTICSEARCH_CLIENT';

const logger = new Logger('ElasticsearchProvider');

export const ElasticsearchProvider: Provider = {
  provide: ELASTICSEARCH_CLIENT,
  useFactory: (configService: ConfigService): Client => {
    const node = configService.get<string>('elasticsearch.node', 'http://localhost:9200');
    const username = configService.get<string>('elasticsearch.username', '');
    const password = configService.get<string>('elasticsearch.password', '');
    const caCertPath = configService.get<string>('elasticsearch.caCertPath', '');
    const tlsRejectUnauthorized = configService.get<boolean>(
      'elasticsearch.tlsRejectUnauthorized',
      true,
    );

    const clientOptions: ConstructorParameters<typeof Client>[0] = { node };

    if (username && password) {
      clientOptions.auth = { username, password };
    }

    if (node.startsWith('https://')) {
      clientOptions.tls = {
        rejectUnauthorized: tlsRejectUnauthorized,
      };

      if (caCertPath) {
        const resolvedCaPath = isAbsolute(caCertPath)
          ? caCertPath
          : resolve(process.cwd(), caCertPath);

        if (existsSync(resolvedCaPath)) {
          clientOptions.tls.ca = readFileSync(resolvedCaPath);
        } else {
          logger.warn(`未找到 Elasticsearch CA 证书文件: ${resolvedCaPath}`);
        }
      }
    }

    const client = new Client(clientOptions);

    // 异步测试连接，不阻塞启动
    client.ping().then(
      () => logger.log('Elasticsearch 连接成功'),
      (err: Error) => logger.warn(`Elasticsearch 连接失败，搜索功能将不可用: ${err.message}`),
    );

    return client;
  },
  inject: [ConfigService],
};
