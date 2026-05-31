(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();

  const data = await Store.load();
  UI.setDbStatus(Store.getStatus());

  const actorGrid = document.getElementById("actorGrid");
  const actorSummary = document.getElementById("actorSummary");
  const pagination = document.getElementById("pagination");
  const pageSize = document.getElementById("pageSizeSelect");
  const searchInput = document.getElementById("searchInput");
  let page = 1;

  function actorImage(actor) {
    return actor.representative_image_url || actor.image_urls?.[0] || "assets/img/favicon.svg";
  }

  function movieCount(actor) {
    return data.movies.filter((movie) => String(movie.actor_id) === String(actor.id)).length;
  }

  function matchesActor(actor, term) {
    if (!term) return true;
    const haystack = [actor.name, actor.body_size, actor.debut_year, actor.age, actor.height_cm].join(" ").toLowerCase();
    return haystack.includes(term.toLowerCase());
  }

  function actorCard(actor) {
    const count = movieCount(actor);
    const href = `actor.html?id=${encodeURIComponent(actor.id)}`;
    return `
      <a class="actor-card" href="${UI.escapeHtml(href)}" aria-label="${UI.escapeHtml(actor.name)} 배우정보 보기">
        <div class="actor-card-image">
          <img src="${UI.escapeHtml(actorImage(actor))}" alt="${UI.escapeHtml(actor.name)} 대표이미지" loading="lazy">
        </div>
        <div class="actor-card-body">
          <p class="eyebrow">Actor</p>
          <h2>${UI.escapeHtml(actor.name)}</h2>
          <div class="actor-card-meta">
            <span>${UI.escapeHtml(count)} 작품</span>
            <span>${UI.escapeHtml(actor.debut_year || "-")} 데뷔</span>
          </div>
        </div>
      </a>`;
  }

  function render() {
    const term = searchInput ? searchInput.value.trim() : "";
    const actors = data.actors
      .slice()
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
      .filter((actor) => matchesActor(actor, term));

    actorSummary.innerHTML = `
      <span class="summary-pill"><strong>${UI.escapeHtml(actors.length)}</strong> 배우</span>
      <span class="summary-pill"><strong>${UI.escapeHtml(data.movies.length)}</strong> 영화</span>`;

    const result = UI.paginate(actors, page, pageSize.value);
    page = result.page || 1;
    actorGrid.innerHTML = result.items.length ? result.items.map(actorCard).join("") : `<div class="empty">조건에 맞는 배우정보가 없습니다.</div>`;
    UI.renderPagination(pagination, result.totalPages, page, (nextPage) => {
      page = nextPage;
      render();
    });
  }

  if (pageSize) pageSize.addEventListener("change", () => { page = 1; render(); });
  if (searchInput) searchInput.addEventListener("input", () => { page = 1; render(); });
  render();
})();
