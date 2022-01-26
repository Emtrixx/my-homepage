FROM node:14
WORKDIR /home
RUN apt-get update \
      && apt-get install -y sudo
RUN apt install build-essential
RUN apt install zlib1g-dev
RUN apt install  libjpeg-dev
RUN git clone https://github.com/qpdf/qpdf.git
RUN cd qpdf/ && ./configure && make && make install
RUN export LD_LIBRARY_PATH=/usr/local/lib
RUN ldconfig
WORKDIR /home/node/app
COPY package.json .
RUN npm install
COPY . .
CMD [ "npm", "start" ]

