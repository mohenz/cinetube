(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();

  const data = await Store.load();
  UI.setDbStatus(Store.getStatus());

  const stats = document.getElementById("adminStats");
  if (!stats) return;

  const visibleCategories = data.categories.filter((item) => item.is_visible !== false).length;
  const topGrade = data.movies.filter((movie) => movie.rating_grade === "A+" || movie.rating_grade === "A").length;

  stats.innerHTML = [
    ["영화정보", `${data.movies.length}개`, "movie"],
    ["전시 카테고리", `${visibleCategories}개`, "category"],
    ["주연배우", `${data.actors.length}명`, "person"],
    ["상위등급 작품", `${topGrade}개`, "grade"]
  ].map(([label, value, icon]) => `
    <article class="stat-card">
      <span class="material-symbols-outlined">${icon}</span>
      <strong>${UI.escapeHtml(value)}</strong>
      <small>${UI.escapeHtml(label)}</small>
    </article>
  `).join("");
})();
