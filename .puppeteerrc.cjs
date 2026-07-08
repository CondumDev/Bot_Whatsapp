const {join} = require('path');

module.exports = {
  // Obliga a Puppeteer a descargar Chrome dentro de la carpeta de tu proyecto
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
