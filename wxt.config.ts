import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  // Всё, что нельзя или неудобно описать в entrypoints, указываем тут
  manifest: {
    name: "Reactive search!",
    description:
      "Search for selected text and a search modal window via hotkey (Ctrl+Shift+F).",
    version: "0.0.1",

    // Нужны для: tabs.create(), tabs.query(), отправка сообщений активной вкладке
    permissions: ["tabs", "activeTab"],

    // Горячая клавиша (можно поменять в настройках браузера)
    commands: {
      "open-search-modal": {
        suggested_key: {
          default: "Ctrl+Shift+F",
          mac: "Command+Shift+F",
        },
        description: "Open the search popup",
      },
    },
  },
});
