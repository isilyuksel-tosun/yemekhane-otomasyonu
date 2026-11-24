const { okumaHavuzu } = require('./db');

async function epostaylaKullaniciBul(eposta) {
  const [satirlar] = await okumaHavuzu.query(
    `SELECT id, ad, soyad, rol, sifre_hash
     FROM kullanicilar
     WHERE eposta = ? AND aktif = 1`,
    [eposta]
  );

  return satirlar[0];
}

module.exports = { epostaylaKullaniciBul };