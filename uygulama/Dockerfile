FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js db.js yemekhaneVeri.js menuController.js menuVeri.js kullaniciVeri.js oturumController.js bakiyeVeri.js bakiyeController.js degerlendirmeVeri.js degerlendirmeController.js yonetimVeri.js yonetimController.js redisOturumu.js menuOnbellegi.js profilVeri.js profilController.js ./

EXPOSE 8000
CMD ["npm", "start"]