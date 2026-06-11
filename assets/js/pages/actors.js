(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();

  await Store.list("actors", { page: 1, pageSize: 20, order: "name.asc" });
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
    const result = await Store.list("actors", {
      page,
      pageSize: pageSize.value,
      search: term,
      order: "name.asc"
    });
    const actors = result.items || [];

    actorSummary.innerHTML = `
      <span class="summary-pill"><strong>${UI.escapeHtml(result.total)}</strong> 배우</span>
      <span class="summary-pill">페이지 단위 로딩</span>`;

    page = result.page || 1;
    actorGrid.innerHTML = actors.length ? actors.map(actorCard).join("") : `<div class="empty">조건에 맞는 배우정보가 없습니다.</div>`;
    UI.renderPagination(pagination, totalPages(result.total, pageSize.value), page, (nextPage) => {
      page = nextPage;
      render();
    });
  }

  if (pageSize) pageSize.addEventListener("change", () => { page = 1; render(); });
  if (searchInput) searchInput.addEventListener("input", () => { page = 1; render(); });
  render();
})();











