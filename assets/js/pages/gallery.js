(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();

  let data = { galleryImages: [] };
  const params = new URLSearchParams(window.location.search);
  const detailId = params.get("id") || "";
  const root = document.getElementById("galleryView");
  const searchInput = document.getElementById("searchInput");
  let mode = localStorage.getItem("cinetube_gallery_view_mode") || "grid";
  let page = 1;
  let slideIndex = 0;
  let pageSize = "20";
  let totalItems = 0;

  function imageUrl(item) {
    return item.image_asset?.thumb_url || item.image_url || item.image_asset?.public_url || "../assets/img/favicon.svg";
  }

  function itemId(item) {
    return String(item.gallery_image_id || item.id || "");
  }

  function itemTags(item) {
    return Array.isArray(item.tags) ? item.tags : String(item.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
  }

  async function loadPage() {
    const result = await Store.list("galleryImages", {
      page,
      pageSize,
      search: searchInput?.value || "",
      order: "regdate.desc",
      includeUrls: true,
      filters: { is_visible: true }
    });
    UI.setDbStatus(Store.getStatus());
    data = { galleryImages: result.items || [] };
    totalItems = result.total || 0;
    page = result.page || 1;
    return result;
  }

  function totalPages(total, size) {
    if (String(size).toLowerCase() === "all") return 1;
    return Math.max(1, Math.ceil(Number(total || 0) / Number(size || 20)));
  }

  function favoriteButton(item) {
    const code = itemId(item);
    const favorite = UI.isFavoriteContent("gallery", code);
    return `
      <button class="favorite-toggle card-favorite-toggle ${favorite ? "active" : ""}" type="button" data-favorite-type="gallery" data-favorite-code="${UI.escapeHtml(code)}" aria-pressed="${favorite ? "true" : "false"}" aria-label="${favorite ? "관심작품 해제" : "관심작품"}" title="${favorite ? "관심작품 해제" : "관심작품"}">
        <span class="material-symbols-outlined">${favorite ? "favorite" : "favorite_border"}</span><span class="favorite-label">관심작품</span>
      </button>`;
  }

  function card(item) {
    const tags = itemTags(item).join(", ");
    const href = `gallery.html?id=${encodeURIComponent(itemId(item))}`;
    return `
      <article class="poster-card gallery-card" data-gallery-href="${UI.escapeHtml(href)}" tabindex="0" role="link" aria-label="${UI.escapeHtml(item.title)} 갤러리 보기">
        <div class="poster-frame gallery-frame">
          <img src="${UI.escapeHtml(imageUrl(item))}" alt="${UI.escapeHtml(item.title)}" loading="lazy">
          ${favoriteButton(item)}
          <div class="poster-overlay">
            <span>${UI.escapeHtml(item.source || "Gallery")}</span>
            <span>${UI.escapeHtml(tags || "태그 없음")}</span>
          </div>
        </div>
        <h3 class="poster-title">${UI.escapeHtml(item.title)}</h3>
        <div class="poster-meta"><span>${UI.escapeHtml(itemId(item))}</span><span>${UI.escapeHtml(String(item.regdate || item.created_at || "").slice(0, 10))}</span></div>
      </article>`;
  }

  function bindCards() {
    root.querySelectorAll("[data-gallery-href]").forEach((item) => {
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
    UI.setupFavoriteButtons(root, null, "gallery");
  }

  function toolbar(items, total) {
    return `
      <div class="section-head"><div><p class="eyebrow">Gallery Board</p><h1>갤러리</h1><p>등록된 이미지를 목록, 바둑판, 슬라이드 방식으로 확인합니다.</p></div></div>
      <div class="toolbar">
        <div class="filter-pills">
          <span class="summary-pill"><strong>${UI.escapeHtml(total)}</strong> 이미지</span>
          <button class="pill ${mode === "list" ? "active" : ""}" type="button" data-view-mode="list">목록</button>
          <button class="pill ${mode === "grid" ? "active" : ""}" type="button" data-view-mode="grid">바둑판</button>
          <button class="pill ${mode === "slide" ? "active" : ""}" type="button" data-view-mode="slide">슬라이드</button>
        </div>
        <label class="page-size-label">페이지당
          <select class="select-control" id="pageSizeSelect">
            <option value="20" ${pageSize === "20" ? "selected" : ""}>20개</option>
            <option value="40" ${pageSize === "40" ? "selected" : ""}>40개</option>
            <option value="80" ${pageSize === "80" ? "selected" : ""}>80개</option>
            <option value="all" ${pageSize === "all" ? "selected" : ""}>전체</option>
          </select>
        </label>
      </div>`;
  }

  function renderList(items) {
    return `
      <section class="gallery-list">
        ${items.length ? items.map((item) => `
          <article class="gallery-list-row" data-gallery-href="gallery.html?id=${UI.escapeHtml(itemId(item))}" tabindex="0" role="link">
            <img src="${UI.escapeHtml(imageUrl(item))}" alt="${UI.escapeHtml(item.title)}">
            <div>
              <h2>${UI.escapeHtml(item.title)}</h2>
              <p>${UI.escapeHtml(item.description || "설명 없음")}</p>
              <div class="keyword-row">${itemTags(item).map((tag) => `<span>${UI.escapeHtml(tag)}</span>`).join("") || "<span>태그 없음</span>"}</div>
            </div>
            ${favoriteButton(item)}
          </article>`).join("") : `<div class="empty">등록된 갤러리 이미지가 없습니다.</div>`}
      </section>`;
  }

  function renderSlide(items) {
    if (!items.length) return `<div class="empty">등록된 갤러리 이미지가 없습니다.</div>`;
    slideIndex = Math.min(Math.max(slideIndex, 0), items.length - 1);
    const item = items[slideIndex];
    return `
      <section class="gallery-slide">
        <div class="gallery-slide-media"><img src="${UI.escapeHtml(imageUrl(item))}" alt="${UI.escapeHtml(item.title)}"></div>
        <div class="gallery-slide-info">
          <p class="eyebrow">${UI.escapeHtml(slideIndex + 1)} / ${UI.escapeHtml(items.length)}</p>
          <h2>${UI.escapeHtml(item.title)}</h2>
          <p>${UI.escapeHtml(item.description || "설명 없음")}</p>
          <div class="keyword-row">${itemTags(item).map((tag) => `<span>${UI.escapeHtml(tag)}</span>`).join("") || "<span>태그 없음</span>"}</div>
          <div class="hero-actions">
            <button class="ghost-button" type="button" id="prevSlide"><span class="material-symbols-outlined">chevron_left</span>이전</button>
            <button class="ghost-button" type="button" id="nextSlide">다음<span class="material-symbols-outlined">chevron_right</span></button>
            <a class="primary-button" href="gallery.html?id=${UI.escapeHtml(itemId(item))}"><span class="material-symbols-outlined">open_in_full</span>상세</a>
          </div>
        </div>
      </section>`;
  }

  async function renderIndex() {
    const result = await loadPage();
    const all = data.galleryImages || [];
    root.innerHTML = `
      ${toolbar(all, totalItems)}
      ${mode === "list" ? renderList(all) : mode === "slide" ? renderSlide(all) : `<section class="poster-grid">${all.length ? all.map(card).join("") : `<div class="empty">등록된 갤러리 이미지가 없습니다.</div>`}</section>`}
      <nav class="pagination" id="pagination" aria-label="페이지"></nav>`;

    root.querySelectorAll("[data-view-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        mode = button.dataset.viewMode;
        localStorage.setItem("cinetube_gallery_view_mode", mode);
        page = 1;
        renderIndex();
      });
    });
    const sizeSelect = document.getElementById("pageSizeSelect");
    if (sizeSelect) sizeSelect.addEventListener("change", () => { pageSize = sizeSelect.value; page = 1; renderIndex(); });
    const prev = document.getElementById("prevSlide");
    const next = document.getElementById("nextSlide");
    if (prev) prev.addEventListener("click", () => { slideIndex = (slideIndex - 1 + all.length) % all.length; renderIndex(); });
    if (next) next.addEventListener("click", () => { slideIndex = (slideIndex + 1) % all.length; renderIndex(); });
    bindCards();
    UI.renderPagination(document.getElementById("pagination"), totalPages(result.total, pageSize), page, (nextPage) => { page = nextPage; renderIndex(); });
  }

  async function renderDetail(item) {
    document.title = `CineTube | ${item.title}`;
    const code = itemId(item);
    const fullImageUrl = imageUrl(item);
    const favorite = UI.isFavoriteContent("gallery", code);
    root.innerHTML = `
      <section class="movie-detail gallery-detail">
        <div class="movie-detail-media">
          <img class="gallery-detail-preview-image" id="openGalleryImagePreview" src="${UI.escapeHtml(fullImageUrl)}" alt="${UI.escapeHtml(item.title)}" role="button" tabindex="0" aria-label="${UI.escapeHtml(item.title)} 전체 이미지 보기">
        </div>
        <div class="movie-detail-body">
          <p class="eyebrow">Gallery Detail</p>
          <h1>${UI.escapeHtml(item.title)}</h1>
          <div class="movie-badges">
            <span>${UI.escapeHtml(code)}</span>
            <span>${UI.escapeHtml(item.source || "Gallery")}</span>
            <span>${UI.escapeHtml(String(item.regdate || item.created_at || "").slice(0, 10) || "-")}</span>
          </div>
          <p class="movie-description">${UI.escapeHtml(item.description || "등록된 설명이 없습니다.")}</p>
          <div class="keyword-row">${itemTags(item).map((tag) => `<span>${UI.escapeHtml(tag)}</span>`).join("") || "<span>태그 없음</span>"}</div>
          <div class="hero-actions">
            <button class="ghost-button favorite-toggle detail-favorite-toggle ${favorite ? "active" : ""}" type="button" data-favorite-type="gallery" data-favorite-code="${UI.escapeHtml(code)}" aria-pressed="${favorite ? "true" : "false"}"><span class="material-symbols-outlined">${favorite ? "favorite" : "favorite_border"}</span><span class="favorite-label">관심작품</span></button>
            <a class="ghost-button" href="../admin/gallery-images.html?id=${UI.escapeHtml(code)}"><span class="material-symbols-outlined">edit</span>수정</a>
            <button class="ghost-button danger-action" type="button" id="deleteGalleryImage"><span class="material-symbols-outlined">delete</span>삭제</button>
            <a class="primary-button" href="gallery.html"><span class="material-symbols-outlined">arrow_back</span>목록</a>
          </div>
        </div>
      </section>`;
    UI.setupFavoriteButtons(root, null, "gallery");
    const previewImage = document.getElementById("openGalleryImagePreview");
    if (previewImage) {
      const openImageModal = () => {
        const existing = document.getElementById("galleryImageModal");
        if (existing) existing.remove();
        const modal = document.createElement("div");
        modal.className = "image-modal";
        modal.id = "galleryImageModal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-label", "갤러리 이미지 전체보기");
        modal.innerHTML = `
          <button class="image-modal-close" type="button" aria-label="닫기"><span class="material-symbols-outlined">close</span></button>
          <img src="${UI.escapeHtml(fullImageUrl)}" alt="${UI.escapeHtml(item.title)} 전체 이미지">
        `;
        document.body.appendChild(modal);
        const closeButton = modal.querySelector(".image-modal-close");
        const close = () => modal.remove();
        closeButton.addEventListener("click", close);
        modal.addEventListener("click", (event) => {
          if (event.target === modal) close();
        });
        document.addEventListener("keydown", function onEscape(event) {
          if (event.key !== "Escape") return;
          close();
          document.removeEventListener("keydown", onEscape);
        });
        closeButton.focus();
      };
      previewImage.addEventListener("click", openImageModal);
      previewImage.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openImageModal();
      });
    }
    const deleteButton = document.getElementById("deleteGalleryImage");
    if (deleteButton) {
      deleteButton.addEventListener("click", async () => {
        if (!confirm(`갤러리 이미지를 삭제하시겠습니까?\n\n${item.title}`)) return;
        deleteButton.disabled = true;
        try {
          await Store.remove("galleryImages", item.id);
          if (item.image_asset) await Store.deleteMedia(item.image_asset);
          window.location.href = "gallery.html";
        } catch (error) {
          alert(`삭제 실패: ${error.message}`);
          deleteButton.disabled = false;
        }
      });
    }
  }

  if (searchInput) searchInput.addEventListener("input", () => { page = 1; renderIndex(); });

  if (detailId) {
    const result = await Store.list("galleryImages", {
      page: 1,
      pageSize: 20,
      search: detailId,
      order: "regdate.desc",
      includeUrls: true
    });
    UI.setDbStatus(Store.getStatus());
    data = { galleryImages: result.items || [] };
    const item = (data.galleryImages || []).find((entry) => itemId(entry) === detailId || String(entry.id) === detailId);
    if (item) {
      await renderDetail(item);
    } else {
      root.innerHTML = `<div class="empty">갤러리 이미지를 찾을 수 없습니다.</div>`;
    }
    return;
  }

  renderIndex();
})();
