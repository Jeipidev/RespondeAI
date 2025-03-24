const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const userDataDir = path.resolve(__dirname, 'chrome-user-data');
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: userDataDir
  });
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36'
  );

  await page.setRequestInterception(true);
  page.on('request', request => {
    request.continue({ headers: { ...request.headers(), 'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8' } });
  });

  await page.exposeFunction('calculateResult', (rawExpr) => {
    try {
      let expr = rawExpr.trim();
  

      expr = expr.replace(/\s+/g, '');
  
 
      expr = expr.replace(/(\([^\(\)]+\))-(\d+)%/g, (_, group, percent) => {
        return `${group} - (${group} * ${percent} / 100)`;
      });
  
     
      expr = expr.replace(/(\d+(?:\.\d+)?)-(\d+)%/g, (_, number, percent) => {
        return `${number} - (${number} * ${percent} / 100)`;
      });
  
  
      expr = expr.replace(/(\d+(?:\.\d+)?)\+(\d+)%/g, (_, number, percent) => {
        return `${number} + (${number} * ${percent} / 100)`;
      });
  
      
      expr = expr.replace(/(\([^\(\)]+\))\+(\d+)%/g, (_, group, percent) => {
        return `${group} + (${group} * ${percent} / 100)`;
      });
  
      
      const sanitized = expr.replace(/[^-()\d/*+.]/g, '');
  
      const result = Function('"use strict";return (' + sanitized + ')')();
      return Math.round(result * 100) / 100;
    } catch (err) {
      return 'Erro';
    }
  });
  
  

  const sendMenuImages = async () => {
    try {
      const menuDir = path.resolve(__dirname, 'menu');
      if (!fs.existsSync(menuDir)) throw new Error(`❌ Pasta "menu" não encontrada em ${menuDir}`);
  
      const files = fs.readdirSync(menuDir);
      const imagePaths = files
        .filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f))
        .map(f => path.resolve(menuDir, f));
  
      if (imagePaths.length === 0) throw new Error("❌ Nenhuma imagem encontrada em 'menu'");
  
      console.log("📎 Abrindo menu de anexo...");
  
      const clipBtn = await page.waitForSelector('span[data-icon="plus"]', { timeout: 5000 });
      await clipBtn.click();
  
      const photoInput = await page.waitForSelector('input[accept^="image"]', { timeout: 5000 });
      await photoInput.uploadFile(...imagePaths);
  
      // Espera o campo de mensagem reaparecer após upload
      const input = await page.waitForSelector('div[contenteditable="true"]:not([data-tab="6"])', { timeout: 15000 });
  
      const mensagem = '📜 Aqui está o nosso cardápio, sinta-se à vontade para escolher o que você mais gostar!';
      await input.evaluate((el, msg) => {
        el.innerHTML = '';
        el.blur();
        el.focus();
        el.dispatchEvent(new Event('input', { bubbles: true }));
        document.execCommand('insertText', false, msg);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, mensagem);
      
  
      const sendBtn = await page.waitForSelector('span[data-icon="send"]', { timeout: 5000 });
      await sendBtn.click();
  
      console.log("✅ Imagens + mensagem enviadas com sucesso!");
    } catch (err) {
      console.error("🔥 ERRO NO ENVIO DO MENU:", err.message);
    }
  };
  
  
  
  
  
  await page.exposeFunction('triggerSendMenuImages', sendMenuImages);

  await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2' });
  console.log("📱 Faça login no WhatsApp e pressione ENTER para continuar...");
  await new Promise(resolve => {
    process.stdin.resume();
    process.stdin.on('data', () => resolve());
  });

  await page.waitForSelector('footer div[contenteditable="true"]', { timeout: 60000 });
  console.log('✅ Bot ativado no WhatsApp!');

  await page.exposeFunction('handleTabCommand', async () => {
    await page.evaluate(async () => {
      const sleep = (ms) => new Promise(res => setTimeout(res, ms));
  
      const input = document.querySelector('footer div[contenteditable="true"]');
      if (!input) return;
  
      const message = input.innerText.trim();
      if (!message) return;
  
      // 1. Deleta a seleção feita manualmente
      input.textContent = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(100);
  
      // 2. Executa comandos
      if (message === '/menu') {
        window.triggerSendMenuImages();
        return;
      }
  
      if (message.startsWith('/cal')) {
        const expr = message.slice(4).trim();
        const result = await window.calculateResult(expr);
        const response = `O valor total do seu pedido será ${result} reais. Qual seria a forma de pagamento?`;
  
        // Insere resposta no input agora limpo
        input.focus();
        document.execCommand('insertText', false, response);
        input.dispatchEvent(new Event('input', { bubbles: true }));
  
        await sleep(150);
  
        const send = document.querySelector("span[data-icon='send'], div[data-testid='media-send-button']");
        if (send) send.click();
      }
    });
  });
  
  
  
  
  
  await page.evaluate(() => {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        window.handleTabCommand();
      }
    });
  });
})();
