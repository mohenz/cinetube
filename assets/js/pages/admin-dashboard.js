(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();

  try {
    const data = await Store.load();
    console.log('Admin dashboard data loaded:', data);
    UI.setDbStatus(Store.getStatus());

    const stats = document.getElementById("adminStats");
    if (!stats) return;

    const visibleCategories = (data.categories || []).filter((item) => item.is_visible !== false).length;
    const topGrade = (data.movies || []).filter((movie) => movie.rating_grade === "A+" || movie.rating_grade === "A").length;
    let databaseInfo = null;
    if (Store.databaseMetadata) {
      try {
        databaseInfo = await Store.databaseMetadata();
      } catch (error) {
        console.warn("데이터베이스 사이즈 조회를 건너뜁니다.", error);
      }
    }

    const statItems = [
      ["영화정보", `${(data.movies || []).length}개`, "movie"],
      ["Webtoon 정보", `${(data.webtoons || []).length}개`, "auto_stories"],
      ["Webtoon Chapter", `${(data.webtoonChapters || []).length}개`, "format_list_numbered"],
      ["갤러리", `${(data.galleryImages || []).length}개`, "photo_library"],
      ["전시 카테고리", `${visibleCategories}개`, "category"],
      ["주연배우", `${(data.actors || []).length}명`, "person"],
      ["상위등급 작품", `${topGrade}개`, "grade"]
    ];
    if (databaseInfo?.size_pretty) {
      statItems.push(["DB 사이즈", databaseInfo.size_pretty, "database"]);
    }

    stats.innerHTML = statItems.map(([label, value, icon]) => `
      <article class="stat-card">
        <span class="material-symbols-outlined">${icon}</span>
        <strong>${UI.escapeHtml(value)}</strong>
        <small>${UI.escapeHtml(label)}</small>
      </article>
    `).join("");

    if (!stats.innerHTML.trim()) {
      stats.innerHTML = `<div class="empty">통계 데이터가 없습니다.</div>`;
    }
  } catch (error) {
    console.error('Admin dashboard load error:', error);
    const stats = document.getElementById("adminStats");
    if (stats) {
      stats.innerHTML = `<div class="empty">데이터 로드 실패: ${error.message}</div>`;
    }
  }
})();











