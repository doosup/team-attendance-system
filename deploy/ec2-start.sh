#!/bin/bash
# EC2에서 실행: 최신 코드를 받고, Secrets Manager 값으로 .env를 만든 뒤 앱을 띄운다.
# 비밀값은 EC2의 IAM 역할로 읽는다 (서버에 저장된 키 없음). 다시 실행하면 새 코드로 재배포
set -euo pipefail
cd "$(dirname "$0")/.."

BRANCH=${1:-main}
git fetch --quiet origin "$BRANCH" && git checkout --quiet -B "$BRANCH" "origin/$BRANCH"

umask 077 # .env는 소유자만 읽기
aws secretsmanager get-secret-value --secret-id attendance/prod \
  --region ap-northeast-2 --query SecretString --output text |
  python3 -c 'import json, sys; [print(f"{k}={v}") for k, v in json.load(sys.stdin).items()]' > .env
echo 'WEB_PORT=80' >> .env

docker compose up -d --build --wait
docker compose ps
