const { bakiyeBilgileriniGetir, bakiyeYukle } = require('./bakiyeVeri');

async function bakiyeGoster(req, res) {
  const kullanici = req.session.kullanici;

  if (!kullanici) {
    return res.status(401).json({ hata: 'Giriş yapmanız gerekiyor.' });
  }

  try {
    const sonuc = await bakiyeBilgileriniGetir(kullanici.id);

    if (!sonuc) {
      return res.status(404).json({ hata: 'Kullanıcı bulunamadı.' });
    }

    return res.json(sonuc);
  } catch (hata) {
    console.error('Bakiye yüklenemedi:', hata.message);
    return res.status(500).json({ hata: 'Bakiye bilgileri yüklenemedi.' });
  }
}

async function bakiyeYuklemeYap(req, res) {
  const kullanici = req.session.kullanici;

  if (!kullanici) {
    return res.status(401).json({ hata: 'Giriş yapmanız gerekiyor.' });
  }

  const { tutar } = req.body ?? {};
  const deger = typeof tutar === 'number' || typeof tutar === 'string'
    ? String(tutar).trim().replace(',', '.')
    : '';

  if (!/^\d{1,4}(\.\d{1,2})?$/.test(deger) || Number(deger) < 10 || Number(deger) > 1000) {
    return res.status(400).json({
      hata: '10 ile 1.000 TL arasında, en fazla iki ondalık basamaklı bir tutar girin.',
    });
  }

  try {
    const sonuc = await bakiyeYukle(kullanici.id, deger);
    return res.status(201).json({ mesaj: 'Bakiye yüklendi.', ...sonuc });
  } catch (hata) {
    if (hata.sqlState === '45000') {
      return res.status(409).json({ hata: hata.sqlMessage });
    }

    console.error('Bakiye yüklenemedi:', hata.message);
    return res.status(500).json({ hata: 'Bakiye yüklenemedi.' });
  }
}

module.exports = { bakiyeGoster, bakiyeYuklemeYap };