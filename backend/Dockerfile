FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs ./
RUN mkdir /data && chown node:node /data
USER node
ENV PORT=8080 DATA_FILE=/data/rooms.json
EXPOSE 8080
CMD ["node","server.mjs"]
