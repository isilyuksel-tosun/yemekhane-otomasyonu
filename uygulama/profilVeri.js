const { okumaHavuzu, yazmaHavuzu } = require('./db');

async function profilAlerjenleriniGetir(kullaniciId) {
  const [alerjenler] = await okumaHavuzu.query(
    `SELECT a.id, a.ad, ka.alerjen_id IS NOT NULL AS secili
     FROM alerjenler a
     LEFT JOIN kullanici_alerjenleri ka
       ON ka.alerjen_id = a.id AND ka.kullanici_id = ?
     ORDER BY a.ad`,
    [kullaniciId]
  );

  return alerjenler.map(alerjen => ({
    ...alerjen,
    secili: Number(alerjen.secili) === 1,
  }));
}

async function profilAlerjenleriniKaydet(kullaniciId, alerjenIdleri) {
  const baglanti = await yazmaHavuzu.getConnection();

  try {
    await baglanti.beginTransaction();

    const [[kullanici]] = await baglanti.query(
      'SELECT id FROM kullanicilar WHERE id = ? FOR UPDATE',
      [kullaniciId]
    );

    if (!kullanici) {
      await baglanti.rollback();
      return false;
    }

    await baglanti.query(
      'DELETE FROM kullanici_alerjenleri WHERE kullanici_id = ?',
      [kullaniciId]
    );

    if (alerjenIdleri.length > 0) {
      const satirlar = alerjenIdleri.map(id => [kullaniciId, id]);

      await baglanti.query(
        'INSERT INTO kullanici_alerjenleri (kullanici_id, alerjen_id) VALUES ?',
        [satirlar]
      );
    }

    await baglanti.commit();
    return true;
  } catch (hata) {
    await baglanti.rollback();
    throw hata;
  } finally {
    baglanti.release();
  }
}

module.exports = { profilAlerjenleriniGetir, profilAlerjenleriniKaydet };