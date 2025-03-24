module.exports = {
    expose: async (page) => {
      await page.exposeFunction('calculateResult', (rawExpr) => {
        try {
          let expr = rawExpr.trim().replace(/\s+/g, '');
  
          expr = expr.replace(/(\([^\(\)]+\))-(\d+)%/g, (_, group, percent) => `${group} - (${group} * ${percent} / 100)`);
          expr = expr.replace(/(\d+(?:\.\d+)?)-(\d+)%/g, (_, number, percent) => `${number} - (${number} * ${percent} / 100)`);
          expr = expr.replace(/(\d+(?:\.\d+)?)\+(\d+)%/g, (_, number, percent) => `${number} + (${number} * ${percent} / 100)`);
          expr = expr.replace(/(\([^\(\)]+\))\+(\d+)%/g, (_, group, percent) => `${group} + (${group} * ${percent} / 100)`);
  
          const sanitized = expr.replace(/[^-()\d/*+.]/g, '');
          const result = Function('"use strict";return (' + sanitized + ')')();
          return Math.round(result * 100) / 100;
        } catch (err) {
          return 'Erro';
        }
      });
  
      await page.exposeFunction('handleTabCommand', async () => {
        await page.evaluate(async () => {
          const sleep = ms => new Promise(res => setTimeout(res, ms));
          const input = document.querySelector('footer div[contenteditable="true"]');
          if (!input) return;
          const message = input.innerText.trim();
          if (!message) return;
  
          input.textContent = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          await sleep(100);
  
          if (message === '/menu') {
            window.triggerSendMenuImages();
            return;
          }
  
          if (message.startsWith('/cal')) {
            const expr = message.slice(4).trim();
            const result = await window.calculateResult(expr);
            const response = `O valor total do seu pedido será ${result} reais. Qual seria a forma de pagamento?`;
            input.focus();
            document.execCommand('insertText', false, response);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(150);
  
            const send = document.querySelector("span[data-icon='send'], div[data-testid='media-send-button']");
            if (send) send.click();
          }
        });
      });
    }
  };
  