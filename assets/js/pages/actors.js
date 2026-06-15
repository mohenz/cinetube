(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();

  await Store.load();
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
    return actor.movie_count ?? "-";
  }

  function actorSort(a, b) {
    const countCompare = Number(b.movie_count || 0) - Number(a.movie_count || 0);
    if (countCompare !== 0) return countCompare;
    return String(a.name || "").localeCompare(String(b.name || ""));
  }

  function matchesActor(actor, term) {
    if (!term) return true;
    const keyword = term.toLowerCase();
    return [
      actor.name,
      actor.body_size,
      actor.debut_year,
      actor.age,
      actor.height_cm
    ].join(" ").toLowerCase().includes(keyword);
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

  function totalPages(total, size) {
    if (String(size).toLowerCase() === "all") return 1;
    return Math.max(1, Math.ceil(Number(total || 0) / Number(size || 20)));
  }

  async function render() {
    const term = searchInput ? searchInput.value.trim() : "";
    const data = await Store.load();
    const size = pageSize.value;
    const filteredActors = (data.actors || []).filter((actor) => matchesActor(actor, term)).sort(actorSort);
    const total = filteredActors.length;
    const pages = totalPages(total, size);
    page = Math.min(Math.max(1, page), pages);
    const actors = String(size).toLowerCase() === "all"
      ? filteredActors
      : filteredActors.slice((page - 1) * Number(size), page * Number(size));

    actorSummary.innerHTML = `
      <span class="summary-pill"><strong>${UI.escapeHtml(total)}</strong> 배우</span>
      <span class="summary-pill">작품수 많은 순</span>`;

    actorGrid.innerHTML = actors.length ? actors.map(actorCard).join("") : `<div class="empty">조건에 맞는 배우정보가 없습니다.</div>`;
    UI.renderPagination(pagination, pages, page, (nextPage) => {
      page = nextPage;
      render();
    });
  }

  if (pageSize) pageSize.addEventListener("change", () => { page = 1; render(); });
  if (searchInput) searchInput.addEventListener("input", () => { page = 1; render(); });
  render();
})();











