FROM node:20

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY package.json /opt/app/
COPY package-lock.json /opt/app/
COPY tsconfig.json /opt/app/
COPY src /opt/app/src

RUN npm install

CMD [ "npm", "start" ]