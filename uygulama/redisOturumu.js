const { randomBytes } = require('node:crypto');
const session = require('express-session');
const { createClient } = require('redis');
const { RedisStore } = require('connect-redis');

const redisHost = process.env.REDIS_HOST || 'redis';
const redisPort = Number(process.env.REDIS_PORT || 6379);
const redis = createClient({
  socket: { host: redisHost, port: redisPort },
});

redis.on('error', hata => {
  console.error('Redis bağlantı hatası:', hata.message);
});

async function redisOturumunuHazirla() {
  await redis.connect();

  const imzaAnahtariAdi = 'yemekhane:oturum-imza-anahtari';
  await redis.set(imzaAnahtariAdi, randomBytes(32).toString('hex'), { NX: true });
  const imzaAnahtari = await redis.get(imzaAnahtariAdi);

  if (!imzaAnahtari) {
    throw new Error('Oturum imza anahtarı alınamadı.');
  }

  return session({
    store: new RedisStore({
      client: redis,
      prefix: 'oturum:',
      ttl: 30 * 60,
    }),
    name: 'yemekhane.sid',
    secret: imzaAnahtari,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000,
    },
  });
}

module.exports = { redis, redisOturumunuHazirla };