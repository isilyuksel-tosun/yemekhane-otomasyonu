const { okumaHavuzu, yazmaHavuzu } = require('./db');
const { menuGuncellemesiniUygula } = require('./menuOnbellegi');

async function yonetimVerileriniGetir() {
  const [[menuler], [yemekhaneler], [ogunler], [yemekler]] = await Promise.all([
    okumaHavuzu.query(`
      SELECT m.id AS menu_id,
             DATE_FORMAT(m.tarih, '%Y-%m-%d') AS tarih,
             m.yemekhane_id, d.yemekhane,
             m.ogun_id, d.ogun,
             m.ogrenci_fiyati, m.personel_fiyati,
             d.kapasite, d.rezerve, d.bos_yer, d.doluluk_yuzde,
             p.oy_sayisi, p.ortalama_puan,
             (
               SELECT GROUP_CONCAT(my.yemek_id ORDER BY my.yemek_id)
               FROM menu_yemekleri my
               WHERE my.menu_id = m.id
             ) AS yemek_idleri
      FROM menuler m
      JOIN v_menu_doluluk d ON d.menu_id = m.id
      JOIN v_menu_puan p ON p.menu_id = m.id
      ORDER BY m.tarih DESC, m.yemekhane_id, d.rezervasyon_son
    `),
    okumaHavuzu.query('SELECT id, ad FROM yemekhaneler ORDER BY id'),
    okumaHavuzu.query('SELECT id, ad FROM ogunler ORDER BY sira'),
    okumaHavuzu.query(`
      SELECT y.id, y.ad, k.ad AS kategori
      FROM yemekler y
      JOIN yemek_kategorileri k ON k.id = y.kategori_id
      ORDER BY k.sira, y.ad
    `),
  ]);

  return {
    menuler: menuler.map(menu => ({
      ...menu,
      yemek_idleri: menu.yemek_idleri ? menu.yemek_idleri.split(',').map(Number) : [],
    })),
    yemekhaneler,
    ogunler,
    yemekler,
  };
}

async function menuIsleminiKaydet(menuId, veri)  {
  const baglanti = await yazmaHavuzu.getConnection();

  try {
    await baglanti.beginTransaction();
    let kayitId = menuId;

    if (menuId === null) {
      const [sonuc] = await baglanti.query(
        `INSERT INTO menuler
         (yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati)
         VALUES (?, ?, ?, ?, ?)`,
        [veri.yemekhane_id, veri.tarih, veri.ogun_id,
          veri.ogrenci_fiyati, veri.personel_fiyati]
      );
      kayitId = sonuc.insertId;
    } else {
      const [satirlar] = await baglanti.query(
        'SELECT id FROM menuler WHERE id = ? FOR UPDATE',
        [menuId]
      );

      if (satirlar.length === 0) {
        await baglanti.rollback();
        return null;
      }

      await baglanti.query(
        `UPDATE menuler
         SET ogrenci_fiyati = ?, personel_fiyati = ?, guncelleme = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [veri.ogrenci_fiyati, veri.personel_fiyati, menuId]
      );

      await baglanti.query('DELETE FROM menu_yemekleri WHERE menu_id = ?', [menuId]);
    }

    const yemekSatirlari = veri.yemek_idleri.map(yemekId => [kayitId, yemekId]);
    await baglanti.query(
      'INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?',
      [yemekSatirlari]
    );

    await baglanti.commit();
    return kayitId;
  } catch (hata) {
    await baglanti.rollback();
    throw hata;
  } finally {
    baglanti.release();
  }
}

async function menuKaydet(menuId, veri) {
  let menu = veri;

  if (menuId !== null) {
    const [[mevcutMenu]] = await yazmaHavuzu.query(
      `SELECT yemekhane_id,
              DATE_FORMAT(tarih, '%Y-%m-%d') AS tarih,
              ogun_id
       FROM menuler
       WHERE id = ?`,
      [menuId]
    );

    if (!mevcutMenu) return null;
    menu = mevcutMenu;
  }

  return menuGuncellemesiniUygula(
    menu,
    () => menuIsleminiKaydet(menuId, veri)
  );
}

module.exports = { yonetimVerileriniGetir, menuKaydet };