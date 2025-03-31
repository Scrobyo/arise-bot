const admin = require('firebase-admin');
const path = require('path');

// Caminho corrigido para serviceAccountKey.json
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://telegram-arise.firebaseio.com'
  });

  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });

  const getCollection = (name) => db.collection(name);

  module.exports = {
    admin,
    db,
    getCollection
  };

} catch (error) {
  console.error('❌ Erro ao carregar Firebase:', error);
  console.log('ℹ️ Verifique se serviceAccountKey.json está em:', serviceAccountPath);
  process.exit(1);
}