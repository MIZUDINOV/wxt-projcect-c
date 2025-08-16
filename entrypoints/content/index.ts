// entrypoints/search-ui.content/index.ts
// import { defineContentScript, createShadowRootUi } from "#imports";
import { browser } from "wxt/browser";
import "./style.css";
import googleLogo from "@/assets/google.svg";
import youtubeLogo from "@/assets/youtube.svg";
import redditLogo from "@/assets/reddit.svg";
import wikipediaLogo from "@/assets/wikipedia.svg";
import xLogo from "@/assets/x.svg";

// ---- 3.A Провайдеры поиска (минимальный набор) ----
type Provider = {
  id: "google" | "youtube" | "reddit" | "twitter/X" | "wikipedia";
  iconUrl: string;
  buildUrl: (q: string) => string;
};

const PROVIDERS: Provider[] = [
  {
    id: "google",
    iconUrl: googleLogo,
    buildUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "youtube",
    iconUrl: youtubeLogo,
    buildUrl: (q) =>
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  },
  {
    id: "reddit",
    iconUrl: redditLogo,
    buildUrl: (q) =>
      `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`,
  },
  {
    id: "twitter/X",
    iconUrl: xLogo,
    buildUrl: (q) => `https://x.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "wikipedia",
    iconUrl: wikipediaLogo,
    buildUrl: (q) =>
      `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(
        q
      )}`,
  },
  // {
  //   id: "stackoverflow",
  //   iconUrl: stackoverflowLogo,
  //   buildUrl: (q) =>
  //     `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
  // },
  // {
  //   id: "duck",
  //   iconUrl: duckLogo,
  //   buildUrl: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  // },
];

// ---- 3.B Вспомогательное ----
const cleanQuery = (s: string) =>
  s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[“"']|[”"']$/g, "");

const openSearch = (url: string) =>
  browser.runtime.sendMessage({ type: "OPEN_SEARCH", url });

// Получаем координаты конца выделения
const getSelectionEndRect = (): DOMRect | null => {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0).cloneRange();
  // Сужаем до конца: ставим начало=конец, чтобы rect был к концу выделения
  range.collapse(false);
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) return null;
  return rect;
};

// ---- 3.C Основной контент-скрипт ----
export default defineContentScript({
  matches: ["<all_urls>"],
  // UI-CSS будет подхвачен автоматически при создании UI
  cssInjectionMode: "ui",

  async main(ctx) {
    // ---- C1. Попап у выделения ----
    const selectionUi = await createShadowRootUi(ctx, {
      name: "selection-search-popup",
      position: "overlay",
      anchor: "body",
      isolateEvents: true,
      onMount(container) {
        container.classList.add("sui-root"); // стили в style.css

        const box = document.createElement("div");
        box.className = "sui-popover";

        const buttons = document.createElement("div");
        buttons.className = "sui-btn-row";

        PROVIDERS.forEach((p) => {
          const btn = document.createElement("button");
          btn.className = "sui-btn";
          btn.innerHTML = `<img src="${p.iconUrl}" height="20px" />`;
          btn.title = `Search in ${p.id}`;
          btn.addEventListener("click", () => {
            const sel = window.getSelection();
            const text = sel ? sel.toString() : "";
            const q = cleanQuery(text);
            if (q) openSearch(p.buildUrl(q));
            hideSelectionPopup();
          });
          buttons.append(btn);
        });

        box.append(buttons);
        container.append(box);
      },
    });

    let selectionVisible = false;

    const showSelectionPopup = (rect: DOMRect) => {
      selectionUi.mount();
      selectionVisible = true;
      // позиционирование рядом с концом выделения
      const root = selectionUi.uiContainer;
      if (!root) return;
      const pop = root.querySelector<HTMLElement>(".sui-popover");
      if (!pop) return;

      const margin = 8;
      const top = Math.max(8, window.scrollY + rect.bottom + margin);
      const left = Math.max(
        8,
        window.scrollX + rect.right - pop.offsetWidth / 2
      );

      pop.style.top = `${top}px`;
      pop.style.left = `${left}px`;
    };

    const hideSelectionPopup = () => {
      if (selectionVisible) {
        selectionUi.remove();
        selectionVisible = false;
      }
    };

    // Показываем попап при релизе мыши или после клавиатурной правки выделения
    const onSelectionCheck = () => {
      const rect = getSelectionEndRect();
      const sel = window.getSelection();
      const text = sel ? sel.toString() : "";
      if (rect && text.trim()) showSelectionPopup(rect);
      else hideSelectionPopup();
    };

    document.addEventListener("mouseup", () => setTimeout(onSelectionCheck, 0));
    document.addEventListener("keyup", (e) => {
      // навигация по тексту/выделение
      if (
        ["Shift", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
          e.key
        )
      ) {
        setTimeout(onSelectionCheck, 0);
      }
      // Esc = скрыть
      if (e.key === "Escape") hideSelectionPopup();
    });
    window.addEventListener("scroll", hideSelectionPopup, { passive: true });

    const openModal = () => modalUi.mount();
    const closeModal = () => modalUi.remove();
    let opened = false;

    // ---- C2. Модалка по хоткею ----
    const modalUi = await createShadowRootUi(ctx, {
      name: "search-modal",
      position: "modal", // центр экрана, с оверлеем
      isolateEvents: true,
      onMount(container) {
        container.classList.add("sui-root");

        const overlay = document.createElement("div");
        overlay.className = "sui-overlay";

        const modal = document.createElement("div");
        modal.className = "sui-modal";

        const header = document.createElement("div");
        header.className = "sui-header";

        const title = document.createElement("h2");
        title.className = "sui-title";
        title.textContent = "Search Reactively";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "sui-input";
        input.placeholder = "Type your query...";

        const row = document.createElement("div");
        row.className = "sui-btn-row";

        PROVIDERS.forEach((p) => {
          const b = document.createElement("button");
          b.className = "sui-btn";
          // b.textContent = p.label;
          b.title = `Search in ${p.id}`;
          b.innerHTML = `
            <img src="${p.iconUrl}" height="24px" />`;
          b.addEventListener("click", () => {
            const q = cleanQuery(input.value);
            if (q) openSearch(p.buildUrl(q));
            closeModal();
            opened = false;
          });
          row.append(b);
        });

        header.append(title);
        modal.append(header);
        modal.append(input, row);
        overlay.append(modal);
        container.append(overlay);

        // UX
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) {
            closeModal();
            opened = false;
          }
        });
        input.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            closeModal();
            opened = false;
          }
          if (e.key === "Enter") {
            // по Enter default -> Google
            const q = cleanQuery(input.value);
            if (q) openSearch(PROVIDERS[0].buildUrl(q));
            closeModal();
            opened = false;
          }
        });

        // Фокус при показе
        setTimeout(() => input.focus(), 0);
      },
    });

    // Сообщение от background по хоткею
    browser.runtime.onMessage.addListener((msg) => {
      if (msg?.type === "OPEN_MODAL" && !opened) {
        openModal();
        opened = true;
      } else {
        closeModal();
        opened = false;
      }
    });
  },
});
