(() => {
  const storageKey = "speakos:theme";
  const root = document.documentElement;

  function currentTheme() {
    return root.dataset.theme === "light" ? "light" : "dark";
  }

  function applyTheme(theme, save = true) {
    const next = theme === "light" ? "light" : "dark";
    root.dataset.theme = next;
    if (save) {
      try { localStorage.setItem(storageKey, next); } catch (_) { /* Storage may be unavailable. */ }
    }

    document.querySelectorAll("[data-theme-name]").forEach((label) => {
      label.textContent = next === "dark" ? "Dark" : "Light";
    });
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-label", `Switch to ${next === "dark" ? "light" : "dark"} theme`);
      button.setAttribute("title", `Switch to ${next === "dark" ? "light" : "dark"} theme`);
    });

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = next === "dark" ? "#0a111b" : "#edf5fb";
    window.dispatchEvent(new CustomEvent("speakos:themechange", { detail: { theme: next } }));
  }

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => applyTheme(currentTheme() === "dark" ? "light" : "dark"));
  });

  applyTheme(currentTheme(), false);
})();
