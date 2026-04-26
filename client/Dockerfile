FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=/api
ARG VITE_ASSET_CDN=/
ARG VITE_PAGE_CACHE_TTL=60000

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_ASSET_CDN=${VITE_ASSET_CDN}
ENV VITE_PAGE_CACHE_TTL=${VITE_PAGE_CACHE_TTL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
