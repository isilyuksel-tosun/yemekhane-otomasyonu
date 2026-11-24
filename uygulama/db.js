const mysql = require('mysql2/promise');

const ortakAyarlar = {
  port: Number(process.env.DB_PORT),
  user: process.env.DB_KULLANICI,
  password: process.env.DB_SIFRE,
  database: process.env.DB_ADI,
};

const yazmaHavuzu = mysql.createPool({
  ...ortakAyarlar,
  host: process.env.DB_YAZMA_HOST,
});

const okumaHavuzu = mysql.createPool({
  ...ortakAyarlar,
  host: process.env.DB_OKUMA_HOST,
});

module.exports = { yazmaHavuzu, okumaHavuzu };