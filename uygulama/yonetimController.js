const { yonetimVerileriniGetir, menuKaydet } = require('./yonetimVeri');

function yoneticiGerekli(req, res, next) {
  const kullanici = req.session.kullanici;

  if (!kullanici) {
    return res.status(401).json({ hata: 'Giriş yapmanız gerekiyor.' });
  }

  if (kullanici.rol !== 'yonetici') {
    return res.status(403).json({ hata: 'Bu işlem için yönetici yetkisi gerekiyor.' });
  }

  return next();
}

async function yonetimListesiniGoster(_req, res) {
  try {
    return res.json(await yonetimVerileriniGetir());
  } catch (hata) {
    console.error('Yönetim listesi yüklenemedi:', hata.message);
    return res.status(500).json({ hata: 'Yönetim listesi yüklenemedi.' });
  }
}

function fiyatDegeriniAl(fiyat) {
  if (typeof fiyat !== 'string' && typeof fiyat !== 'number') return null;
  const deger = String(fiyat).trim().replace(',', '.');
  return /^\d{1,6}(\.\d{1,2})?$/.test(deger) ? deger : null;
}

function gecerliTarihMi(tarih) {
  if (typeof tarih !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(tarih)) {
    return false;
  }

  const gun = new Date(`${tarih}T00:00:00Z`);
  return Number.isFinite(gun.getTime()) && gun.toISOString().slice(0, 10) === tarih;
}

function gecerliIdMi(id, enBuyuk) {
  return Number.isInteger(id) && id >= 1 && id <= enBuyuk;
}

async function yonetimMenusunuKaydet(req, res) {
  const olusturma = req.params.id === undefined;
  const menuId = olusturma ? null : Number(req.params.id);

  if (!olusturma && (!/^[1-9]\d{0,9}$/.test(req.params.id) || !gecerliIdMi(menuId, 4294967295))) {
    return res.status(400).json({ hata: 'Geçerli bir menü seçin.' });
  }

  const veri = req.body ?? {};
  const ogrenciFiyati = fiyatDegeriniAl(veri.ogrenci_fiyati);
  const personelFiyati = fiyatDegeriniAl(veri.personel_fiyati);

  if (ogrenciFiyati === null || personelFiyati === null) {
    return res.status(400).json({ hata: 'Öğrenci ve personel için geçerli fiyat girin.' });
  }

  if (
    !Array.isArray(veri.yemek_idleri) ||
    veri.yemek_idleri.length === 0 ||
    !veri.yemek_idleri.every(id => gecerliIdMi(id, 65535))
  ) {
    return res.status(400).json({ hata: 'En az bir geçerli yemek seçin.' });
  }

  if (olusturma && (
    !gecerliIdMi(veri.yemekhane_id, 255) ||
    !gecerliIdMi(veri.ogun_id, 255) ||
    !gecerliTarihMi(veri.tarih)
  )) {
    return res.status(400).json({ hata: 'Geçerli yemekhane, tarih ve öğün seçin.' });
  }

  try {
    const kayitId = await menuKaydet(menuId, {
      ...veri,
      ogrenci_fiyati: ogrenciFiyati,
      personel_fiyati: personelFiyati,
      yemek_idleri: [...new Set(veri.yemek_idleri)],
    });

    if (kayitId === null) {
      return res.status(404).json({ hata: 'Menü bulunamadı.' });
    }

    return res.status(olusturma ? 201 : 200).json({
      menu_id: kayitId,
      mesaj: olusturma ? 'Menü oluşturuldu.' : 'Menü güncellendi.',
    });
  } catch (hata) {
    if (hata.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ hata: 'Bu yemekhane, tarih ve öğün için zaten bir menü var.' });
    }

    if (hata.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ hata: 'Seçilen yemekhane, öğün veya yemek bulunamadı.' });
    }

    console.error('Menü kaydedilemedi:', hata.message);
    return res.status(500).json({ hata: 'Menü kaydedilemedi.' });
  }
}

module.exports = {
  yoneticiGerekli,
  yonetimListesiniGoster,
  yonetimMenusunuKaydet,
};