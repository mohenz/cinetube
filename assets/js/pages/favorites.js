(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();

  let data = await Store.load();
  if (Store.favoriteIds("gallery").length && Store.loadGalleryImagesWithUrls) {
    await Store.loadGalleryImagesWithUrls();
    data = await Store.load();
  }
  UI.setDbStatus(Store.getStatus());

  const movieGrid = document.getElementById("movieGrid");
  const movieSummary = document.getElementById("movieSummary");
  const pagination = document.getElementById("pagination");
  const pageSize = document.getElementById("pageSizeSelect");
  const searchInput = document.getElementById("searchInput");
  const favoriteTabs = document.getElementById("favoriteTabs");
  let page = 1;
  let activeTab = "movie";

  if (pageSize) pageSize.value = "20";

  function webtoonImage(webtoon) {
    return webtoon.poster_image || webtoon.poster_image_asset?.public_url || webtoon.webtoon_images?.[0] || webtoon.webtoon_image_assets?.[0]?.public_url || "../assets/img/favicon.svg";
  }

  function matchesWebtoon(webtoon, term) {
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

  function galleryImageUrl(item) {
    return item.image_url || item.image_asset?.public_url || "../assets/img/favicon.svg";
  }

  function matchesGallery(item, term) {
    if (!term) return true;
    const tags = Array.isArray(item.tags) ? item.tags.join(" ") : item.tags || "";
    const haystack = [
      item.gallery_image_id,
      item.title,
      item.description,
      item.source,
      tags
    ].join(" ").toLowerCase();
    return haystack.includes(term.toLowerCase());
  }

  function galleryCard(item) {
    const href = `gallery.html?id=${encodeURIComponent(item.gallery_image_id || item.id || "")}`;
    const tags = Array.isArray(item.tags) ? item.tags.join(", ") : item.tags || "";
    const favoriteCode = String(item.gallery_image_id || item.id || "");
    const favorite = UI.isFavoriteContent("gallery", favoriteCode);
    return `
      <article class="poster-card" data-gallery-href="${UI.escapeHtml(href)}" tabindex="0" role="link" aria-label="${UI.escapeHtml(item.title)} 갤러리 보기">
        <div class="poster-frame gallery-frame">
          <img src="${UI.escapeHtml(galleryImageUrl(item))}" alt="${UI.escapeHtml(item.title)}" loading="lazy">
          <button class="favorite-toggle card-favorite-toggle ${favorite ? "active" : ""}" type="button" data-favorite-type="gallery" data-favorite-code="${UI.escapeHtml(favoriteCode)}" aria-pressed="${favorite ? "true" : "false"}" aria-label="${favorite ? "관심작품 해제" : "관심작품"}" title="${favorite ? "관심작품 해제" : "관심작품"}">
            <span class="material-symbols-outlined">${favorite ? "favorite" : "favorite_border"}</span><span class="favorite-label">관심작품</span>
          </button>
          <div class="poster-overlay">
            <span>${UI.escapeHtml(item.source || "Gallery")}</span>
            <span>${UI.escapeHtml(tags || "태그 없음")}</span>
          </div>
        </div>
        <h3 class="poster-title">${UI.escapeHtml(item.title)}</h3>
        <div class="poster-meta"><span>${UI.escapeHtml(item.gallery_image_id)}</span><span>${UI.escapeHtml(String(item.regdate || item.created_at || "").slice(0, 10))}</span></div>
      </article>`;
  }

  function webtoonCard(webtoon) {
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

  function bindWebtoonCards() {
    movieGrid.querySelectorAll(".poster-card[data-webtoon-href]").forEach((item) => {
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

  function bindGalleryCards() {
    movieGrid.querySelectorAll(".poster-card[data-gallery-href]").forEach((item) => {
      const open = () => { window.location.href = item.dataset.galleryHref; };
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
    const favoriteCodes = Store.favoriteIds("movie");
    const favoriteWebtoonIds = Store.favoriteIds("webtoon");
    const favoriteGalleryIds = Store.favoriteIds("gallery");
    const movies = data.movies
      .filter((movie) => favoriteCodes.includes(String(movie.movie_code || movie.id || "")))
      .filter((movie) => UI.matchesSearch(movie, term));
    const webtoons = (data.webtoons || [])
      .filter((webtoon) => favoriteWebtoonIds.includes(String(webtoon.webtoon_id || webtoon.id || "")))
      .filter((webtoon) => matchesWebtoon(webtoon, term));
    const galleryImages = (data.galleryImages || [])
      .filter((item) => favoriteGalleryIds.includes(String(item.gallery_image_id || item.id || "")))
      .filter((item) => matchesGallery(item, term));
    const tabItems = {
      movie: movies.map((item) => ({ type: "movie", item, date: item.created_at || "" })),
      webtoon: webtoons.map((item) => ({ type: "webtoon", item, date: item.regdate || item.created_at || "" })),
      gallery: galleryImages.map((item) => ({ type: "gallery", item, date: item.regdate || item.created_at || "" }))
    };
    const items = (tabItems[activeTab] || tabItems.movie).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const emptyLabels = {
      movie: "관심작품으로 선택한 영화가 없습니다.",
      webtoon: "관심작품으로 선택한 웹툰이 없습니다.",
      gallery: "관심작품으로 선택한 갤러리 이미지가 없습니다."
    };

    movieSummary.innerHTML = `
      <span class="summary-pill"><strong>${UI.escapeHtml(movies.length + webtoons.length + galleryImages.length)}</strong> 관심작품</span>
      <span class="summary-pill">영화 ${UI.escapeHtml(movies.length)}개</span>
      <span class="summary-pill">웹툰 ${UI.escapeHtml(webtoons.length)}개</span>
      <span class="summary-pill">갤러리 ${UI.escapeHtml(galleryImages.length)}개</span>
      <span class="summary-pill">선택/해제 가능</span>`;

    if (favoriteTabs) {
      favoriteTabs.querySelectorAll("[data-favorite-tab]").forEach((button) => {
        const isActive = button.dataset.favoriteTab === activeTab;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    }

    const result = UI.paginate(items, page, pageSize.value);
    page = result.page || 1;
    movieGrid.innerHTML = result.items.length
      ? result.items.map((entry) => entry.type === "movie" ? UI.movieCard(entry.item) : entry.type === "webtoon" ? webtoonCard(entry.item) : galleryCard(entry.item)).join("")
      : `<div class="empty">${UI.escapeHtml(emptyLabels[activeTab] || "관심작품으로 선택한 콘텐츠가 없습니다.")}</div>`;
    UI.setupMovieCards(movieGrid, () => {
      page = 1;
      render();
    });
    bindWebtoonCards();
    bindGalleryCards();
    UI.setupFavoriteButtons(movieGrid, () => {
      page = 1;
      render();
    }, "webtoon");
    UI.setupFavoriteButtons(movieGrid, () => {
      page = 1;
      render();
    }, "gallery");
    UI.renderPagination(pagination, result.totalPages, page, (nextPage) => {
      page = nextPage;
      render();
    });
  }

  if (pageSize) pageSize.addEventListener("change", () => { page = 1; render(); });
  if (searchInput) searchInput.addEventListener("input", () => { page = 1; render(); });
  if (favoriteTabs) {
    favoriteTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-favorite-tab]");
      if (!button) return;
      activeTab = button.dataset.favoriteTab || "movie";
      page = 1;
      render();
    });
  }
  render();
})();
