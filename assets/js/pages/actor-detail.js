(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();

  const data = await Store.load();
  UI.setDbStatus(Store.getStatus());

  const params = new URLSearchParams(window.location.search);
  const actorId = params.get("id") || "";
  const profile = document.getElementById("actorProfile");
  const grid = document.getElementById("catalogGrid");
  const nameDisplay = document.getElementById("actorNameDisplay");
  const actor = data.actors.find((item) => String(item.id) === String(actorId));

  if (!actor) {
    if (nameDisplay) nameDisplay.value = "배우정보 없음";
    profile.innerHTML = `<div class="empty">배우정보를 찾을 수 없습니다.</div>`;
    grid.innerHTML = "";
    return;
  }

  const movies = data.movies.filter((movie) => (movie.actor_ids || [movie.actor_id]).some((id) => String(id) === String(actor.id)));
  const imageUrl = actor.representative_image_url || actor.image_urls?.[0] || "assets/img/favicon.svg";

  document.title = `CineTube | ${actor.name}`;
  if (nameDisplay) nameDisplay.value = actor.name;

  profile.innerHTML = `
    <article class="profile-panel actor-detail-panel">
      <img src="${UI.escapeHtml(imageUrl)}" alt="${UI.escapeHtml(actor.name)} 대표이미지">
      <div>
        <p class="eyebrow">Actor Profile</p>
        <h1>${UI.escapeHtml(actor.name)}</h1>
        <div class="detail-list">
          <div><span>나이</span><strong>${UI.escapeHtml(actor.age ?? "-")}</strong></div>
          <div><span>신장</span><strong>${actor.height_cm ? `${UI.escapeHtml(actor.height_cm)}cm` : "-"}</strong></div>
          <div><span>신체사이즈</span><strong>${UI.escapeHtml(actor.body_size || "-")}</strong></div>
          <div><span>데뷔년도</span><strong>${UI.escapeHtml(actor.debut_year || "-")}</strong></div>
          <div><span>등록 작품</span><strong>${UI.escapeHtml(movies.length)}개</strong></div>
        </div>
      </div>
    </article>`;

  grid.innerHTML = movies.length ? movies.map(UI.movieCard).join("") : `<div class="empty">등록된 출연 작품이 없습니다.</div>`;
  UI.setupMovieCards(grid);
})();
