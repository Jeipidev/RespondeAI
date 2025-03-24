const fs = require('fs');
const path = require('path');

module.exports = {
  expose: async (page) => {
    const attachMenuImages = async () => {
      try {
        const menuDir = path.resolve(__dirname, '../../menu');
        if (!fs.existsSync(menuDir))
          throw new Error(`❌ Pasta 'menu' não encontrada em ${menuDir}`);

        const files = fs.readdirSync(menuDir);
        const imagePaths = files
          .filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f))
          .map(f => path.resolve(menuDir, f));
        if (imagePaths.length === 0)
          throw new Error('❌ Nenhuma imagem encontrada em "menu"');

        console.log('📎 Abrindo menu de anexo...');
        const clipBtn = await page.waitForSelector('span[data-icon="plus"]', { timeout: 5000 });
        await clipBtn.click();

        const photoInput = await page.waitForSelector('input[accept^="image"]', { timeout: 5000 });
        await photoInput.uploadFile(...imagePaths);


        console.log('✅ Imagens anexadas com sucesso! ');
      } catch (err) {
        console.error('🔥 ERRO AO ANEXAR IMAGENS:', err.message);
      }
    };

    await page.exposeFunction('triggerSendMenuImages', attachMenuImages);
  }
};
