import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(root, "..");
const androidDir = join(mobileRoot, "android");
const installerDir = join(mobileRoot, "installer");
const apkSource = join(
  androidDir,
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk",
);
const apkDest = join(installerDir, "AjudeAdmin.apk");

const sdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  join(process.env.LOCALAPPDATA || "", "Android", "Sdk");

const gradleCandidates = [
  "C:\\Gradle\\gradle-8.7\\bin\\gradle.bat",
  "C:\\Gradle\\gradle-8.3\\bin\\gradle.bat",
  join(process.env.GRADLE_HOME || "", "bin", process.platform === "win32" ? "gradle.bat" : "gradle"),
  join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew"),
].filter(Boolean);

const gradle =
  gradleCandidates.find((candidate) => existsSync(candidate)) ||
  join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");

console.log("Gerando APK Android...");
console.log("Gradle:", gradle);

const build = spawnSync(gradle, ["assembleDebug", "--no-daemon"], {
  cwd: androidDir,
  stdio: "inherit",
  env: {
    ...process.env,
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
    JAVA_TOOL_OPTIONS: "-Djavax.net.ssl.trustStoreType=Windows-ROOT",
  },
  shell: process.platform === "win32",
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

if (!existsSync(apkSource)) {
  console.error("APK não encontrado:", apkSource);
  process.exit(1);
}

mkdirSync(installerDir, { recursive: true });
cpSync(apkSource, apkDest);
console.log("\nAPK pronto:");
console.log(apkDest);
