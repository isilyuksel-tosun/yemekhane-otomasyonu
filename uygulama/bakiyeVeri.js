const { okumaHavuzu, yazmaHavuzu } = require('./db');

async function bakiyeBilgileriniGetir(kullaniciId) {
  const [satirlar] = await okumaHavuzu.query(
    `SELECT k.bakiye,
            h.id AS hareket_id,
            h.tur,
            h.tutar,
            h.aciklama,
            DATE_FORMAT(h.olusturma, '%Y-%m-%d %H:%i:%s') AS tarih
     FROM kullanicilar k
     LEFT JOIN bakiye_hareketleri h ON h.kullanici_id = k.id
     WHERE k.id = ?
     ORDER BY h.olusturma DESC, h.id DESC`,
    [kullaniciId]
  );

  if (satirlar.length === 0) return null;

  return {
    bakiye: satirlar[0].bakiye,
    hareketler: satirlar
      .filter(satir => satir.hareket_id !== null)
      .map(({ hareket_id, tur, tutar, aciklama, tarih }) => ({
        hareket_id, tur, tutar, aciklama, tarih,
      })),
  };
}

async function bakiyeYukle(kullaniciId, tutar) {
  const [sonuclar] = await yazmaHavuzu.query(
    'CALL sp_bakiye_yukle(?, ?)',
    [kullaniciId, tutar]
  );

  return sonuclar[0][0];
}

module.exports = { bakiyeBilgileriniGetir, bakiyeYukle };