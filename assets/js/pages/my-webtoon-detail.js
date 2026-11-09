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
  if (!webtoon || String(webtoon.type || "").toLowerCase() !== "original") {
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
        </div>
      </div>
    </section>
    <section class="movie-image-strip webtoon-image-strip">
      ${images.length ? images.map((image, index) => `<img class="snapshot-preview-image webtoon-preview-image" src="${UI.escapeHtml(image)}" alt="${UI.escapeHtml(webtoon.title)} 이미지 ${index + 1}" role="button" tabindex="0" data-webtoon-image-index="${index}" aria-label="${UI.escapeHtml(webtoon.title)} 이미지 ${index + 1} 전체보기">`).join("") : ""}
    </section>
    <section class="admin-panel webtoon-chapter-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Chapters</p>
          <h2>Chapter 목록</h2>
        </div>
        <div class="filter-pills" id="chapterSortControls">
          <button class="pill active" type="button" data-sort-dir="asc">Read First</button>
          <button class="pill" type="button" data-sort-dir="desc">Read Last</button>
        </div>
      </div>
      <div class="reader-toolbar" id="readerToolbar"></div>
      <div class="webtoon-reader" id="webtoonReader"></div>
      <table>
        <thead><tr><th>Chapter</th><th>Poster</th><th>URL</th><th>Regdate</th></tr></thead>
        <tbody></tbody>
      </table>
    </section>`;
  UI.setupFavoriteButtons(detail, null, "webtoon");

  // 챕터를 새 창(탭)에서 열기 위한 주소: 같은 화면을 ?chapter=N 으로 연다.
  const chapterWindowUrl = (chapterNumber) => `${window.location.pathname}?id=${encodeURIComponent(webtoon.webtoon_id)}&chapter=${encodeURIComponent(chapterNumber)}&popup=1`;
  // 새 창으로 보기: 크기 조절이 가능한 팝업 창으로 연다. 팝업이 막히면 링크의 기본 동작(새 탭)을 따른다.
  detail.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-popup-reader]");
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const width = Math.min(900, window.screen.availWidth - 80), height = Math.min(window.screen.availHeight - 80, 1000);
    const popup = window.open(link.href, "cinetubeReader", `popup=yes,width=${width},height=${height},left=${Math.round((window.screen.availWidth - width) / 2)},top=40,resizable=yes,scrollbars=yes`);
    if (popup) { event.preventDefault(); popup.focus(); }
  });
  let currentSortDir = "asc";
  let currentChapterIndex = -1;
  let currentPageIndex = 0;

  // 목록이 먼저 보이고, 챕터를 고르면 모든 컷을 세로로 이어서 보여 준다.
  function renderReader(chapterIndex = currentChapterIndex) {
    const chapters = (webtoon.chapters || []).slice().sort((a, b) => Number(a.chapter_number || 0) - Number(b.chapter_number || 0));
    const toolbar = detail.querySelector("#readerToolbar"), reader = detail.querySelector("#webtoonReader");
    const listParts = [detail.querySelector(".webtoon-chapter-panel table"), detail.querySelector("#chapterSortControls")];
    // 챕터를 읽는 동안에는 작품 정보 영역(.movie-detail, 이미지 띠)을 숨긴다.
    const infoParts = [detail.querySelector(".movie-detail"), detail.querySelector(".webtoon-image-strip")];
    const reading = chapterIndex >= 0 && chapters.length > 0;
    infoParts.forEach((el) => { if (el) el.hidden = reading; });
    if (chapterIndex < 0 || !chapters.length) {
      currentChapterIndex = -1;
      toolbar.innerHTML = ""; reader.innerHTML = "";
      toolbar.hidden = true; reader.hidden = true;
      listParts.forEach((el) => { if (el) el.hidden = false; });
      return;
    }
    currentChapterIndex = Math.max(0, Math.min(chapterIndex, chapters.length - 1));
    const chapter = chapters[currentChapterIndex];
    const pages = chapter.page_images?.length ? chapter.page_images.map(page => page.url) : (chapter.chapter_poster ? [chapter.chapter_poster] : []);
    toolbar.hidden = false; reader.hidden = false;
    listParts.forEach((el) => { if (el) el.hidden = true; });
    const step = (delta) => `<button class="ghost-button" type="button" data-chapter-step="${delta}" ${currentChapterIndex + delta < 0 || currentChapterIndex + delta >= chapters.length ? "disabled" : ""}>${delta < 0 ? "이전 화" : "다음 화"}</button>`;
    toolbar.innerHTML = `<button class="ghost-button" type="button" data-reader-close><span class="material-symbols-outlined">list</span>챕터 목록</button><label>챕터 <select class="select-control" id="readerChapterSelect">${chapters.map((item,index)=>`<option value="${index}" ${index===currentChapterIndex?"selected":""}>제${UI.escapeHtml(item.chapter_number)}화${item.chapter_title?` · ${UI.escapeHtml(item.chapter_title)}`:""}</option>`).join("")}</select></label><a class="ghost-button" data-popup-reader href="${UI.escapeHtml(chapterWindowUrl(chapter.chapter_number))}" target="_blank" rel="noopener" title="새 창으로 보기" aria-label="새 창으로 보기"><span class="material-symbols-outlined">open_in_new</span></a><div class="reader-jump">${step(-1)}${step(1)}</div>`;
    reader.innerHTML = pages.length
      ? `<div class="reader-page-count">제${UI.escapeHtml(chapter.chapter_number)}화 ${UI.escapeHtml(chapter.chapter_title || "")} · ${pages.length}컷</div><div class="reader-stack">${pages.map((url, index) => `<figure class="reader-cut"><img class="reader-image" loading="lazy" src="${UI.escapeHtml(url)}" alt="${UI.escapeHtml(webtoon.title)} 제${UI.escapeHtml(chapter.chapter_number)}화 ${index + 1}컷"></figure>`).join("")}</div><div class="reader-pagination">${step(-1)}<button class="ghost-button" type="button" data-reader-close>챕터 목록</button>${step(1)}</div>`
      : `<div class="empty">이 챕터에는 이미지가 없습니다.</div>`;
    const go = (delta) => { renderReader(currentChapterIndex + delta); detail.scrollIntoView({ behavior: "smooth", block: "start" }); };
    detail.querySelectorAll("[data-reader-close]").forEach((button) => button.addEventListener("click", () => renderReader(-1)));
    detail.querySelectorAll("[data-chapter-step]").forEach((button) => button.addEventListener("click", () => go(Number(button.dataset.chapterStep))));
    toolbar.querySelector("#readerChapterSelect").addEventListener("change", event => renderReader(Number(event.target.value)));
  }
  const requestedChapter = params.get("chapter");
  const requestedChapterIndex = requestedChapter ? (webtoon.chapters || []).slice().sort((a, b) => Number(a.chapter_number || 0) - Number(b.chapter_number || 0)).findIndex(item => String(item.chapter_number) === String(requestedChapter)) : -1;
  renderReader(requestedChapterIndex);

  function renderChapters(sortDir) {
    currentSortDir = sortDir;
    const sortedChapters = (webtoon.chapters || []).slice().sort((a, b) => {
      const numA = Number(a.chapter_number || 0);
      const numB = Number(b.chapter_number || 0);
      return sortDir === "desc" ? numB - numA : numA - numB;
    });

    const tbody = detail.querySelector(".webtoon-chapter-panel tbody");
    if (!tbody) return;

    tbody.innerHTML = sortedChapters.length ? sortedChapters.map((chapter) => `
      <tr>
        <td><button class="link-button" type="button" data-read-chapter="${UI.escapeHtml(chapter.chapter_number)}">제${UI.escapeHtml(chapter.chapter_number)}화 ${UI.escapeHtml(chapter.chapter_title || "")}</button> <a class="link-button" data-popup-reader href="${UI.escapeHtml(chapterWindowUrl(chapter.chapter_number))}" target="_blank" rel="noopener" title="새 창으로 보기" aria-label="새 창으로 보기"><span class="material-symbols-outlined">open_in_new</span></a></td>
        <td>${chapter.chapter_poster ? `<img class="table-thumb" src="${UI.escapeHtml(chapter.chapter_poster)}" alt="${UI.escapeHtml(chapter.webtoon_chapter_id)}">` : `<span class="muted-text">없음</span>`}</td>
        <td>${chapter.chapter_url ? `<a class="link-button" href="${UI.escapeHtml(chapter.chapter_url)}" target="_blank" rel="noreferrer">열기</a>` : `<span class="muted-text">없음</span>`}</td>
        <td>${UI.escapeHtml(chapter.regdate ? String(chapter.regdate).slice(0, 10) : "-")}</td>
      </tr>
    `).join("") : `<tr><td colspan="4"><div class="empty">등록된 Chapter가 없습니다.</div></td></tr>`;
    tbody.querySelectorAll("[data-read-chapter]").forEach(button => button.addEventListener("click", () => {
      const chapters = (webtoon.chapters || []).slice().sort((a,b)=>Number(a.chapter_number)-Number(b.chapter_number));
      const index = chapters.findIndex(item => String(item.chapter_number) === button.dataset.readChapter);
      renderReader(index < 0 ? 0 : index);
      detail.querySelector("#webtoonReader")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  }

  // Render chapters initially as ascending (Read First)
  renderChapters("asc");

  const sortControls = detail.querySelector("#chapterSortControls");
  if (sortControls) {
    sortControls.addEventListener("click", (event) => {
      const button = event.target.closest("button.pill");
      if (!button) return;

      const sortDir = button.dataset.sortDir;
      if (!sortDir) return;

      // Update active state
      sortControls.querySelectorAll("button.pill").forEach((btn) => {
        btn.classList.toggle("active", btn === button);
      });

      renderChapters(sortDir);
    });
  }

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











