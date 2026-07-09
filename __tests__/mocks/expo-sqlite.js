/**
 * expo-sqlite mock。
 * 提供内存式 SQLite 行为，供 Repository 测试。
 * 注：本 mock 仅提供结构兼容，Repository 测试会注入自定义 db 对象。
 */
const SQLiteDatabase = {
  openDatabaseSync: jest.fn(() => ({
    execAsync: jest.fn(async () => {}),
    runAsync: jest.fn(async () => ({ changes: 0, lastInsertRowid: 0 })),
    getFirstAsync: jest.fn(async () => null),
    getAllAsync: jest.fn(async () => []),
    withTransactionAsync: jest.fn(async (fn) => fn()),
    closeAsync: jest.fn(async () => {}),
  })),
  openDatabase: jest.fn(() => ({})),
};

module.exports = SQLiteDatabase;
