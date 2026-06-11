(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();

  const data = await Store.load();
  UI.setDbStatus(Store.getStatus());

  const grid = document.getElementById("webtoonGrid");
  const summary = document.getElementById("webtoonSummary");
  const pagination = document.getElementById("pagination");
  const pageSize = document.getElementById("pageSizeSelect");
  const searchInput = document.getElementById("searchInput");
  let page = 1;

  function webtoonImage(webtoon) {
    return webtoon.poster_image || webtoon.poster_image_asset?.public_url || webtoon.webtoon_images?.[0] || webtoon.webtoon_image_assets?.[0]?.public_url || "../assets/img/favicon.svg";
  }

  function matches(webtoon, term) {
    if (!term) return true;
    const haystack = [
      webtoon.webtoon_id,
      webtoon.title,
      webtoon.rating,
      webtoon.alternative,
      webtoon.artist,
      webtoon.genre,
      webtoon.type,
      Array.isArray(webtoon.tage) ? webtoon.tage.join(" ") : webtoon.tage
    ].join(" ").toLowerCase();
    return haystack.includes(term.toLowerCase());
  }

  function card(webtoon) {
    const href = `webtoon.html?id=${encodeURIComponent(webtoon.webtoon_id || webtoon.id || "")}`;
    const tags = Array.isArray(webtoon.tage) ? webtoon.tage.join(", ") : webtoon.tage || "";
    const favoriteCode = String(webtoon.webtoon_id || webtoon.id || "");
    const favorite = UI.isFavoriteContent("webtoon", favoriteCode);
    return `
      <article class="poster-card" data-webtoon-href="${UI.escapeHtml(href)}" tabindex="0" role="link" aria-label="${UI.escapeHtml(webtoon.title)} 웹툰정보 보기">
        <div class="poster-frame">
          <img src="${UI.escapeHtml(webtoonImage(webtoon))}" alt="${UI.escapeHtml(webtoon.title)} 포스터" loading="lazy">
          <button class="favorite-toggle card-favorite-toggle ${favorite ? "active" : ""}" type="button" data-favorite-type="webtoon" data-favorite-code="${UI.escapeHtml(favoriteCode)}" aria-pressed="${favorite ? "true" : "false"}" aria-label="${favorite ? "관심작품 해제" : "관심작품"}" title="${favorite ? "관심작품 해제" : "관심작품"}">
            <span class="material-symbols-outlined">${favorite ? "favorite" : "favorite_border"}</span><span class="favorite-label">관심작품</span>
          </button>
          <div class="poster-overlay">
            <span class="rating">${UI.escapeHtml(webtoon.rating || "-")}</span>
            <span>${UI.escapeHtml(webtoon.genre || "-")} · ${UI.escapeHtml(webtoon.type || "-")}</span>
            <span>${UI.escapeHtml(webtoon.artist || "-")}</span>
          </div>
        </div>
        <h3 class="poster-title">${UI.escapeHtml(webtoon.title)}</h3>
        <div class="poster-meta"><span>${UI.escapeHtml(webtoon.webtoon_id)}</span><span>${UI.escapeHtml(tags)}</span></div>
      </article>`;
  }

  function bindCards() {
    grid.querySelectorAll(".poster-card[data-webtoon-href]").forEach((item) => {
      const open = () => { window.location.href = item.dataset.webtoonHref; };
      item.addEventListener("click", (event) => {
        if (event.target.closest(".favorite-toggle")) return;
        open();
      });
      item.addEventListener("keydown", (event) => {
        if (event.target.closest(".favorite-toggle")) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open();
      });
    });
  }

  function render() {
    const term = searchInput ? searchInput.value.trim() : "";
    const items = (data.webtoons || [])
      .slice()
      .filter((webtoon) => matches(webtoon, term))
      .sort((a, b) => new Date(b.regdate || b.created_at || 0) - new Date(a.regdate || a.created_at || 0));

    summary.innerHTML = `<span class="summary-pill"><strong>${UI.escapeHtml(items.length)}</strong> 웹툰</span><span class="summary-pill">최신 등록순</span>`;

    const result = UI.paginate(items, page, pageSize.value);
    page = result.page || 1;
    grid.innerHTML = result.items.length ? result.items.map(card).join("") : `<div class="empty">조건에 맞는 웹툰정보가 없습니다.</div>`;
    bindCards();
    UI.setupFavoriteButtons(grid, null, "webtoon");
    UI.renderPagination(pagination, result.totalPages, page, (nextPage) => {
      page = nextPage;
      render();
    });
  }

  if (pageSize) pageSize.addEventListener("change", () => { page = 1; render(); });
  if (searchInput) searchInput.addEventListener("input", () => { page = 1; render(); });
  render();
})();











