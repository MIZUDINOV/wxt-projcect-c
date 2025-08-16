import "./style.css";

const hotKeys = (await browser.commands.getAll())[0].shortcut;
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <p>Press ${hotKeys} Ctrl+Shift+F to open the search popup</p>
  </div>
`;
