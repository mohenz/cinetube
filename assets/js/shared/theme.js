(() => {
  const key = "cinetube_theme";
  let theme = "dark";
  let button;
  try {
    if (localStorage.getItem(key) === "light") theme = "light";
  } catch (_) {}

  function apply() {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (!button) return;
    const label = theme === "dark" ? "라이트 테마로 변경" : "다크 테마로 변경";
    button.textContent = theme === "dark" ? "☀" : "☾";
    button.title = label;
    button.setAttribute("aria-label", label);
  }

  apply();
  document.addEventListener("DOMContentLoaded", () => {
    button = document.createElement("button");
    button.type = "button";
    button.id = "siteThemeToggle";
    button.className = "site-theme-toggle";
    apply();
    button.addEventListener("click", () => {
      theme = theme === "dark" ? "light" : "dark";
      apply();
      try { localStorage.setItem(key, theme); } catch (_) {}
    });
    document.body.appendChild(button);
  });

  window.addEventListener("storage", event => {
    if (event.key !== key && event.key !== null) return;
    theme = event.newValue === "light" ? "light" : "dark";
    apply();
  });
})();
