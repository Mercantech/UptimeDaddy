FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_ACCOUNTS_URL=http://localhost:6969/accounts
ARG VITE_API_URL=http://localhost:8080/api
ARG VITE_BUILD_ID=
ARG VITE_MERCANTEC_CLIENT_ID=
ARG VITE_MERCANTEC_ISSUER=https://auth.mercantec.tech
ENV VITE_ACCOUNTS_URL=$VITE_ACCOUNTS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BUILD_ID=$VITE_BUILD_ID
ENV VITE_MERCANTEC_CLIENT_ID=$VITE_MERCANTEC_CLIENT_ID
ENV VITE_MERCANTEC_ISSUER=$VITE_MERCANTEC_ISSUER

RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
