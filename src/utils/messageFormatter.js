const escapeHTML = (text) => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };
  
  const cleanMessage = (text) => {
    return text
      .replace(/^[ \t]+/gm, '')  
      .trim();
  };
  
  const formatWithHTML = (strings, ...values) => {
    let result = strings[0];
    values.forEach((value, i) => {
      result += escapeHTML(value) + strings[i + 1];
    });
    return cleanMessage(result);
  };
  
  module.exports = {
    cleanMessage,
    escapeHTML,
    html: formatWithHTML,
    // Versão simplificada para respostas rápidas
    reply: (text, vars = {}) => {
      let formatted = text;
      Object.entries(vars).forEach(([key, value]) => {
        formatted = formatted.replace(new RegExp(`\\$${key}`, 'g'), escapeHTML(value));
      });
      return cleanMessage(formatted);
    }
  };