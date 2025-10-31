import {
  defineConfig,
  createAppleSplashScreens,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

export default defineConfig({
  headLinkOptions: {
    preset: "2023",
  },
  preset: {
    ...minimal2023Preset,
    appleSplashScreens: createAppleSplashScreens(undefined, ["iPhone 12 mini"]),
  },
  images: ["public/logo.svg"],
});
