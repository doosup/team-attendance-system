# 화면 상자: Vue를 빌드해 정적 파일로 만들고 nginx가 제공한다. /api는 nginx가 백엔드 상자로 넘긴다.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
