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
  let page = 1;

  if (pageSize) pageSize.value = "20";

  function totalPages(total, size) {
    if (String(size).toLowerCase() === "all") return 1;
    return Math.max(1, Math.ceil(Number(total || 0) / Number(size || 20)));
  }

  async function render() {
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
      render();
    });
  }

  if (pageSize) pageSize.addEventListener("change", () => { page = 1; render(); });
  if (searchInput) searchInput.addEventListener("input", () => { page = 1; render(); });
  render();
})();











