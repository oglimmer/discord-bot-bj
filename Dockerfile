FROM node:18-slim

COPY . /home/bot

WORKDIR /home/bot

RUN npm ci

CMD ["npm", "run", "start"]
