FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

RUN npm prune --production

EXPOSE 3004

CMD ["npm", "start"]
