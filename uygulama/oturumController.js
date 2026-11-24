const bcrypt = require('bcryptjs');
const { epostaylaKullaniciBul } = require('./kullaniciVeri');

async function giris(req, res, next) {
  const { eposta, sifre } = req.body ?? {};

  if (
    typeof eposta !== 'string' ||
    !eposta.trim() ||
    typeof sifre !== 'string' ||
    !sifre ||
    Buffer.byteLength(sifre, 'utf8') > 72
  ) {
    return res.status(400).json({ hata: 'Geçerli bir e-posta ve şifre girin.' });
  }

  try {
    const kullanici = await epostaylaKullaniciBul(eposta.trim());

    if (!kullanici || !(await bcrypt.compare(sifre, kullanici.sifre_hash))) {
      return res.status(401).json({ hata: 'E-posta veya şifre hatalı.' });
    }

    const { id, ad, soyad, rol } = kullanici;

    return req.session.regenerate(hata => {
      if (hata) return next(hata);

      req.session.kullanici = { id, ad, soyad, rol };
      req.session.save(kayitHatasi => {
        if (kayitHatasi) return next(kayitHatasi);
        return res.json({ kullanici: req.session.kullanici });
      });
    });
  } catch (hata) {
    return next(hata);
  }
}

function oturumuGetir(req, res) {
  if (!req.session.kullanici) {
    return res.status(401).json({ hata: 'Giriş yapmanız gerekiyor.' });
  }

  return res.json({ kullanici: req.session.kullanici });
}

function cikis(req, res, next) {
  req.session.destroy(hata => {
    if (hata) return next(hata);
    res.clearCookie('yemekhane.sid', { path: '/' });
    return res.json({ mesaj: 'Çıkış yapıldı.' });
  });
}

module.exports = { giris, oturumuGetir, cikis };