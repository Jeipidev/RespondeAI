const puppeteer = require('puppeteer');
const path = require('path');

async function setupBrowser() {
  const userDataDir = path.resolve(__dirname, '../chrome-user-data');
  const browser = await puppeteer.launch({ headless: false, userDataDir });
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36');
  await page.setRequestInterception(true);
  page.on('request', request => {
    request.continue({ headers: { ...request.headers(), 'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8' } });
  });

  return { browser, page };
}

module.exports = { setupBrowser };
