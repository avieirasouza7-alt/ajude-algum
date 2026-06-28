import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.ajudealguemonline.admin",
  appName: "Ajude Admin",
  webDir: "www",
  server: {
    url: "https://ajudealguemonline.com.br/admin/entrar",
    androidScheme: "https",
    allowNavigation: ["ajudealguemonline.com.br", "*.ajudealguemonline.com.br"],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#fef9f3",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#15803d",
      showSpinner: true,
      spinnerColor: "#ffffff",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#15803d",
    },
  },
};

export default config;
