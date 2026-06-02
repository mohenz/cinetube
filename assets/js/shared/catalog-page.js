(function () {
  async function init(kind) {
    const UI = window.CineTubeUI;
    const Store = window.CineTubeStore;
    UI.setupChrome();

    const data = await Store.load();
    UI.setDbStatus(Store.getStatus());

    const filterWrap = document.getElementById("entityFilters");
    const profile = document.getElementById("entityProfile");
    const grid = document.getElementById("catalogGrid");
    const pagination = document.getElementById("pagination");
    const pageSize = document.getElementById("pageSizeSelect");
    const searchInput = document.getElementById("searchInput");
    let page = 1;
    let selected = getEntities()[0]?.key || "all";

    function getEntities() {
      if (kind === "actors") {
        return data.actors.map((actor) => ({ key: String(actor.id), label: actor.name, raw: actor }));
      }
      if (kind === "categories") {
        return data.categories
          .filter((category) => category.is_visible !== false)
          .map((category) => ({ key: category.category_code, label: category.name, raw: category }));
      }
      return data.ratings.map((rating) => ({ key: rating.grade, label: rating.grade, raw: rating }));
    }

    function moviesBySelection() {
      const term = searchInput ? searchInput.value.trim() : "";
      return data.movies.filter((movie) => {
        if (kind === "actors" && !(movie.actor_ids || [movie.actor_id]).some((id) => String(id) === selected)) return false;
        if (kind === "categories" && movie.category_code !== selected) return false;
        if (kind === "ratings" && movie.rating_grade !== selected) return false;
        return UI.matchesSearch(movie, term);
      });
    }

    function renderFilters() {
      filterWrap.innerHTML = getEntities().map((entity) => `
        <button class="pill ${entity.key === selected ? "active" : ""}" type="button" data-key="${UI.escapeHtml(entity.key)}">${UI.escapeHtml(entity.label)}</button>
      `).join("");
      filterWrap.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => {
          selected = button.dataset.key;
          page = 1;
          render();
        });
      });
    }

    function renderProfile(movies) {
      const entity = getEntities().find((item) => item.key === selected);
      if (!entity) {
        profile.innerHTML = "";
        return;
      }

      if (kind === "actors") {
        const actor = entity.raw;
        profile.innerHTML = `
          <article class="profile-panel">
            <img src="${UI.escapeHtml(actor.representative_image_url)}" alt="${UI.escapeHtml(actor.name)} 대표이미지">
            <div>
              <p class="eyebrow">Actor Profile</p>
              <h2>${UI.escapeHtml(actor.name)}</h2>
              <div class="detail-list">
                <div><span>나이</span><strong>${UI.escapeHtml(actor.age)}세</strong></div>
                <div><span>신장</span><strong>${UI.escapeHtml(actor.height_cm)}cm</strong></div>
                <div><span>신체사이즈</span><strong>${UI.escapeHtml(actor.body_size)}</strong></div>
                <div><span>데뷔년도</span><strong>${UI.escapeHtml(actor.debut_year)}</strong></div>
              </div>
            </div>
          </article>`;
        return;
      }

      if (kind === "categories") {
        const category = entity.raw;
        profile.innerHTML = `
          <article class="profile-panel">
            <img src="${UI.escapeHtml(category.representative_image_url)}" alt="${UI.escapeHtml(category.name)} 대표이미지">
            <div>
              <p class="eyebrow">Category</p>
              <h2>${UI.escapeHtml(category.name)}</h2>
              <div class="detail-list">
                <div><span>카테고리코드</span><strong>${UI.escapeHtml(category.category_code)}</strong></div>
                <div><span>전시여부</span><strong>${category.is_visible === false ? "미전시" : "전시"}</strong></div>
                <div><span>작품수</span><strong>${movies.length}개</strong></div>
              </div>
            </div>
          </article>`;
        return;
      }

      profile.innerHTML = `
        <article class="profile-panel rating-profile">
          <div class="rating rating-large">${UI.escapeHtml(entity.raw.grade)}</div>
          <div>
            <p class="eyebrow">Rating Grade</p>
            <h2>${UI.escapeHtml(entity.raw.grade)} 등급 작품</h2>
            <div class="detail-list">
              <div><span>정렬순서</span><strong>${UI.escapeHtml(entity.raw.display_order)}</strong></div>
              <div><span>작품수</span><strong>${movies.length}개</strong></div>
            </div>
          </div>
        </article>`;
    }

    function render() {
      renderFilters();
      const movies = moviesBySelection();
      renderProfile(movies);
      const result = UI.paginate(movies, page, pageSize.value);
      page = result.page || 1;
      grid.innerHTML = result.items.length ? result.items.map(UI.movieCard).join("") : `<div class="empty">조건에 맞는 영화정보가 없습니다.</div>`;
      UI.setupMovieCards(grid);
      UI.renderPagination(pagination, result.totalPages, page, (nextPage) => {
        page = nextPage;
        render();
      });
    }

    if (pageSize) pageSize.addEventListener("change", () => { page = 1; render(); });
    if (searchInput) searchInput.addEventListener("input", () => { page = 1; render(); });
    render();
  }

  window.CineTubeCatalogPage = { init };
})();
