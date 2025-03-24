const fs = require('fs');
const path = require('path');

function loadCommands(config) {
  const commands = [];
  for (const [name, settings] of Object.entries(config)) {
    if (!settings.enabled) continue;
    const commandPath = path.resolve(__dirname, `../commands/${name}.js`);
    if (fs.existsSync(commandPath)) {
      commands.push(require(commandPath));
    } else {
      console.warn(`⚠️ Comando '${name}' ativado, mas arquivo não encontrado.`);
    }
  }
  return commands;
}

module.exports = { loadCommands };

