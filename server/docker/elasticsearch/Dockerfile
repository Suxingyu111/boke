ARG ELASTICSEARCH_IMAGE=docker.elastic.co/elasticsearch/elasticsearch:8.13.4
FROM ${ELASTICSEARCH_IMAGE}

ARG IK_VERSION=8.13.4
ARG PINYIN_VERSION=8.13.4

RUN /usr/share/elasticsearch/bin/elasticsearch-plugin install --batch \
    https://get.infini.cloud/elasticsearch/analysis-ik/${IK_VERSION}

RUN /usr/share/elasticsearch/bin/elasticsearch-plugin install --batch \
    https://get.infini.cloud/elasticsearch/analysis-pinyin/${PINYIN_VERSION}

RUN /usr/share/elasticsearch/bin/elasticsearch-plugin list | grep -qx 'analysis-ik'
RUN /usr/share/elasticsearch/bin/elasticsearch-plugin list | grep -qx 'analysis-pinyin'
