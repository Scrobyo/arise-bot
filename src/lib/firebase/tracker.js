const { admin, getCollection } = require('@firebase/client');
const usersCol = getCollection('users');

class Tracker {
  constructor() {
    this.cache = new Map();
  }

  async #update(userId) {
    try {
      const ref = usersCol.doc(String(userId));
      await ref.set({
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        last_seen: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      this.cache.set(userId, Date.now());
    } catch (err) {
      console.error('Firebase update error:', err);
    }
  }

  async track(userId) {
    if (!userId) return;

    try {
      const now = Date.now();
      const lastUpdate = this.cache.get(userId) || 0;

      if (now - lastUpdate > 60000) {
        await this.#update(userId);
      }
    } catch (err) {
      console.error('Tracking error:', err);
    }
  }
}

module.exports = new Tracker();