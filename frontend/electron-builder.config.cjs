module.exports = {
  appId: 'com.meru.app',
  productName: 'Meru',
  directories: {
    output: 'dist-electron',
    buildResources: 'assets'
  },
  files: [
    'dist/**/*',
    'electron/**/*'
  ],
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ]
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  }
}
