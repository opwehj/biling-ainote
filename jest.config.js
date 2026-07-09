/**
 * Jest 配置。
 * 使用 ts-jest 转译 TypeScript，复用项目 tsconfig。
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // expo 模块在 node 环境不可用，统一映射到 mock
    '^expo-file-system/legacy$': '<rootDir>/__tests__/mocks/expo-file-system.js',
    '^expo-file-system$': '<rootDir>/__tests__/mocks/expo-file-system.js',
    '^expo-sqlite$': '<rootDir>/__tests__/mocks/expo-sqlite.js',
    '^expo-secure-store$': '<rootDir>/__tests__/mocks/expo-secure-store.js',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          ...require('./tsconfig.json').compilerOptions,
          // 测试环境不需要 jsx 运行时，简化转换
          jsx: 'react',
          module: 'commonjs',
          moduleResolution: 'node',
          isolatedModules: true,
          types: ['jest', 'node'],
        },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!react-native|@react-native|react-navigation|expo|@react-navigation)',
  ],
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'src/services/ai/BaseLLMProvider.ts',
    'src/services/ai/AINoteService.ts',
    'src/services/ai/AsrService.ts',
    'src/services/ai/ProviderFactory.ts',
    'src/utils/validation.ts',
    'src/utils/date.ts',
    'src/store/noteStore.ts',
    'src/services/db/NoteRepository.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  verbose: true,
};
