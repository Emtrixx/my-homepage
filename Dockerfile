FROM node:22-alpine

# Install qpdf from the apk repository
RUN apk add --no-cache qpdf

WORKDIR /home/node/app

COPY package*.json ./
RUN npm install

COPY . .

CMD [ "npm", "start" ]