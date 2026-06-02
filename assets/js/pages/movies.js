(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();

  const data = await Store.load();
  UI.setDbStatus(Store.getStatus());

  const movieGrid = document.getElementById("movieGrid");
  const movieSummary = document.getElementById("movieSummary");
  const pagination = document.getElementById("pagination");
  const pageSize = document.getElementById("pageSizeSelect");
  const searchInput = document.getElementById("searchInput");
  let page = 1;

  function movieDateValue(movie) {
    const month = String(movie.release_month || "").trim();
    if (/^\d{4}-\d{2}$/.test(month)) return `${month}-01`;
    if (/^\d{4}$/.test(month)) return `${month}-01-01`;
    return movie.created_at || "";
  }

  function latestMovieFirst(a, b) {
    const dateCompare = new Date(movieDateValue(b) || 0) - new Date(movieDateValue(a) || 0);
    if (dateCompare) return dateCompare;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  }

  function render() {
    const term = searchInput ? searchInput.value.trim() : "";
    const movies = data.movies
      .slice()
      .filter((movie) => UI.matchesSearch(movie, term))
      .sort(latestMovieFirst);

    movieSummary.innerHTML = `
      <span class="summary-pill"><strong>${UI.escapeHtml(movies.length)}</strong> 영화</span>
      <span class="summary-pill">최신영화 순</span>`;

    const result = UI.paginate(movies, page, pageSize.value);
    page = result.page || 1;
    movieGrid.innerHTML = result.items.length ? result.items.map(UI.movieCard).join("") : `<div class="empty">조건에 맞는 영화정보가 없습니다.</div>`;
    UI.setupMovieCards(movieGrid);
    UI.renderPagination(pagination, result.totalPages, page, (nextPage) => {
      page = nextPage;
      render();
    });
  }

  if (pageSize) pageSize.addEventListener("change", () => { page = 1; render(); });
  if (searchInput) searchInput.addEventListener("input", () => { page = 1; render(); });
  render();
})();
