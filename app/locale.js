const path = require('path');
const fs = require('fs');
const app = require('electron').app;

function normalizeLocaleName(locale) {
  if (/^en-/.test(locale)) {
    return 'en';
  }

  return locale;
}

function getLocaleMessages(locale) {
  const onDiskLocale = locale.replace('-', '_');

  const targetFile = path.join(
    __dirname,
    '..',
    '_locales',
    onDiskLocale,
    'messages.json'
  );

  return JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
}

function load() {
  // We always load 'en' because it will serve as our failover in case the primary
  //   language is missing a string.
  const failover = getLocaleMessages('en');

  // Possible locales returned by app.getLocale():
  //   https://github.com/electron/electron/blob/master/docs/api/locales.md
  let localeName = normalizeLocaleName(app.getLocale());
  let messages;

  try {
    messages = getLocaleMessages(localeName);
  } catch (e) {
    console.log('Problem loading messages for locale ', localeName, e.stack);
    console.log('Falling back to en locale');

    localeName = 'en';
    messages = failover;
  }

  return {
    name: localeName,
    messages: messages,
    failover: failover
  };
}

module.exports = {
  load: load
};
