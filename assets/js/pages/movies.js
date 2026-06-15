(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();

  await Store.list("movies", { page: 1, pageSize: 20, order: "release_month.desc" });
  UI.setDbStatus(Store.getStatus());

  const movieGrid = document.getElementById("movieGrid");
  const movieSummary = document.getElementById("movieSummary");
  const pagination = document.getElementById("pagination");
  const pageSize = document.getElementById("pageSizeSelect");
  const searchInput = document.getElementById("searchInput");
  const contentView = document.querySelector(".content-view");
  let page = 1;

  if (pageSize) pageSize.value = "20";

  function totalPages(total, size) {
    if (String(size).toLowerCase() === "all") return 1;
    return Math.max(1, Math.ceil(Number(total || 0) / Number(size || 20)));
  }

  function focusListTop() {
    requestAnimationFrame(() => {
      const focusTarget = movieGrid || contentView;
      const scrollTarget = contentView || focusTarget;
      if (!focusTarget || !scrollTarget) return;
      focusTarget.setAttribute("tabindex", "-1");
      focusTarget.focus({ preventScroll: true });
      const top = scrollTarget.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
    });
  }

  async function render(options = {}) {
    const term = searchInput ? searchInput.value.trim() : "";
    const result = await Store.list("movies", {
      page,
      pageSize: pageSize.value,
      search: term,
      order: "release_month.desc"
    });
    const movies = result.items || [];

    movieSummary.innerHTML = `
      <span class="summary-pill"><strong>${UI.escapeHtml(result.total)}</strong> 영화</span>
      <span class="summary-pill">최신영화 순</span>`;

    page = result.page || 1;
    movieGrid.innerHTML = movies.length ? movies.map(UI.movieCard).join("") : `<div class="empty">조건에 맞는 영화정보가 없습니다.</div>`;
    UI.setupMovieCards(movieGrid);
    UI.renderPagination(pagination, totalPages(result.total, pageSize.value), page, (nextPage) => {
      page = nextPage;
      render({ focusTop: true });
    });

    if (options.focusTop) focusListTop();
  }

  if (pageSize) pageSize.addEventListener("change", () => { page = 1; render(); });
  if (searchInput) searchInput.addEventListener("input", () => { page = 1; render(); });
  render();
})();











