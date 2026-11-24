const {
  profilAlerjenleriniGetir,
  profilAlerjenleriniKaydet,
} = require('./profilVeri');

async function profilAlerjenleriniListele(req, res) {
  const kullanici = req.session.kullanici;

  if (!kullanici) {
    return res.status(401).json({ hata: 'Giriş yapmanız gerekiyor.' });
  }

  try {
    const alerjenler = await profilAlerjenleriniGetir(kullanici.id);
    return res.json({ alerjenler });
  } catch (hata) {
    console.error('Alerjen tercihleri yüklenemedi:', hata.message);
    return res.status(500).json({ hata: 'Alerjen tercihleri yüklenemedi.' });
  }
}

async function profilAlerjenleriniGuncelle(req, res) {
  const kullanici = req.session.kullanici;

  if (!kullanici) {
    return res.status(401).json({ hata: 'Giriş yapmanız gerekiyor.' });
  }

  const { alerjen_idleri: alerjenIdleri } = req.body ?? {};

  if (
    !Array.isArray(alerjenIdleri) ||
    alerjenIdleri.length > 255 ||
    !alerjenIdleri.every(id => Number.isInteger(id) && id >= 1 && id <= 255)
  ) {
    return res.status(400).json({ hata: 'Geçerli alerjenler seçin.' });
  }

  const secimler = [...new Set(alerjenIdleri)];

  try {
    const kaydedildi = await profilAlerjenleriniKaydet(kullanici.id, secimler);

    if (!kaydedildi) {
      return res.status(404).json({ hata: 'Kullanıcı bulunamadı.' });
    }

    return res.json({
      mesaj: 'Alerjen tercihleri kaydedildi.',
      alerjen_idleri: secimler,
    });
  } catch (hata) {
    if (hata.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ hata: 'Seçilen alerjenlerden biri bulunamadı.' });
    }

    console.error('Alerjen tercihleri kaydedilemedi:', hata.message);
    return res.status(500).json({ hata: 'Alerjen tercihleri kaydedilemedi.' });
  }
}

module.exports = { profilAlerjenleriniListele, profilAlerjenleriniGuncelle };