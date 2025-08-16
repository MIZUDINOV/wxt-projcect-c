export default defineBackground(() => {
  browser.commands.onCommand.addListener(async (command) => {
    if (command === "open-search-modal") {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab.id) {
        await browser.tabs.sendMessage(tab.id, { type: "OPEN_MODAL" });
      }
    }
  });

  browser.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "OPEN_SEARCH" && typeof msg.url === "string") {
      browser.tabs.create({ url: msg.url });
    }
  });
});
