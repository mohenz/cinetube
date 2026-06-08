(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();
  const isAdminDetail = document.body.dataset.adminDetail === "true";

  let data = await Store.load();
  UI.setDbStatus(Store.getStatus());

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code") || "";
  const detail = document.getElementById("movieDetail");
  const codeDisplay = document.getElementById("movieCodeDisplay");
  if (code && Store.loadMovieWithUrls) {
    await Store.loadMovieWithUrls(code);
    data = await Store.load();
  }
  const movie = data.movies.find((item) => String(item.movie_code) === String(code) || String(item.id) === String(code));

  if (codeDisplay) codeDisplay.value = code || "영화정보";

  if (!movie) {
    detail.innerHTML = `
      <div class="empty">
        영화정보를 찾을 수 없습니다.
      </div>`;
    return;
  }

  document.title = `${isAdminDetail ? "CineTube Admin" : "CineTube"} | ${movie.title}`;
  if (codeDisplay) codeDisplay.value = movie.movie_code || "";

  const posterUrl = UI.movieImageUrl(movie, "../assets/img/favicon.svg");
  const captureUrl = movie.capture_url || movie.capture_asset?.public_url || movie.poster_url || movie.poster_asset?.public_url || "";
  const snapshotUrl = movie.snapshot_url || movie.snapshot_asset?.public_url || "";
  const keywords = Array.isArray(movie.keywords) ? movie.keywords : [];
  const movieAssets = [movie.poster_asset, movie.capture_asset, movie.snapshot_asset].filter(Boolean);
  const rottenTomatoesScore = movie.rotten_tomatoes_score;
  const isMainMovie = movie.is_main === true;
  const isFavoriteMovie = UI.isFavoriteMovie(movie);

  detail.innerHTML = `
    <section class="movie-detail">
      <div class="movie-detail-media">
        <img src="${UI.escapeHtml(posterUrl)}" alt="${UI.escapeHtml(movie.title)} 포스터">
      </div>
      <div class="movie-detail-body">
        <p class="eyebrow">Movie Detail</p>
        <h1>${UI.escapeHtml(movie.title)}</h1>
        <div class="movie-badges">
          <span class="rating">${UI.escapeHtml(movie.rating_grade || "-")}</span>
          <span>${UI.escapeHtml(movie.movie_code || "-")}</span>
          <span>${UI.escapeHtml(movie.category_name || "-")}</span>
          ${isAdminDetail ? `<span class="main-display-badge" id="mainDisplayBadge"${isMainMovie ? "" : " hidden"}><span class="material-symbols-outlined">star</span>메인전시</span>` : ""}
        </div>
        <p class="movie-description">${UI.escapeHtml(movie.description || "등록된 주요내용이 없습니다.")}</p>
        <div class="detail-list movie-detail-list">
          <div><span>주연배우</span><a href="actor.html?id=${encodeURIComponent(movie.actor_ids?.[0] || movie.actor_id || '')}"><strong>${UI.escapeHtml(movie.actor_names || movie.actor_name || "-")}</strong></a></div>
          <div><span>영화감독</span><strong>${UI.escapeHtml((movie.director_names || []).join(", ") || "-")}</strong></span></div>
          <div><span>출시년월</span><strong>${UI.escapeHtml(movie.release_month || "-")}</strong></div>
          <div><span>제작사</span><strong>${UI.escapeHtml(movie.production_company || "-")}</strong></div>
          <div><span>추천점수</span><strong>${UI.escapeHtml(movie.recommendation_score || 0)}</strong></div>
          <div><span>루튼 토마토</span><strong>${UI.escapeHtml(rottenTomatoesScore === null || rottenTomatoesScore === undefined ? "-" : `${rottenTomatoesScore}%`)}</strong></div>
          ${isAdminDetail ? `<div><span>메인전시</span><strong id="mainDisplayStatus">${isMainMovie ? "등록됨" : "미등록"}</strong></div>` : ""}
        </div>
        <div class="keyword-row">
          ${keywords.length ? keywords.map((keyword) => `<span>${UI.escapeHtml(keyword)}</span>`).join("") : `<span>키워드 없음</span>`}
        </div>
        <div class="hero-actions">
          <button class="ghost-button favorite-toggle detail-favorite-toggle ${isFavoriteMovie ? "active" : ""}" type="button" id="toggleFavoriteMovie" data-favorite-code="${UI.escapeHtml(movie.movie_code || movie.id || "")}" aria-pressed="${isFavoriteMovie ? "true" : "false"}"><span class="material-symbols-outlined">${isFavoriteMovie ? "favorite" : "favorite_border"}</span><span class="favorite-label">관심작품</span></button>
          ${movie.video_url ? `<a class="primary-button" href="${UI.escapeHtml(movie.video_url)}" target="_blank" rel="noreferrer"><span class="material-symbols-outlined">open_in_new</span>영상 링크</a>` : ""}
          ${movie.source_url ? `<a class="ghost-button" href="${UI.escapeHtml(movie.source_url)}" target="_blank" rel="noreferrer"><span class="material-symbols-outlined">source</span>정보출처</a>` : ""}
          ${isAdminDetail ? `<button class="ghost-button main-action${isMainMovie ? " active" : ""}" type="button" id="toggleMainMovie"><span class="material-symbols-outlined">${isMainMovie ? "star" : "star_border"}</span>${isMainMovie ? "메인전시 해제" : "메인전시 등록"}</button>` : ""}
          <a class="ghost-button" href="../admin/movies.html?code=${UI.escapeHtml(movie.movie_code)}"><span class="material-symbols-outlined">edit</span>영화 관리</a>
          <button class="ghost-button danger-action" type="button" id="deleteMovie"><span class="material-symbols-outlined">delete</span>영화정보 삭제</button>
        </div>
      </div>
    </section>
    <section class="movie-image-strip">
      ${captureUrl ? `<img src="${UI.escapeHtml(captureUrl)}" alt="${UI.escapeHtml(movie.title)} 캡쳐">` : ""}
      ${snapshotUrl ? `<img class="snapshot-preview-image" id="openSnapshotPreview" src="${UI.escapeHtml(snapshotUrl)}" alt="${UI.escapeHtml(movie.title)} 스냅샷" role="button" tabindex="0" data-snapshot-preview="true" aria-label="${UI.escapeHtml(movie.title)} 스냅샷 전체보기">` : ""}
    </section>`;

  // Generate related movies (up to 10) based on actor, category, or production company
  const relatedCandidates = data.movies.filter(m => m.id !== movie.id);
  const related = [];
  while (related.length < 10 && relatedCandidates.length) {
    const mode = Math.random();
    let pool;
    if (mode < 0.33) {
      pool = relatedCandidates.filter(m => m.actor_ids?.some(id => movie.actor_ids?.includes(id)));
    } else if (mode < 0.66) {
      pool = relatedCandidates.filter(m => m.category_code === movie.category_code);
    } else {
      pool = relatedCandidates.filter(m => m.production_company === movie.production_company);
    }
    if (!pool.length) pool = relatedCandidates;
    const idx = Math.floor(Math.random() * pool.length);
    const sel = pool[idx];
    related.push(sel);
    const globalIdx = relatedCandidates.findIndex(m => m.id === sel.id);
    relatedCandidates.splice(globalIdx, 1);
  }
  const relatedHtml = UI.movieSection('연관 영화', '', related);
  detail.insertAdjacentHTML('beforeend', relatedHtml);
  UI.setupMovieCards(detail);
  UI.setupFavoriteButtons(detail);

  const snapshotImage = document.getElementById("openSnapshotPreview");
  if (snapshotImage) {
    const openSnapshotModal = () => {
      const existing = document.getElementById("snapshotModal");
      if (existing) existing.remove();
      const modal = document.createElement("div");
      modal.className = "image-modal";
      modal.id = "snapshotModal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", "스냅샷 전체보기");
      modal.innerHTML = `
        <button class="image-modal-close" type="button" aria-label="닫기"><span class="material-symbols-outlined">close</span></button>
        <img src="${UI.escapeHtml(snapshotUrl)}" alt="${UI.escapeHtml(movie.title)} 스냅샷 전체 이미지">
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
    snapshotImage.addEventListener("click", openSnapshotModal);
    snapshotImage.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openSnapshotModal();
    });
  }

  const mainButton = document.getElementById("toggleMainMovie");
  const mainStatus = document.getElementById("mainDisplayStatus");
  const mainBadge = document.getElementById("mainDisplayBadge");
  if (mainButton) {
    mainButton.addEventListener("click", async () => {
      const nextIsMain = movie.is_main !== true;
      mainButton.disabled = true;
      mainButton.innerHTML = `<span class="material-symbols-outlined">hourglass_empty</span>저장 중`;

      try {
        if (nextIsMain) await Store.clearMainMovies(movie.id);
        await Store.update("movies", movie.id, { is_main: nextIsMain });
        movie.is_main = nextIsMain;
        mainButton.disabled = false;
        mainButton.classList.toggle("active", nextIsMain);
        mainButton.innerHTML = `<span class="material-symbols-outlined">${nextIsMain ? "star" : "star_border"}</span>${nextIsMain ? "메인전시 해제" : "메인전시 등록"}`;
        if (mainStatus) mainStatus.textContent = nextIsMain ? "등록됨" : "미등록";
        if (mainBadge) mainBadge.hidden = !nextIsMain;
      } catch (error) {
        mainButton.disabled = false;
        mainButton.innerHTML = `<span class="material-symbols-outlined">${movie.is_main === true ? "star" : "star_border"}</span>${movie.is_main === true ? "메인전시 해제" : "메인전시 등록"}`;
        alert(`메인전시 저장 실패: ${error.message}`);
      }
    });
  }

  const deleteButton = document.getElementById("deleteMovie");
  if (deleteButton) {
    deleteButton.addEventListener("click", async () => {
      const confirmed = confirm([
        "영화정보를 삭제하시겠습니까?",
        "",
        movie.movie_code || movie.id,
        movie.title || "",
        "",
        "삭제 후 홈 화면으로 이동합니다."
      ].join("\n"));
      if (!confirmed) return;

      deleteButton.disabled = true;
      deleteButton.innerHTML = `<span class="material-symbols-outlined">hourglass_empty</span>삭제 중`;

      try {
        await Store.remove("movies", movie.id);
        for (const asset of movieAssets) await Store.deleteMedia(asset);
        window.location.href = isAdminDetail ? "movies.html" : "../index.html";
      } catch (error) {
        deleteButton.disabled = false;
        deleteButton.innerHTML = `<span class="material-symbols-outlined">delete</span>영화정보 삭제`;
        alert(`삭제 실패: ${error.message}`);
      }
    });
  }
})();











