(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();

  let data = await Store.load();
  UI.setDbStatus(Store.getStatus());

  const table = document.getElementById("myWebtoonTable");
  const searchInput = document.getElementById("searchInput");

  const isMine = (item) => String(item.type || "").toLowerCase() === "original";
  const cover = (item) => item.poster_image || item.poster_image_asset?.public_url || "../assets/img/favicon.svg";

  async function removeWebtoon(webtoon) {
    for (const chapter of (webtoon.chapters || []).slice()) {
      const assets = (chapter.page_images || []).map((page) => page.asset).filter(Boolean);
      if (chapter.chapter_poster_asset && !assets.some((asset) => asset.id === chapter.chapter_poster_asset.id)) assets.push(chapter.chapter_poster_asset);
      data = await Store.remove("webtoonChapters", chapter.id);
      for (const asset of assets) await Store.deleteMedia(asset).catch(console.warn);
    }
    const assets = [webtoon.poster_image_asset, ...(webtoon.webtoon_image_assets || [])].filter(Boolean);
    data = await Store.remove("webtoons", webtoon.id);
    for (const asset of assets) await Store.deleteMedia(asset).catch(console.warn);
  }

  function render() {
    const term = (searchInput?.value || "").trim().toLowerCase();
    const items = (data.webtoons || [])
      .filter(isMine)
      .filter((item) => !term || [item.webtoon_id, item.title, item.genre].join(" ").toLowerCase().includes(term))
      .sort((a, b) => new Date(b.regdate || b.created_at || 0) - new Date(a.regdate || a.created_at || 0));

    table.innerHTML = `
      <div class="section-head"><div><h2>마이웹툰 목록</h2><p>${items.length}개 작품</p></div></div>
      <table>
        <thead><tr><th>표지</th><th>ID</th><th>제목</th><th>장르</th><th>챕터</th><th>등록일</th><th>관리</th></tr></thead>
        <tbody>${items.length ? items.map((item) => {
          const key = encodeURIComponent(item.webtoon_id);
          return `<tr>
            <td><img class="table-thumb" src="${UI.escapeHtml(cover(item))}" alt="${UI.escapeHtml(item.title)} 표지"></td>
            <td>${UI.escapeHtml(item.webtoon_id)}</td>
            <td>${UI.escapeHtml(item.title)}</td>
            <td>${UI.escapeHtml(item.genre || "-")}</td>
            <td>${(item.chapters || []).length}</td>
            <td>${UI.escapeHtml(item.regdate ? String(item.regdate).slice(0, 10) : "-")}</td>
            <td><div class="table-actions">
              <a class="link-button" href="my-webtoon.html?id=${key}">상세</a>
              <a class="link-button" href="webtoon-create.html?id=${key}">이어 만들기·수정</a>
              <button class="link-button danger-link" type="button" data-delete-webtoon="${UI.escapeHtml(item.id)}">삭제</button>
            </div></td>
          </tr>`;
        }).join("") : `<tr><td colspan="7"><div class="empty">만든 웹툰이 없습니다.</div></td></tr>`}</tbody>
      </table>`;
  }

  table.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-webtoon]");
    if (!button) return;
    const webtoon = (data.webtoons || []).find((item) => String(item.id) === button.dataset.deleteWebtoon);
    if (!webtoon || !confirm(`'${webtoon.title}' 작품과 모든 챕터·이미지를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    button.disabled = true;
    try {
      await removeWebtoon(webtoon);
      render();
    } catch (error) {
      alert(`작품 삭제 실패: ${error.message}`);
      button.disabled = false;
    }
  });
  if (searchInput) searchInput.addEventListener("input", render);
  render();
})();
