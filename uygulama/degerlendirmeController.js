const {
  kullanilmisMenuleriListele,
  degerlendirmeOlustur,
} = require('./degerlendirmeVeri');

async function degerlendirmeleriListele(req, res) {
  const kullanici = req.session.kullanici;

  if (!kullanici) {
    return res.status(401).json({ hata: 'Giriş yapmanız gerekiyor.' });
  }

  try {
    const menuler = await kullanilmisMenuleriListele(kullanici.id);
    return res.json({ menuler });
  } catch (hata) {
    console.error('Değerlendirmeler yüklenemedi:', hata.message);
    return res.status(500).json({ hata: 'Değerlendirmeler yüklenemedi.' });
  }
}

async function degerlendirmeYap(req, res) {
  const kullanici = req.session.kullanici;

  if (!kullanici) {
    return res.status(401).json({ hata: 'Giriş yapmanız gerekiyor.' });
  }

  const { menu_id: menuId, puan, yorum = '' } = req.body ?? {};

  if (!Number.isInteger(menuId) || menuId < 1 || menuId > 4294967295) {
    return res.status(400).json({ hata: 'Geçerli bir menü seçin.' });
  }

  if (!Number.isInteger(puan) || puan < 1 || puan > 5) {
    return res.status(400).json({ hata: 'Puan 1 ile 5 arasında olmalıdır.' });
  }

  if (typeof yorum !== 'string' || yorum.trim().length > 500) {
    return res.status(400).json({ hata: 'Yorum en fazla 500 karakter olabilir.' });
  }

  const temizYorum = yorum.trim() || null;

  try {
    const olusturuldu = await degerlendirmeOlustur(
      kullanici.id, menuId, puan, temizYorum
    );

    if (!olusturuldu) {
      return res.status(409).json({ hata: 'Yalnızca kullandığınız menüleri değerlendirebilirsiniz.' });
    }

    return res.status(201).json({
      mesaj: 'Değerlendirme kaydedildi.',
      menu_id: menuId,
      puan,
      yorum: temizYorum,
    });
  } catch (hata) {
    if (hata.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ hata: 'Bu menüyü daha önce değerlendirdiniz.' });
    }

    console.error('Değerlendirme kaydedilemedi:', hata.message);
    return res.status(500).json({ hata: 'Değerlendirme kaydedilemedi.' });
  }
}

module.exports = { degerlendirmeleriListele, degerlendirmeYap };