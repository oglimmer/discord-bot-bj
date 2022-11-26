FROM node:18-slim

COPY . /home/bot

WORKDIR /home/bot

RUN npm i

CMD ["node", "index.js"]

