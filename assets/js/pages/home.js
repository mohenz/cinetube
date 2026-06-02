(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();

  const data = await Store.load();
  UI.setDbStatus(Store.getStatus());

  const hero = document.getElementById("hero");
  const sections = document.getElementById("homeSections");
  const searchInput = document.getElementById("searchInput");

  function newestFirst(a, b) {
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  }

  function byClickCount(a, b) {
    return Store.effectiveClickCount(b) - Store.effectiveClickCount(a) || newestFirst(a, b);
  }

  function byRanking(a, b) {
    return Number(b.ranking_score || 0) - Number(a.ranking_score || 0)
      || UI.ratingRank(a) - UI.ratingRank(b)
      || Number(b.recommendation_score || 0) - Number(a.recommendation_score || 0)
      || newestFirst(a, b);
  }

  function render() {
    const term = searchInput ? searchInput.value.trim() : "";
    const movies = data.movies.filter((movie) => UI.matchesSearch(movie, term));
    const mainFeatured = movies.filter((movie) => movie.is_main === true);
    const featured = mainFeatured[0] || movies.slice().sort((a, b) => UI.ratingRank(a) - UI.ratingRank(b))[0] || data.movies[0];
    const latest = movies.slice().sort(newestFirst).slice(0, 8);
    const recommended = movies.slice().sort(byClickCount).slice(0, 8);
    const topRated = movies.slice().sort(byRanking).slice(0, 8);

    if (!featured) {
      document.documentElement.style.setProperty("--hero-image", "linear-gradient(135deg, #1c1b1b, #000)");
      hero.innerHTML = `
        <div class="hero-inner">
          <p class="eyebrow">CineHub Database</p>
          <h1>등록된 영화정보가 없습니다</h1>
          <p>Supabase 연결은 완료되었습니다. 관리자 화면에서 영화정보를 등록하면 홈 화면에 최신등록, 맞춤추천, 평가등급 상위 작품이 표시됩니다.</p>
          <div class="hero-actions">
            <a class="primary-button" href="admin/movies.html"><span class="material-symbols-outlined">add</span>영화 등록</a>
            <a class="ghost-button" href="pages/movies.html"><span class="material-symbols-outlined">grid_view</span>작품 탐색</a>
          </div>
        </div>`;
      sections.innerHTML = [
        UI.movieSection("최신등록 8개", "최근 등록된 영화정보입니다.", []),
        UI.movieSection("맞춤추천 8개", "클릭수가 높은 영화정보입니다.", []),
        UI.movieSection("카테고리별 평가등급 상위 8개", "랭킹 점수와 등급을 함께 반영했습니다.", [])
      ].join("");
      return;
    }

    const heroImage = UI.movieImageUrl(featured, "");
    document.documentElement.style.setProperty(
      "--hero-image",
      heroImage ? `url(${JSON.stringify(heroImage)})` : "linear-gradient(135deg, #1c1b1b, #000)"
    );
    hero.innerHTML = `
      <div class="hero-inner">
        <p class="eyebrow">Featured Movie</p>
        <h1>${UI.escapeHtml(featured.title)}</h1>
        <p>${UI.escapeHtml(featured.description)}</p>
        <div class="hero-actions">
          <a class="primary-button" href="${UI.escapeHtml(featured.video_url || "#")}" target="_blank" rel="noreferrer"><span class="material-symbols-outlined">play_arrow</span>영상 링크</a>
          <a class="ghost-button" href="pages/movies.html"><span class="material-symbols-outlined">grid_view</span>작품 탐색</a>
        </div>
      </div>`;

    sections.innerHTML = [
      UI.movieSection("최신등록 8개", "최근 등록된 영화정보입니다.", latest),
      UI.movieSection("맞춤추천 8개", "클릭수가 높은 영화정보입니다.", recommended),
      UI.movieSection("카테고리별 평가등급 상위 8개", "랭킹 점수와 등급을 함께 반영했습니다.", topRated)
    ].filter(Boolean).join("");
    UI.setupMovieCards(sections);
  }

  if (searchInput) searchInput.addEventListener("input", render);
  render();
})();
