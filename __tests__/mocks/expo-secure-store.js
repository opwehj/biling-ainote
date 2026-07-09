/**
 * expo-secure-store mock。
 * 提供内存式 key-value，模拟 Keychain / EncryptedSharedPreferences。
 */
const store = new Map();

const SecureStore = {
  getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
  setItemAsync: jest.fn(async (key, value) => {
    store.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key) => {
    store.delete(key);
  }),
  getItem: jest.fn((key) => (store.has(key) ? store.get(key) : null)),
  setItem: jest.fn((key, value) => {
    store.set(key, value);
  }),
  deleteItem: jest.fn((key) => {
    store.delete(key);
  }),
  __reset: () => store.clear(),
};

module.exports = SecureStore;
