# 백엔드 상자: 빌드 후, 켤 때 마이그레이션 → 시드(이미 있는 건 건드리지 않음) → 서버 순서로 실행한다.
# slim(glibc): bcrypt 네이티브 모듈·Prisma 엔진이 그대로 동작. Prisma 엔진은 openssl이 필요
FROM node:24-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
# 관리자(root)가 아닌 일반 사용자로 실행: 상자가 뚫려도 할 수 있는 일을 줄인다
WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . .
RUN npx prisma generate && npm run build

# shortcut: 시작 시 migrate deploy·seed에 prisma CLI·ts-node가 필요해 devDependencies까지 남긴다 (이미지 약 1.5GB).
# 이미지 크기가 문제되면 마이그레이션을 별도 단계로 빼고 npm prune --omit=dev
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/main"]
