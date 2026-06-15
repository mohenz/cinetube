(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();

  const data = await Store.load();
  UI.setDbStatus(Store.getStatus());

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "";
  const detail = document.getElementById("webtoonDetail");
  const idDisplay = document.getElementById("webtoonIdDisplay");
  const webtoon = (data.webtoons || []).find((item) => String(item.webtoon_id) === String(id) || String(item.id) === String(id));

  if (idDisplay) idDisplay.value = id || "웹툰정보";
  if (!webtoon) {
    detail.innerHTML = `<div class="empty">웹툰정보를 찾을 수 없습니다.</div>`;
    return;
  }

  document.title = `CineTube | ${webtoon.title}`;
  if (idDisplay) idDisplay.value = webtoon.webtoon_id || "";

  const posterUrl = webtoon.poster_image || webtoon.poster_image_asset?.public_url || webtoon.webtoon_images?.[0] || "../assets/img/favicon.svg";
  const tags = Array.isArray(webtoon.tage) ? webtoon.tage : [];
  const images = [
    ...(webtoon.webtoon_images || []),
    ...(webtoon.webtoon_image_assets || []).map((asset) => asset.public_url)
  ].filter(Boolean).slice(0, 6);
  const chapters = (webtoon.chapters || []).slice().sort((a, b) => Number(a.chapter_number || 0) - Number(b.chapter_number || 0));
  const favoriteCode = String(webtoon.webtoon_id || webtoon.id || "");
  const isFavoriteWebtoon = UI.isFavoriteContent("webtoon", favoriteCode);

  detail.innerHTML = `
    <section class="movie-detail">
      <div class="movie-detail-media">
        <img src="${UI.escapeHtml(posterUrl)}" alt="${UI.escapeHtml(webtoon.title)} 포스터">
      </div>
      <div class="movie-detail-body">
        <p class="eyebrow">Webtoon Detail</p>
        <h1>${UI.escapeHtml(webtoon.title)}</h1>
        <div class="movie-badges">
          <span class="rating">${UI.escapeHtml(webtoon.rating || "-")}</span>
          <span>${UI.escapeHtml(webtoon.webtoon_id || "-")}</span>
          <span>${UI.escapeHtml(webtoon.genre || "-")}</span>
          <span>${UI.escapeHtml(webtoon.type || "-")}</span>
        </div>
        <p class="movie-description">${UI.escapeHtml(webtoon.alternative || "등록된 Alternative 정보가 없습니다.")}</p>
        <div class="detail-list movie-detail-list">
          <div><span>Artist</span><strong>${UI.escapeHtml(webtoon.artist || "-")}</strong></div>
          <div><span>Genre</span><strong>${UI.escapeHtml(webtoon.genre || "-")}</strong></div>
          <div><span>Type</span><strong>${UI.escapeHtml(webtoon.type || "-")}</strong></div>
          <div><span>Regdate</span><strong>${UI.escapeHtml(webtoon.regdate ? String(webtoon.regdate).slice(0, 10) : "-")}</strong></div>
        </div>
        <div class="keyword-row">
          ${tags.length ? tags.map((tag) => `<span>${UI.escapeHtml(tag)}</span>`).join("") : `<span>태그 없음</span>`}
        </div>
        <div class="hero-actions">
          <button class="ghost-button favorite-toggle detail-favorite-toggle ${isFavoriteWebtoon ? "active" : ""}" type="button" id="toggleFavoriteWebtoon" data-favorite-type="webtoon" data-favorite-code="${UI.escapeHtml(favoriteCode)}" aria-pressed="${isFavoriteWebtoon ? "true" : "false"}"><span class="material-symbols-outlined">${isFavoriteWebtoon ? "favorite" : "favorite_border"}</span><span class="favorite-label">관심작품</span></button>
          ${webtoon.url ? `<a class="primary-button" href="${UI.escapeHtml(webtoon.url)}" target="_blank" rel="noreferrer"><span class="material-symbols-outlined">open_in_new</span>원문 링크</a>` : ""}
          <a class="ghost-button" href="../admin/webtoons.html?id=${UI.escapeHtml(webtoon.webtoon_id)}"><span class="material-symbols-outlined">edit</span>웹툰 관리</a>
          <a class="ghost-button" href="../admin/webtoon-chapters.html"><span class="material-symbols-outlined">format_list_numbered</span>Chapter 관리</a>
        </div>
      </div>
    </section>
    <section class="movie-image-strip webtoon-image-strip">
      ${images.length ? images.map((image, index) => `<img class="snapshot-preview-image webtoon-preview-image" src="${UI.escapeHtml(image)}" alt="${UI.escapeHtml(webtoon.title)} 이미지 ${index + 1}" role="button" tabindex="0" data-webtoon-image-index="${index}" aria-label="${UI.escapeHtml(webtoon.title)} 이미지 ${index + 1} 전체보기">`).join("") : ""}
    </section>
    <section class="admin-panel webtoon-chapter-panel">
      <div class="section-head"><div><p class="eyebrow">Chapters</p><h2>Chapter 목록</h2></div></div>
      <table>
        <thead><tr><th>Chapter</th><th>Poster</th><th>URL</th><th>Regdate</th></tr></thead>
        <tbody>
          ${chapters.length ? chapters.map((chapter) => `
            <tr>
              <td>${UI.escapeHtml(chapter.chapter_number)}</td>
              <td>${chapter.chapter_poster ? `<img class="table-thumb" src="${UI.escapeHtml(chapter.chapter_poster)}" alt="${UI.escapeHtml(chapter.webtoon_chapter_id)}">` : `<span class="muted-text">없음</span>`}</td>
              <td>${chapter.chapter_url ? `<a class="link-button" href="${UI.escapeHtml(chapter.chapter_url)}" target="_blank" rel="noreferrer">열기</a>` : `<span class="muted-text">없음</span>`}</td>
              <td>${UI.escapeHtml(chapter.regdate ? String(chapter.regdate).slice(0, 10) : "-")}</td>
            </tr>
          `).join("") : `<tr><td colspan="4"><div class="empty">등록된 Chapter가 없습니다.</div></td></tr>`}
        </tbody>
      </table>
    </section>`;
  UI.setupFavoriteButtons(detail, null, "webtoon");

  function openWebtoonImageModal(imageUrl, index) {
    const existing = document.getElementById("webtoonImageModal");
    if (existing) existing.remove();
    const modal = document.createElement("div");
    modal.className = "image-modal";
    modal.id = "webtoonImageModal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "웹툰이미지 전체보기");
    modal.innerHTML = `
      <button class="image-modal-close" type="button" aria-label="닫기"><span class="material-symbols-outlined">close</span></button>
      <img src="${UI.escapeHtml(imageUrl)}" alt="${UI.escapeHtml(webtoon.title)} 웹툰 이미지 ${index + 1} 전체 이미지">
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
  }

  detail.querySelectorAll("[data-webtoon-image-index]").forEach((image) => {
    const index = Number(image.dataset.webtoonImageIndex || 0);
    const open = () => openWebtoonImageModal(images[index], index);
    image.addEventListener("click", open);
    image.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      open();
    });
  });
})();











