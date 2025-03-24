const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const commandsPath = path.join(__dirname, 'commands');
const configPath = path.join(__dirname, '..', 'config', 'commands.json');

(async () => {
  const userDataDir = path.resolve(__dirname, '..', 'chrome-user-data');
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir,
    defaultViewport: null,
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36'
  );

  await page.setRequestInterception(true);
  page.on('request', req => {
    req.continue({
      headers: {
        ...req.headers(),
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8'
      }
    });
  });

  await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2' });
  console.log('📱 Faça login no WhatsApp para ativar o bot...');

  await page.waitForSelector('footer div[contenteditable="true"]', { timeout: 0 });
  console.log('✅ RespodeAI conectado ao WhatsApp');

  // Carrega a config
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath)) : {};

  // Carrega comandos simples e avançados
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  const simpleCommands = [];

  for (const file of commandFiles) {
    const name = file.replace('.js', '');
    const filePath = path.join(commandsPath, file);
    const mod = require(filePath);

    if (mod?.command && mod?.response && config[name]?.enabled) {
      simpleCommands.push(mod);
      console.log(`✅ Comando simples carregado: ${mod.command}`);
    } else if (mod && typeof mod.expose === 'function' && config[name]?.enabled) {
      await mod.expose(page);
      console.log(`✅ Comando avançado ativado: /${name}`);
    } else {
      console.log(`⚠️ Ignorado: ${name}.js (sem estrutura válida ou desativado)`);
    }
  }

  // DEBUG: Lista de comandos simples carregados
  console.log('📦 Lista de comandos simples carregados:', simpleCommands.map(c => c.command));

  // Expor função para comandos simples
  try {
    const commandMap = {};
    simpleCommands.forEach(cmd => {
      commandMap[cmd.command] = cmd.response;
    });
    
    await page.exposeFunction('handleSimpleCommand', async () => {
      await page.evaluate((commands) => {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        (async () => {
          const input = document.querySelector('footer div[contenteditable="true"]');
          if (!input) {
            console.log('❌ Nenhum input encontrado no footer');
            return;
          }
          const msg = input.innerText.trim();
          console.log('⌨️ Mensagem digitada:', msg);
          if (!msg) {
            console.log('❌ Mensagem vazia');
            return;
          }
          const response = commands[msg];
          if (!response) {
            console.log('❓ Comando não encontrado:', msg);
            console.log('📜 Comandos disponíveis:', Object.keys(commands));
            return;
          }
          console.log('✅ Comando simples encontrado:', msg);
          input.focus();
          input.textContent = response;
          input.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            data: response,
            inputType: 'insertText',
            dataTransfer: new DataTransfer()
          }));
          await sleep(300); // ⚠️ Espera a renderização do botão
          const sendBtn = document.querySelector("span[data-icon='send'], div[aria-label='Enviar']");
          if (sendBtn) {
            sendBtn.click();
            console.log('📨 Mensagem enviada');
          } else {
            console.log('⚠️ Botão de envio não encontrado');
          }
        })();
      }, commandMap);
    });
    console.log('✅ handleSimpleCommand registrada para comandos simples');
  } catch (e) {
    console.log('⚠️ handleSimpleCommand já existia. Ignorando...');
  }

  // Nota: comandos avançados devem expor sua função usando window.handleTabCommand dentro do seu módulo.
  // Se um comando avançado foi carregado, ele deve ter registrado window.handleTabCommand.

  // Listener para disparar os comandos com a tecla Tab
  await page.evaluate(() => {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const input = document.querySelector('footer div[contenteditable="true"]');
        if (!input) {
          console.log('❌ Nenhum input encontrado no footer');
          return;
        }
        const msg = input.innerText.trim();
        // Se a mensagem iniciar com '/', assumimos que é um comando avançado
        if (typeof window.handleSimpleCommand === 'function') {
          console.log('🚀 Executando window.handleSimpleCommand() para comando simples');
          window.handleSimpleCommand();
        } else if (typeof window.handleTabCommand === 'function') {
          console.log('🚀 Executando window.handleTabCommand() para comando avançado');
          window.handleTabCommand();
        } else {
          console.log('⚠️ Nenhum comando encontrado para TAB');
        }        
      }
    });
  });

})();
