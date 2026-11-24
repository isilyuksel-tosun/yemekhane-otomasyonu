const { okumaHavuzu, yazmaHavuzu } = require('./db');

async function gununMenusunuGetir(yemekhaneId, ogunId) {
  const [yemekler] = await okumaHavuzu.query(
    `SELECT yemek_id, yemek, kategori, kalori, vejetaryen, alerjenler
     FROM v_menu_detay
     WHERE tarih = CURDATE() AND yemekhane_id = ? AND ogun_id = ?
     ORDER BY kategori_sira, yemek`,
    [yemekhaneId, ogunId]
  );

  return yemekler;
}

async function haftalikMenuyuGetir(yemekhaneId, rol) {
  const [menuler] = await okumaHavuzu.query(
    `SELECT
       d.menu_id,
       DATE_FORMAT(d.tarih, '%Y-%m-%d') AS tarih,
       d.yemekhane,
       d.ogun_id,
       d.ogun,
       d.bos_yer,
       CASE WHEN ? = 'ogrenci' THEN m.ogrenci_fiyati
            ELSE m.personel_fiyati END AS fiyat,
       DATE_FORMAT(d.rezervasyon_son, '%H:%i') AS son_saat,
       NOW() >= d.rezervasyon_son AS sure_doldu,
       (
         SELECT GROUP_CONCAT(v.yemek ORDER BY v.kategori_sira, v.yemek SEPARATOR ', ')
         FROM v_menu_detay v
         WHERE v.menu_id = d.menu_id
       ) AS yemekler
     FROM v_menu_doluluk d
     JOIN menuler m ON m.id = d.menu_id
     WHERE d.yemekhane_id = ?
       AND d.tarih >= CURDATE()
       AND d.tarih < DATE_ADD(CURDATE(), INTERVAL 7 DAY)
     ORDER BY d.tarih, d.rezervasyon_son, d.menu_id`,
    [rol, yemekhaneId]
  );

  return menuler;
}

async function rezervasyonOlustur(kullaniciId, menuId) {
  const [sonuclar] = await yazmaHavuzu.query(
    'CALL sp_rezervasyon_yap(?, ?)',
    [kullaniciId, menuId]
  );

  return sonuclar[0][0];
}

async function rezervasyonlariListele(kullaniciId) {
  const [rezervasyonlar] = await okumaHavuzu.query(
    `SELECT r.id AS rezervasyon_id,
            r.menu_id,
            DATE_FORMAT(m.tarih, '%Y-%m-%d') AS tarih,
            y.ad AS yemekhane,
            o.ad AS ogun,
            r.durum,
            r.ucret,
            (r.durum = 'aktif' AND NOW() < TIMESTAMP(m.tarih, o.son_saat))
              AS iptal_edilebilir
     FROM rezervasyonlar r
     JOIN menuler m ON m.id = r.menu_id
     JOIN yemekhaneler y ON y.id = m.yemekhane_id
     JOIN ogunler o ON o.id = m.ogun_id
     WHERE r.kullanici_id = ?
     ORDER BY iptal_edilebilir DESC, m.tarih DESC, o.son_saat, r.id DESC`,
    [kullaniciId]
  );

  return rezervasyonlar;
}

async function rezervasyonuIptalEt(kullaniciId, rezervasyonId) {
  const [sonuclar] = await yazmaHavuzu.query(
    'CALL sp_rezervasyon_iptal(?, ?)',
    [kullaniciId, rezervasyonId]
  );

  return sonuclar[0][0];
}

module.exports = {
  gununMenusunuGetir,
  haftalikMenuyuGetir,
  rezervasyonOlustur,
  rezervasyonlariListele,
  rezervasyonuIptalEt,
};