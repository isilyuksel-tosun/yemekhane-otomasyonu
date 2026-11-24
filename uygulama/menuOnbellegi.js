const { redis } = require('./redisOturumu');
const { okumaHavuzu, yazmaHavuzu } = require('./db');

const istanbulTarihi = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Istanbul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const menuIslemSirasi = new Map();

function bugununTarihi() {
  return istanbulTarihi.format(new Date());
}

function menuAnahtari(yemekhaneId, tarih, ogunId) {
  return `menu:${yemekhaneId}:${tarih}:${ogunId}`;
}

function geceYarisi(tarih) {
  return Date.parse(`${tarih}T00:00:00+03:00`) / 1000 + 86400;
}

async function siraylaCalistir(anahtar, islem) {
  const onceki = menuIslemSirasi.get(anahtar) || Promise.resolve();
  const sonuc = onceki.catch(() => {}).then(islem);
  menuIslemSirasi.set(anahtar, sonuc);

  try {
    return await sonuc;
  } finally {
    if (menuIslemSirasi.get(anahtar) === sonuc) {
      menuIslemSirasi.delete(anahtar);
    }
  }
}

async function menuOnbellegindenGetir(yemekhaneId, ogunId, veritabanindanOku) {
  const tarih = bugununTarihi();
  const anahtar = menuAnahtari(yemekhaneId, tarih, ogunId);
  const replikaAnahtari = `menu-replika:${anahtar}`;

  return siraylaCalistir(anahtar, async () => {
    const onbellek = await redis.get(anahtar);

    if (onbellek !== null) {
      console.log(`[menü önbelleği] Redis: ${anahtar}`);
      return JSON.parse(onbellek);
    }

    const beklenenGtid = await redis.get(replikaAnahtari);
    let onbellegeYaz = beklenenGtid === null;

    if (beklenenGtid && beklenenGtid !== 'bekleniyor') {
      const [[sonuc]] = await okumaHavuzu.query(
        'SELECT WAIT_FOR_EXECUTED_GTID_SET(?, 2) AS durum',
        [beklenenGtid]
      );
      onbellegeYaz = sonuc.durum === 0 || sonuc.durum === '0';

      if (onbellegeYaz) {
        await redis.del(replikaAnahtari);
      }
    }

    const yemekler = await veritabanindanOku(tarih);
    console.log(`[menü önbelleği] MySQL replika: ${anahtar}`);

    if (onbellegeYaz) {
      await redis.set(anahtar, JSON.stringify(yemekler), {
        EXAT: geceYarisi(tarih),
      });
    }

    return yemekler;
  });
}

async function menuGuncellemesiniUygula(menu, kaydet) {
  if (menu.tarih !== bugununTarihi()) {
    return kaydet();
  }

  const anahtar = menuAnahtari(menu.yemekhane_id, menu.tarih, menu.ogun_id);
  const replikaAnahtari = `menu-replika:${anahtar}`;

  return siraylaCalistir(anahtar, async () => {
    const son = geceYarisi(menu.tarih);
    const [, silinen] = await redis.multi()
      .set(replikaAnahtari, 'bekleniyor', { EXAT: son })
      .del(anahtar)
      .exec();

    console.log(`[menü önbelleği] Geçersiz kılındı: ${anahtar}, silinen: ${silinen}`);

    try {
      return await kaydet();
    } finally {
      try {
        const [[kaynak]] = await yazmaHavuzu.query(
          'SELECT @@GLOBAL.gtid_executed AS gtid'
        );
        await redis.set(replikaAnahtari, kaynak.gtid, { EXAT: son });
      } catch (hata) {
        console.error('Menü replikasyon durumu kaydedilemedi:', hata.message);
      }
    }
  });
}

module.exports = { menuOnbellegindenGetir, menuGuncellemesiniUygula };