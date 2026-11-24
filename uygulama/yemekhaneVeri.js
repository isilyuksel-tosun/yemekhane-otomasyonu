const { okumaHavuzu } = require('./db');

async function yemekhaneleriListele() {
  const [satirlar] = await okumaHavuzu.query(
    'SELECT id, ad, konum, kapasite FROM yemekhaneler ORDER BY id'
  );
  return satirlar;
}

module.exports = { yemekhaneleriListele };