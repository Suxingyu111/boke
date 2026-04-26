#!/bin/bash
set -euo pipefail

CERT_DIR="${CERT_DIR:-/certs}"
INSTANCES_FILE="${INSTANCES_FILE:-/usr/share/elasticsearch/config/certs/instances.yml}"
CA_ZIP="${CERT_DIR}/ca.zip"
CERTS_ZIP="${CERT_DIR}/certs.zip"

mkdir -p "${CERT_DIR}"

if [[ ! -f "${CERT_DIR}/ca/ca.crt" || ! -f "${CERT_DIR}/elasticsearch/elasticsearch.crt" || ! -f "${CERT_DIR}/kibana/kibana.crt" ]]; then
  echo "正在生成 Elasticsearch / Kibana TLS 证书..."
  rm -rf "${CERT_DIR}/ca" "${CERT_DIR}/elasticsearch" "${CERT_DIR}/kibana" "${CA_ZIP}" "${CERTS_ZIP}"

  /usr/share/elasticsearch/bin/elasticsearch-certutil ca \
    --silent \
    --pem \
    --out "${CA_ZIP}"

  unzip -qo "${CA_ZIP}" -d "${CERT_DIR}"

  /usr/share/elasticsearch/bin/elasticsearch-certutil cert \
    --silent \
    --pem \
    --in "${INSTANCES_FILE}" \
    --ca-cert "${CERT_DIR}/ca/ca.crt" \
    --ca-key "${CERT_DIR}/ca/ca.key" \
    --out "${CERTS_ZIP}"

  unzip -qo "${CERTS_ZIP}" -d "${CERT_DIR}"
fi

find "${CERT_DIR}" -type d -exec chmod 750 {} \;
find "${CERT_DIR}" -type f -exec chmod 640 {} \;

echo "证书已准备完成。"
