/**
 * @file app.config.js
 * @description Expo 配置（bare workflow）。声明 iOS/Android 所需权限与资源。
 *              权限：相机、麦克风、相册、文件访问。
 */

module.exports = {
  expo: {
    name: '笔灵 BiLing',
    slug: 'biling-ainote',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/icon.png',
    scheme: 'biling',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#5B8DEF',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.biling.ainote',
      infoPlist: {
        NSCameraUsageDescription: '笔灵需要使用相机来拍摄照片作为笔记素材。',
        NSMicrophoneUsageDescription: '笔灵需要使用麦克风来录制音频作为笔记素材。',
        NSPhotoLibraryUsageDescription: '笔灵需要访问相册来选择图片作为笔记素材。',
        NSPhotoLibraryAddUsageDescription: '笔灵需要保存生成的笔记图片到相册。',
        NSDocumentsFolderUsageDescription: '笔灵需要访问文件来选择音频文件作为素材。',
      },
    },
    android: {
      package: 'com.biling.ainote',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#5B8DEF',
      },
      permissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_AUDIO',
        'android.permission.READ_MEDIA_IMAGES',
      ],
    },
    plugins: [
      [
        'expo-image-picker',
        {
          photosPermission: '笔灵需要访问相册来选择图片作为笔记素材。',
          cameraPermission: '笔灵需要使用相机来拍摄照片作为笔记素材。',
        },
      ],
      [
        'expo-audio',
        {
          microphonePermission: '笔灵需要使用麦克风来录制音频作为笔记素材。',
        },
      ],
    ],
    experiments: {
      tsconfigPaths: false,
    },
  },
};
