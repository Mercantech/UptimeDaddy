FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_ACCOUNTS_URL=http://localhost:6969/accounts
ARG VITE_API_URL=http://localhost:8080/api
ENV VITE_ACCOUNTS_URL=$VITE_ACCOUNTS_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# preview læser vite.config.js (allowedHosts m.m.) — uden denne fil ignoreres konfigurationen
COPY --from=build /app/vite.config.js ./vite.config.js

RUN apk add --no-cache bash

EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]