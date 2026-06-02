(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();

  const data = await Store.load();
  UI.setDbStatus(Store.getStatus());

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code") || "";
  const detail = document.getElementById("movieDetail");
  const codeDisplay = document.getElementById("movieCodeDisplay");
  const movie = data.movies.find((item) => String(item.movie_code) === String(code) || String(item.id) === String(code));

  if (codeDisplay) codeDisplay.value = code || "영화정보";

  if (!movie) {
    detail.innerHTML = `
      <div class="empty">
        영화정보를 찾을 수 없습니다.
      </div>`;
    return;
  }

  document.title = `CineTube | ${movie.title}`;
  if (codeDisplay) codeDisplay.value = movie.movie_code || "";

  const posterUrl = UI.movieImageUrl(movie, "../assets/img/favicon.svg");
  const captureUrl = movie.capture_url || movie.capture_asset?.public_url || movie.poster_url || movie.poster_asset?.public_url || "";
  const snapshotUrl = movie.snapshot_url || movie.snapshot_asset?.public_url || "";
  const keywords = Array.isArray(movie.keywords) ? movie.keywords : [];
  const movieAssets = [movie.poster_asset, movie.capture_asset, movie.snapshot_asset].filter(Boolean);

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
        </div>
        <p class="movie-description">${UI.escapeHtml(movie.description || "등록된 주요내용이 없습니다.")}</p>
        <div class="detail-list movie-detail-list">
          <div><span>주연배우</span><strong>${UI.escapeHtml(movie.actor_names || movie.actor_name || "-")}</strong></div>
          <div><span>영화감독</span><strong>${UI.escapeHtml((movie.director_names || []).join(", ") || "-")}</strong></div>
          <div><span>출시년월</span><strong>${UI.escapeHtml(movie.release_month || "-")}</strong></div>
          <div><span>제작사</span><strong>${UI.escapeHtml(movie.production_company || "-")}</strong></div>
          <div><span>추천점수</span><strong>${UI.escapeHtml(movie.recommendation_score || 0)}</strong></div>
          <div><span>정보출처</span><strong>${movie.source_url ? `<a href="${UI.escapeHtml(movie.source_url)}" target="_blank" rel="noreferrer">열기</a>` : "-"}</strong></div>
        </div>
        <div class="keyword-row">
          ${keywords.length ? keywords.map((keyword) => `<span>${UI.escapeHtml(keyword)}</span>`).join("") : `<span>키워드 없음</span>`}
        </div>
        <div class="hero-actions">
          ${movie.video_url ? `<a class="primary-button" href="${UI.escapeHtml(movie.video_url)}" target="_blank" rel="noreferrer"><span class="material-symbols-outlined">open_in_new</span>영상 링크</a>` : ""}
          ${movie.source_url ? `<a class="ghost-button" href="${UI.escapeHtml(movie.source_url)}" target="_blank" rel="noreferrer"><span class="material-symbols-outlined">source</span>정보출처</a>` : ""}
          <a class="ghost-button" href="../admin/movies.html?code=${UI.escapeHtml(movie.movie_code)}"><span class="material-symbols-outlined">edit</span>영화 관리</a>
          <button class="ghost-button danger-action" type="button" id="deleteMovie"><span class="material-symbols-outlined">delete</span>영화정보 삭제</button>
        </div>
      </div>
    </section>
    <section class="movie-image-strip">
      ${captureUrl ? `<img src="${UI.escapeHtml(captureUrl)}" alt="${UI.escapeHtml(movie.title)} 캡쳐">` : ""}
      ${snapshotUrl ? `<img src="${UI.escapeHtml(snapshotUrl)}" alt="${UI.escapeHtml(movie.title)} 스냅샷">` : ""}
    </section>`;

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
        window.location.href = "../index.html";
      } catch (error) {
        deleteButton.disabled = false;
        deleteButton.innerHTML = `<span class="material-symbols-outlined">delete</span>영화정보 삭제`;
        alert(`삭제 실패: ${error.message}`);
      }
    });
  }
})();
