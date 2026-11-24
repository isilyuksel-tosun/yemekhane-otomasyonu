const express = require('express');
const { yazmaHavuzu, okumaHavuzu } = require('./db');
const { yemekhaneleriListele } = require('./yemekhaneVeri');
const {
  gununMenusu,
  haftalikMenu,
  rezervasyonYap,
  rezervasyonlarim,
  rezervasyonIptal,
} = require('./menuController');
const { redisOturumunuHazirla } = require('./redisOturumu');
const { giris, oturumuGetir, cikis } = require('./oturumController');
const { bakiyeGoster, bakiyeYuklemeYap } = require('./bakiyeController');
const {
  degerlendirmeleriListele,
  degerlendirmeYap,
} = require('./degerlendirmeController');
const {
  yoneticiGerekli,
  yonetimListesiniGoster,
  yonetimMenusunuKaydet,
} = require('./yonetimController');
const {
  profilAlerjenleriniListele,
  profilAlerjenleriniGuncelle,
} = require('./profilController');

const app = express();
const port = 8000;

app.use(express.json());

async function baslat() {
  app.use(await redisOturumunuHazirla());

app.post('/api/giris', giris);
app.get('/api/oturum', oturumuGetir);
app.post('/api/cikis', cikis);

app.get('/api/', (_req, res) => {
  res.json({ durum: 'ok', servis: 'yemekhane-api' });
});

app.get('/api/veritabani-durumu', async (_req, res) => {
  const sorgu = 'SELECT @@GLOBAL.read_only AS salt_okunur';

  try {
    const [kaynak] = await yazmaHavuzu.query(sorgu);
    const [replika] = await okumaHavuzu.query(sorgu);

    res.json({
      kaynak: { salt_okunur: Boolean(kaynak[0].salt_okunur) },
      replika: { salt_okunur: Boolean(replika[0].salt_okunur) },
    });
  } catch (hata) {
    console.error('MySQL bağlantı kontrolü başarısız:', hata.message);
    res.status(503).json({ hata: 'Veritabanı bağlantısı kurulamadı.' });
  }
});

app.get('/api/yemekhaneler', async (_req, res, next) => {
  try {
    res.json(await yemekhaneleriListele());
  } catch (hata) {
    next(hata);
  }
});

app.get('/api/gunun-menusu', gununMenusu);

app.get('/api/haftalik-menu', haftalikMenu);

app.post('/api/rezervasyonlar', rezervasyonYap);

app.get('/api/rezervasyonlar', rezervasyonlarim);
app.post('/api/rezervasyonlar/:id/iptal', rezervasyonIptal);

app.get('/api/bakiye', bakiyeGoster);
app.post('/api/bakiye/yukle', bakiyeYuklemeYap);

app.get('/api/degerlendirmeler', degerlendirmeleriListele);
app.post('/api/degerlendirmeler', degerlendirmeYap);

app.use('/api/yonetim', yoneticiGerekli);
app.get('/api/yonetim/menuler', yonetimListesiniGoster);
app.post('/api/yonetim/menuler', yonetimMenusunuKaydet);
app.put('/api/yonetim/menuler/:id', yonetimMenusunuKaydet);

app.get('/api/profil/alerjenler', profilAlerjenleriniListele);
app.put('/api/profil/alerjenler', profilAlerjenleriniGuncelle);

app.listen(port, '0.0.0.0', () => {
  console.log(`Yemekhane API ${port} portunda çalışıyor.`);
});

}

baslat().catch(hata => {
  console.error('Uygulama başlatılamadı:', hata.message);
  process.exit(1);
});