const { okumaHavuzu, yazmaHavuzu } = require('./db');

async function kullanilmisMenuleriListele(kullaniciId) {
  const [menuler] = await okumaHavuzu.query(
    `SELECT r.menu_id,
            DATE_FORMAT(m.tarih, '%Y-%m-%d') AS tarih,
            y.ad AS yemekhane,
            o.ad AS ogun,
            d.puan,
            d.yorum
     FROM rezervasyonlar r
     JOIN menuler m ON m.id = r.menu_id
     JOIN yemekhaneler y ON y.id = m.yemekhane_id
     JOIN ogunler o ON o.id = m.ogun_id
     LEFT JOIN degerlendirmeler d
       ON d.kullanici_id = r.kullanici_id AND d.menu_id = r.menu_id
     WHERE r.kullanici_id = ? AND r.durum = 'kullanildi'
     ORDER BY m.tarih DESC, o.son_saat DESC, r.id DESC`,
    [kullaniciId]
  );

  return menuler;
}

async function degerlendirmeOlustur(kullaniciId, menuId, puan, yorum) {
  const [sonuc] = await yazmaHavuzu.query(
    `INSERT INTO degerlendirmeler (kullanici_id, menu_id, puan, yorum)
     SELECT kullanici_id, menu_id, ?, ?
     FROM rezervasyonlar
     WHERE kullanici_id = ? AND menu_id = ? AND durum = 'kullanildi'`,
    [puan, yorum, kullaniciId, menuId]
  );

  return sonuc.affectedRows === 1;
}

module.exports = { kullanilmisMenuleriListele, degerlendirmeOlustur };