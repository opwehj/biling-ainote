/**
 * expo-file-system mock（含 legacy 子路径）。
 * 提供内存式文件系统，供 FileService 测试。
 */
const fsStore = new Map();

const EncodingType = { UTF8: 'utf8', Base64: 'base64' };

const FileSystem = {
  documentDirectory: 'file:///app/docs/',
  cacheDirectory: 'file:///app/cache/',
  EncodingType,
  readAsStringAsync: jest.fn(async (uri, options = {}) => {
    if (options.encoding === EncodingType.Base64) {
      return fsStore.get(`${uri}::base64`) ?? 'BASE64_DATA';
    }
    return fsStore.get(uri) ?? '';
  }),
  writeAsStringAsync: jest.fn(async (uri, content) => {
    fsStore.set(uri, content);
  }),
  deleteAsync: jest.fn(async (uri) => {
    fsStore.delete(uri);
  }),
  getInfoAsync: jest.fn(async (uri) => {
    return { exists: fsStore.has(uri), size: 100, isDirectory: false };
  }),
  makeDirectoryAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async ({ from, to }) => {
    fsStore.set(to, fsStore.get(from) ?? '');
  }),
  moveAsync: jest.fn(async () => {}),
  readDirectoryAsync: jest.fn(async () => []),
  // 测试辅助：重置内存
  __reset: () => fsStore.clear(),
  __set: (key, val) => fsStore.set(key, val),
};

module.exports = FileSystem;
module.exports.default = FileSystem;
module.exports.EncodingType = EncodingType;
