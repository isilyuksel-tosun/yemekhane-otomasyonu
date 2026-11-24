const {
  gununMenusunuGetir,
  haftalikMenuyuGetir,
  rezervasyonOlustur,
  rezervasyonlariListele,
  rezervasyonuIptalEt,
} = require('./menuVeri');
const { menuOnbellegindenGetir } = require('./menuOnbellegi');

async function gununMenusu(req, res) {
  const { yemekhane_id: yemekhaneId, ogun_id: ogunId } = req.query;
  const pozitifTamSayi = /^[1-9]\d*$/;

  if (
    typeof yemekhaneId !== 'string' ||
    typeof ogunId !== 'string' ||
    !pozitifTamSayi.test(yemekhaneId) ||
    !pozitifTamSayi.test(ogunId)
  ) {
    return res.status(400).json({
      hata: 'Yemekhane ve öğün için geçerli bir seçim yapın.',
    });
  }

  try {
    const yemekler = await menuOnbellegindenGetir(
      yemekhaneId,
      ogunId,
      tarih => gununMenusunuGetir(yemekhaneId, ogunId, tarih)
    );
    const toplamKalori = yemekler.reduce(
      (toplam, yemek) => toplam + Number(yemek.kalori),
      0
    );

    return res.json({ toplam_kalori: toplamKalori, yemekler });
  } catch (hata) {
    console.error('Günün menüsü yüklenemedi:', hata.message);
    return res.status(500).json({ hata: 'Günün menüsü yüklenemedi.' });
  }
}

async function haftalikMenu(req, res) {
  const kullanici = req.session.kullanici;

  if (!kullanici) {
    return res.status(401).json({ hata: 'Giriş yapmanız gerekiyor.' });
  }

  const { yemekhane_id: yemekhaneId } = req.query;
  if (typeof yemekhaneId !== 'string' || !/^[1-9]\d*$/.test(yemekhaneId)) {
    return res.status(400).json({ hata: 'Geçerli bir yemekhane seçin.' });
  }

  try {
    const menuler = await haftalikMenuyuGetir(yemekhaneId, kullanici.rol);
    return res.json({ menuler });
  } catch (hata) {
    console.error('Haftalık menü yüklenemedi:', hata.message);
    return res.status(500).json({ hata: 'Haftalık menü yüklenemedi.' });
  }
}

async function rezervasyonYap(req, res) {
  const kullanici = req.session.kullanici;

  if (!kullanici) {
    return res.status(401).json({ hata: 'Giriş yapmanız gerekiyor.' });
  }

  const { menu_id: menuId } = req.body ?? {};

  if (!Number.isInteger(menuId) || menuId < 1 || menuId > 4294967295) {
    return res.status(400).json({ hata: 'Geçerli bir menü seçin.' });
  }

  try {
    const sonuc = await rezervasyonOlustur(kullanici.id, menuId);

    return res.status(201).json({
      mesaj: 'Rezervasyon yapıldı.',
      ...sonuc,
    });
  } catch (hata) {
    if (hata.sqlState === '45000') {
      return res.status(409).json({ hata: hata.sqlMessage });
    }

    console.error('Rezervasyon yapılamadı:', hata.message);
    return res.status(500).json({ hata: 'Rezervasyon yapılamadı.' });
  }
}

async function rezervasyonlarim(req, res) {
  const kullanici = req.session.kullanici;
  if (!kullanici) {
    return res.status(401).json({ hata: 'Giriş yapmanız gerekiyor.' });
  }

  try {
    const rezervasyonlar = await rezervasyonlariListele(kullanici.id);
    return res.json({ rezervasyonlar });
  } catch (hata) {
    console.error('Rezervasyonlar yüklenemedi:', hata.message);
    return res.status(500).json({ hata: 'Rezervasyonlar yüklenemedi.' });
  }
}

async function rezervasyonIptal(req, res) {
  const kullanici = req.session.kullanici;
  if (!kullanici) {
    return res.status(401).json({ hata: 'Giriş yapmanız gerekiyor.' });
  }

  const { id } = req.params;
  if (!/^[1-9]\d{0,9}$/.test(id) || Number(id) > 4294967295) {
    return res.status(400).json({ hata: 'Geçerli bir rezervasyon seçin.' });
  }

  try {
    const sonuc = await rezervasyonuIptalEt(kullanici.id, Number(id));
    return res.json({ mesaj: 'Rezervasyon iptal edildi.', ...sonuc });
  } catch (hata) {
    if (hata.sqlState === '45000') {
      return res.status(409).json({ hata: hata.sqlMessage });
    }

    console.error('Rezervasyon iptal edilemedi:', hata.message);
    return res.status(500).json({ hata: 'Rezervasyon iptal edilemedi.' });
  }
}

module.exports = {
  gununMenusu,
  haftalikMenu,
  rezervasyonYap,
  rezervasyonlarim,
  rezervasyonIptal,
};