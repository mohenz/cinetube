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
          ${webtoon.url ? `
            <a class="primary-button" href="${UI.escapeHtml(webtoon.url)}" target="_blank" rel="noreferrer"><span class="material-symbols-outlined">open_in_new</span>원문 링크</a>
            <button class="ghost-button" type="button" id="fetchLatestChaptersButton"><span class="material-symbols-outlined">sync</span>최신챕터 가져오기</button>
          ` : ""}
          <a class="ghost-button" href="../admin/webtoons.html?id=${UI.escapeHtml(webtoon.webtoon_id)}"><span class="material-symbols-outlined">edit</span>웹툰 관리</a>
          <a class="ghost-button" href="../admin/webtoon-chapters.html"><span class="material-symbols-outlined">format_list_numbered</span>Chapter 관리</a>
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

  let currentSortDir = "asc";
  let currentChapterIndex = 0;
  let currentPageIndex = 0;

  function renderReader(chapterIndex = currentChapterIndex, pageIndex = currentPageIndex) {
    const chapters = (webtoon.chapters || []).slice().sort((a, b) => Number(a.chapter_number || 0) - Number(b.chapter_number || 0));
    const toolbar = detail.querySelector("#readerToolbar"), reader = detail.querySelector("#webtoonReader");
    if (!chapters.length) { toolbar.innerHTML = ""; reader.innerHTML = `<div class="empty">아직 챕터가 없습니다.</div>`; return; }
    currentChapterIndex = Math.max(0, Math.min(chapterIndex, chapters.length - 1));
    const chapter = chapters[currentChapterIndex];
    const pages = chapter.page_images?.length ? chapter.page_images.map(page => page.url) : (chapter.chapter_poster ? [chapter.chapter_poster] : []);
    currentPageIndex = Math.max(0, Math.min(pageIndex, Math.max(0, pages.length - 1)));
    toolbar.innerHTML = `<label>챕터 <select class="select-control" id="readerChapterSelect">${chapters.map((item,index)=>`<option value="${index}" ${index===currentChapterIndex?"selected":""}>제${UI.escapeHtml(item.chapter_number)}화${item.chapter_title?` · ${UI.escapeHtml(item.chapter_title)}`:""}</option>`).join("")}</select></label><div class="reader-jump"><button class="ghost-button" type="button" data-chapter-jump="first">처음 챕터</button><button class="ghost-button" type="button" data-chapter-jump="last">마지막 챕터</button><button class="ghost-button" type="button" data-page-jump="first">첫 페이지</button><button class="ghost-button" type="button" data-page-jump="last">마지막 페이지</button></div>`;
    reader.innerHTML = pages.length ? `<div class="reader-page-count">제${UI.escapeHtml(chapter.chapter_number)}화 · ${currentPageIndex + 1} / ${pages.length} 페이지</div><img class="reader-image" src="${UI.escapeHtml(pages[currentPageIndex])}" alt="${UI.escapeHtml(webtoon.title)} 제${UI.escapeHtml(chapter.chapter_number)}화 ${currentPageIndex + 1}페이지"><div class="reader-pagination"><button class="ghost-button" type="button" id="readerPrev" ${currentPageIndex===0?"disabled":""}>이전 페이지</button><span>${currentPageIndex + 1} / ${pages.length}</span><button class="ghost-button" type="button" id="readerNext" ${currentPageIndex>=pages.length-1?"disabled":""}>다음 페이지</button></div>` : `<div class="empty">이 챕터에는 이미지가 없습니다.</div>`;
    toolbar.querySelector("#readerChapterSelect").addEventListener("change", event => renderReader(Number(event.target.value), 0));
    toolbar.querySelectorAll("[data-chapter-jump]").forEach(button => button.addEventListener("click", () => renderReader(button.dataset.chapterJump === "first" ? 0 : chapters.length - 1, 0)));
    toolbar.querySelectorAll("[data-page-jump]").forEach(button => button.addEventListener("click", () => renderReader(currentChapterIndex, button.dataset.pageJump === "first" ? 0 : pages.length - 1)));
    reader.querySelector("#readerPrev")?.addEventListener("click", () => renderReader(currentChapterIndex, currentPageIndex - 1));
    reader.querySelector("#readerNext")?.addEventListener("click", () => renderReader(currentChapterIndex, currentPageIndex + 1));
  }
  renderReader();

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
        <td><button class="link-button" type="button" data-read-chapter="${UI.escapeHtml(chapter.chapter_number)}">제${UI.escapeHtml(chapter.chapter_number)}화 ${UI.escapeHtml(chapter.chapter_title || "")}</button></td>
        <td>${chapter.chapter_poster ? `<img class="table-thumb" src="${UI.escapeHtml(chapter.chapter_poster)}" alt="${UI.escapeHtml(chapter.webtoon_chapter_id)}">` : `<span class="muted-text">없음</span>`}</td>
        <td>${chapter.chapter_url ? `<a class="link-button" href="${UI.escapeHtml(chapter.chapter_url)}" target="_blank" rel="noreferrer">열기</a>` : `<span class="muted-text">없음</span>`}</td>
        <td>${UI.escapeHtml(chapter.regdate ? String(chapter.regdate).slice(0, 10) : "-")}</td>
      </tr>
    `).join("") : `<tr><td colspan="4"><div class="empty">등록된 Chapter가 없습니다.</div></td></tr>`;
    tbody.querySelectorAll("[data-read-chapter]").forEach(button => button.addEventListener("click", () => {
      const chapters = (webtoon.chapters || []).slice().sort((a,b)=>Number(a.chapter_number)-Number(b.chapter_number));
      const index = chapters.findIndex(item => String(item.chapter_number) === button.dataset.readChapter);
      renderReader(index < 0 ? 0 : index, 0);
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

  const fetchButton = detail.querySelector("#fetchLatestChaptersButton");
  if (fetchButton) {
    fetchButton.addEventListener("click", async () => {
      if (!webtoon.url) {
        alert("웹툰의 원문 링크(URL) 정보가 없어 최신 챕터를 가져올 수 없습니다.");
        return;
      }
      fetchButton.disabled = true;
      const originalHtml = fetchButton.innerHTML;
      fetchButton.innerHTML = `<span class="material-symbols-outlined">sync</span>가져오는 중...`;

      try {
        const base = window.CINETUBE_LOCAL_API?.url || "";
        if (!base) throw new Error("로컬 API 설정이 필요합니다");

        const params = new URLSearchParams({ url: webtoon.url, site: "auto" });
        const response = await fetch(`${base.replace(/\/$/, "")}/metadata/webtoon?${params.toString()}`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `가져오기 실패: HTTP ${response.status}`);
        }

        const imported = await response.json();
        const pendingChapters = (imported.chapters || []).map((chapter) => ({
          webtoon_chapter_id: chapter.webtoon_chapter_id,
          webtoon_id: webtoon.webtoon_id,
          chapter_number: chapter.chapter_number,
          chapter_url: chapter.chapter_url,
          chapter_poster: chapter.chapter_poster || imported.poster_image || null
        }));

        if (!pendingChapters.length) {
          alert("가져올 챕터 정보가 없습니다.");
          return;
        }

        let updatedData = data;
        const existing = data.webtoonChapters || [];
        let createdCount = 0;
        let updatedCount = 0;

        for (const chapter of pendingChapters) {
          const matched = existing.find((item) => String(item.webtoon_chapter_id) === String(chapter.webtoon_chapter_id));
          if (matched) {
            updatedData = await Store.update("webtoonChapters", matched.id, chapter);
            updatedCount++;
          } else {
            updatedData = await Store.create("webtoonChapters", chapter);
            createdCount++;
          }
        }

        // Update local data caches
        data.webtoonChapters = updatedData.webtoonChapters;
        data.webtoons = updatedData.webtoons;

        // Refresh current webtoon chapters
        const updatedWebtoon = (updatedData.webtoons || []).find((item) => String(item.webtoon_id) === String(webtoon.webtoon_id) || String(item.id) === String(webtoon.id));
        if (updatedWebtoon) {
          webtoon.chapters = updatedWebtoon.chapters;
        }

        // Re-render UI
        renderChapters(currentSortDir);

        alert(`최신 챕터 동기화 완료!\n새로 등록: ${createdCount}건, 업데이트: ${updatedCount}건`);
      } catch (error) {
        console.error("최신 챕터 가져오기 실패:", error);
        alert(`최신 챕터 가져오기 실패: ${error.message}`);
      } finally {
        fetchButton.disabled = false;
        fetchButton.innerHTML = originalHtml;
      }
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











