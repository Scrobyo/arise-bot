const { admin, getCollection } = require('@firebase/client');
const usersCol = getCollection('users');

module.exports = {
  usersCol,
  async register(user) {
    const userData = {
      id: user.id,
      first_name: user.first_name,
      username: user.username || null,
      language_code: user.language_code || 'pt-br',
      is_premium: user.is_premium || false,
      is_bot: user.is_bot || false,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      last_seen: admin.firestore.FieldValue.serverTimestamp(),
    };

    await usersCol.doc(String(user.id)).set(userData);
    return userData;
  },

  async exists(userId) {
    const doc = await usersCol.doc(String(userId)).get();
    return doc.exists;
  }
};