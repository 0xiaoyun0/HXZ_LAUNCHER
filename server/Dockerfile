FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json ./
COPY pnpm-lock.yaml ./
RUN npm install --global pnpm@11.1.2 && pnpm install --prod --frozen-lockfile
COPY src ./src
COPY public ./public
COPY arcana ./arcana
RUN mkdir /app/data && chown -R node:node /app
USER node
ENV HOST=0.0.0.0 PORT=8787 HXZ_DATA=/app/data
VOLUME ["/app/data"]
EXPOSE 8787
CMD ["node", "src/server.mjs"]
