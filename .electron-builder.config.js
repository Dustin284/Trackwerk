/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
export default {
  appId: "com.deinname.trackwerk",
  win: {
    target: ["nsis", "portable"]
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true
  },
  files: [
    "dist/**/*",
    "public/**/*"
  ],
  extraMetadata: {
    main: "public/electron.js"
  }
}; 