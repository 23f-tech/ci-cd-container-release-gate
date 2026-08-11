FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
COPY src ./src

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/src ./src
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
