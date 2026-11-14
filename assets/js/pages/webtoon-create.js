(async function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;
  UI.setupChrome();
  let data = await Store.load();
  UI.setDbStatus(Store.getStatus());
  const params = new URLSearchParams(location.search);
  let webtoon = null;
  const form = document.getElementById("webtoonForm");
  const composer = document.getElementById("chapterComposer");
  const coverInput = document.getElementById("coverFile");
  const coverPicker = document.getElementById("coverPicker");
  const coverPreview = document.getElementById("coverPreview");
  let coverFile = null;
  let chapterFiles = [];
  const slug = (value) => String(value || "webtoon").normalize("NFKD").replace(/[^a-zA-Z0-9가-힣]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "webtoon";
  const id = () => `MY-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
  const chapterId = () => `WTC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  const message = (text) => { const el = document.getElementById("creatorMessage"); if (el) el.textContent = text; };

  function showCover(file) {
    if (!file?.type?.startsWith("image/")) return;
    coverFile = file;
    coverPreview.src = URL.createObjectURL(file);
    coverPreview.hidden = false;
    document.getElementById("coverPlaceholder").hidden = true;
  }
  async function readClipboardImages() {
    if (!navigator.clipboard?.read) return [];
    const items = await navigator.clipboard.read();
    const files = [];
    for (const item of items) {
      const type = item.types.find(value => value.startsWith("image/"));
      if (type) files.push(new File([await item.getType(type)], `clipboard-${Date.now()}-${files.length + 1}.${type.split("/")[1] || "png"}`, { type }));
    }
    return files;
  }
  function pastedImages(event) {
    const direct = [...(event.clipboardData?.files || [])].filter(file => file.type?.startsWith("image/"));
    if (direct.length) return direct;
    return [...(event.clipboardData?.items || [])].filter(item => item.kind === "file" && item.type.startsWith("image/")).map(item => item.getAsFile()).filter(Boolean);
  }
  document.addEventListener("paste", event => {
    const files = pastedImages(event);
    if (!files.length) return;
    event.preventDefault();
    if (!form.hidden) showCover(files[0]);
    else if (!composer.hidden) appendChapterFiles(files);
  }, true);
  coverInput.addEventListener("change", () => showCover(coverInput.files?.[0]));
  document.getElementById("pasteCoverButton").addEventListener("click", async () => { try { const files = await readClipboardImages(); if (!files.length) throw new Error("클립보드에 이미지가 없습니다."); showCover(files[0]); } catch (error) { alert(`표지 붙여넣기 실패: ${error.message} Ctrl+V도 사용할 수 있습니다.`); } });

  // 컷 이미지는 붙여넣는 즉시 업로드하고 챕터에 저장한다. 작업은 큐로 직렬화해 붙여넣은 순서를 유지한다.
  let chapter = null;
  let queue = Promise.resolve();
  const enqueue = (task) => { queue = queue.then(task).catch((error) => message(`저장 실패: ${error.message}`)); return queue; };
  const chaptersOf = () => (data.webtoonChapters || []).filter((item) => String(item.webtoon_id) === String(webtoon.webtoon_id)).sort((a, b) => Number(a.chapter_number) - Number(b.chapter_number));
  const pagesOf = () => ({ urls: (chapter?.page_image_urls || []).slice(), ids: (chapter?.page_image_asset_ids || []).slice() });
  function syncFromData() {
    webtoon = data.webtoons.find((item) => String(item.webtoon_id) === String(webtoon.webtoon_id)) || webtoon;
    if (chapter) chapter = data.webtoonChapters.find((item) => String(item.id) === String(chapter.id)) || null;
  }
  function titleInput() { return composer.querySelector("[name=chapterTitle]"); }

  async function writePages(urls, ids) {
    data = await Store.update("webtoonChapters", chapter.id, { page_image_urls: urls, page_image_asset_ids: ids, chapter_poster: urls[0] || null, chapter_poster_asset_id: ids[0] || null });
    syncFromData();
    renderPreview();
  }
  async function addCut(file) {
    const count = chapter ? pagesOf().urls.length : 0;
    const asset = await Store.uploadMedia({ file, ownerTable: "webtoonChapters", ownerField: "page-images", sortOrder: count });
    if (!chapter) {
      const number = Math.max(0, ...chaptersOf().map((item) => Number(item.chapter_number) || 0)) + 1;
      const payload = { webtoon_chapter_id: chapterId(), webtoon_id: webtoon.webtoon_id, chapter_number: number, chapter_title: titleInput().value.trim() || `제${number}화`, chapter_url: null, chapter_poster: asset.public_url, chapter_poster_asset_id: asset.id, page_image_urls: [asset.public_url], page_image_asset_ids: [asset.id] };
      data = await Store.create("webtoonChapters", payload);
      chapter = data.webtoonChapters.find((item) => item.webtoon_chapter_id === payload.webtoon_chapter_id);
      syncFromData();
    } else {
      const { urls, ids } = pagesOf();
      urls.push(asset.public_url); ids.push(asset.id);
      await writePages(urls, ids);
    }
    await Store.updateMediaOwner([asset.id], chapter.id);
    renderPreview();
    message(`${pagesOf().urls.length}컷 저장됨`);
  }
  function appendChapterFiles(files) {
    const images = [...(files || [])].filter((file) => file?.type?.startsWith("image/"));
    if (!images.length) return;
    message(`${images.length}컷 저장 중...`);
    enqueue(async () => { for (const file of images) await addCut(file); });
  }
  // 이동한 컷이 화면 밖으로 밀려나지 않도록 가운데로 스크롤하고 잠깐 강조한다.
  function revealCut(index, block = "center") {
    const figure = composer.querySelectorAll("#cutPreview figure.cut")[index];
    if (!figure) return;
    const image = figure.querySelector("img");
    const reveal = () => { figure.scrollIntoView({ block, behavior: "smooth" }); figure.classList.add("cut-moved"); setTimeout(() => figure.classList.remove("cut-moved"), 1200); };
    if (image.complete) reveal(); else image.addEventListener("load", reveal, { once: true });
  }
  function moveCut(index, delta) {
    enqueue(async () => {
      const { urls, ids } = pagesOf(); const to = index + delta;
      if (to < 0 || to >= urls.length) return;
      [urls[index], urls[to]] = [urls[to], urls[index]];
      // 자산 id가 컷 수보다 짧은 오래된 챕터에서도 배열이 어긋나지 않게 맞춘다.
      if (ids.length === urls.length) [ids[index], ids[to]] = [ids[to], ids[index]];
      await writePages(urls, ids);
      revealCut(to);
    });
  }
  function deleteCut(index) {
    if (!confirm(`${index + 1}번 컷을 삭제할까요?`)) return;
    enqueue(async () => {
      const { urls, ids } = pagesOf(); const asset = chapter.page_images?.[index]?.asset;
      urls.splice(index, 1); ids.splice(index, 1);
      await writePages(urls, ids);
      if (asset) await Store.deleteMedia(asset).catch(console.warn);
      message("컷을 삭제했습니다.");
    });
  }
  function replaceCut(index) {
    const input = document.createElement("input"); input.type = "file"; input.accept = "image/*";
    input.addEventListener("change", () => {
      const file = input.files?.[0]; if (!file) return;
      enqueue(async () => {
        const { urls, ids } = pagesOf(); const old = chapter.page_images?.[index]?.asset;
        const asset = await Store.uploadMedia({ file, ownerTable: "webtoonChapters", ownerField: "page-images", sortOrder: index });
        urls[index] = asset.public_url; ids[index] = asset.id;
        await writePages(urls, ids);
        await Store.updateMediaOwner([asset.id], chapter.id);
        if (old) await Store.deleteMedia(old).catch(console.warn);
        message(`${index + 1}번 컷을 교체했습니다.`);
      });
    });
    input.click();
  }
  function selectChapter(target) {
    chapter = target || null;
    titleInput().value = chapter?.chapter_title || "";
    renderPreview();
    message(chapter ? `제${chapter.chapter_number}화 편집 중` : "");
  }
  async function deleteChapter(target) {
    if (!confirm(`제${target.chapter_number}화 ${target.chapter_title || ""}를 삭제할까요? 컷 이미지도 함께 삭제됩니다.`)) return;
    const assets = (target.page_images || []).map((page) => page.asset).filter(Boolean);
    data = await Store.remove("webtoonChapters", target.id);
    for (const asset of assets) await Store.deleteMedia(asset).catch(console.warn);
    if (chapter && String(chapter.id) === String(target.id)) chapter = null;
    syncFromData(); selectChapter(chapter);
  }

  let lastPreviewChapter = null, lastPreviewCount = 0;
  function renderPreview() {
    const { urls } = pagesOf();
    const preview = composer.querySelector("#cutPreview");
    composer.querySelector("#previewCount").textContent = chapter ? `제${chapter.chapter_number}화 · ${urls.length}컷` : "";
    composer.querySelector("#chapterStatus").textContent = chapter ? `제${chapter.chapter_number}화 편집 중 (${urls.length}컷, 자동 저장)` : "새 챕터 — 첫 컷을 붙여넣으면 챕터가 만들어집니다.";
    preview.innerHTML = urls.length ? urls.map((url, index) => `<figure class="cut"><img src="${UI.escapeHtml(url)}" alt="${index + 1}번 컷"><figcaption><span>#${index + 1}</span><button type="button" data-cut-up="${index}" ${index === 0 ? "disabled" : ""} title="위로" aria-label="위로">▲</button><button type="button" data-cut-down="${index}" ${index === urls.length - 1 ? "disabled" : ""} title="아래로" aria-label="아래로">▼</button><button type="button" data-cut-replace="${index}">교체</button><button type="button" data-cut-delete="${index}">삭제</button></figcaption></figure>`).join("") : `<div class="empty">컷 이미지를 붙여넣으면 이어 붙은 모습이 여기에 표시됩니다.</div>`;
    const grew = chapter && String(chapter.id) === String(lastPreviewChapter) && urls.length > lastPreviewCount;
    lastPreviewChapter = chapter ? chapter.id : null; lastPreviewCount = urls.length;
    if (grew) {
      const lastImage = preview.querySelector("figure.cut:last-of-type img");
      const reveal = () => lastImage.closest("figure").scrollIntoView({ block: "end", behavior: "smooth" });
      if (lastImage.complete) reveal(); else lastImage.addEventListener("load", reveal, { once: true });
    }
    const list = composer.querySelector("#chapterList"); const chapters = chaptersOf();
    list.innerHTML = `<h3>만든 챕터 (${chapters.length})</h3>${chapters.length ? chapters.map((item) => `<div class="creator-chapter ${chapter && String(chapter.id) === String(item.id) ? "active" : ""}"><span>제${UI.escapeHtml(item.chapter_number)}화 ${UI.escapeHtml(item.chapter_title || "")} · ${(item.page_image_urls || []).length}컷</span><span class="table-actions"><button class="link-button" type="button" data-edit-chapter="${UI.escapeHtml(item.id)}">편집</button><a class="link-button" href="my-webtoon.html?id=${encodeURIComponent(webtoon.webtoon_id)}&chapter=${encodeURIComponent(item.chapter_number)}">보기</a><button class="link-button danger-link" type="button" data-delete-chapter="${UI.escapeHtml(item.id)}">삭제</button></span></div>`).join("") : `<p class="muted-text">아직 저장된 챕터가 없습니다.</p>`}`;
  }
  function renderComposer() {
    chapter = null;
    form.hidden = true; composer.hidden = false;
    composer.closest(".creator-panel")?.classList.add("creator-wide");
    composer.innerHTML = `<div class="creator-current"><p class="eyebrow">현재 작품</p><h2>${UI.escapeHtml(webtoon.title)}</h2><span>${UI.escapeHtml(webtoon.genre || "")}</span><button class="ghost-button" type="button" id="editInfoButton"><span class="material-symbols-outlined">edit</span>작품 정보 수정</button><a class="ghost-button" href="my-webtoon.html?id=${encodeURIComponent(webtoon.webtoon_id)}"><span class="material-symbols-outlined">menu_book</span>작품 보기·관리</a></div>
      <div class="creator-split">
        <div class="creator-left">
          <form id="chapterForm" class="chapter-compose"><label>챕터 제목 (선택)<input class="input-control" name="chapterTitle" maxlength="120" placeholder="제1화"></label><label class="chapter-drop" tabindex="0"><span class="material-symbols-outlined">add_photo_alternate</span><strong>이미지를 선택하거나 여기에 붙여넣기</strong><small>붙여넣는 즉시 저장되며 오른쪽 미리보기에 이어 붙습니다.</small><input id="chapterFiles" type="file" accept="image/*" multiple></label><button class="ghost-button" type="button" id="pasteChapterButton">클립보드에서 이미지 붙여넣기</button><div class="chapter-status"><strong id="chapterStatus"></strong></div><button class="primary-button" type="button" id="finishChapterButton"><span class="material-symbols-outlined">check_circle</span>챕터 완료 · 새 챕터 시작</button><span id="creatorMessage" role="status"></span></form>
          <div class="creator-chapters" id="chapterList"></div>
        </div>
        <aside class="creator-preview" aria-label="연결 미리보기"><h3>연결 미리보기 <small id="previewCount"></small></h3><div id="cutPreview" class="cut-preview"></div></aside>
      </div>`;
    composer.querySelector("#editInfoButton").addEventListener("click", () => {
      form.elements.title.value = webtoon.title || ""; form.elements.genre.value = webtoon.genre || "";
      if (webtoon.poster_image) { coverPreview.src = webtoon.poster_image; coverPreview.hidden = false; document.getElementById("coverPlaceholder").hidden = true; }
      document.getElementById("saveWebtoon").lastChild.textContent = "작품 정보 저장";
      form.hidden = false; composer.hidden = true;
    });
    const input = composer.querySelector("#chapterFiles");
    input.addEventListener("change", () => { appendChapterFiles(input.files); input.value = ""; });
    composer.querySelector("#pasteChapterButton").addEventListener("click", async () => { try { const files = await readClipboardImages(); if (!files.length) throw new Error("클립보드에 이미지가 없습니다."); appendChapterFiles(files); } catch (error) { alert(`챕터 이미지 붙여넣기 실패: ${error.message} Ctrl+V도 사용할 수 있습니다.`); } });
    composer.querySelector("#finishChapterButton").addEventListener("click", () => enqueue(async () => { selectChapter(null); message("새 챕터를 시작합니다. 첫 컷을 붙여넣으세요."); }));
    composer.querySelector("#chapterForm").addEventListener("submit", (event) => event.preventDefault());
    titleInput().addEventListener("change", () => {
      if (!chapter) return;
      enqueue(async () => { data = await Store.update("webtoonChapters", chapter.id, { chapter_title: titleInput().value.trim() || `제${chapter.chapter_number}화` }); syncFromData(); renderPreview(); message("챕터 제목을 저장했습니다."); });
    });
    composer.addEventListener("click", (event) => {
      const t = event.target.closest("button"); if (!t) return;
      const d = t.dataset;
      if (d.cutUp !== undefined) moveCut(Number(d.cutUp), -1);
      else if (d.cutDown !== undefined) moveCut(Number(d.cutDown), 1);
      else if (d.cutReplace !== undefined) replaceCut(Number(d.cutReplace));
      else if (d.cutDelete !== undefined) deleteCut(Number(d.cutDelete));
      else if (d.editChapter !== undefined) selectChapter(chaptersOf().find((item) => String(item.id) === d.editChapter));
      else if (d.deleteChapter !== undefined) enqueue(() => deleteChapter(chaptersOf().find((item) => String(item.id) === d.deleteChapter)));
    });
    renderPreview();
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fields = new FormData(form); const title=fields.get("title").trim(), genre=fields.get("genre").trim();
    try {
      // 마이웹툰 생성은 제목 slug로 기존 카탈로그 작품을 찾아 갱신하지 않습니다.
      // 같은 제목의 외부 작품과 데이터가 섞이지 않도록 전용 ID를 발급합니다.
      const existing = webtoon && String(webtoon.type || "").toLowerCase() === "original" ? webtoon : null;
      let posterImage = existing?.poster_image || null, posterAssetId = existing?.poster_image_asset_id || null;
      let uploadedCoverAssetId = null;
      if (coverFile) { const asset = await Store.uploadMedia({ file: coverFile, ownerTable: "webtoons", ownerField: "poster_image", sortOrder: 0 }); posterImage = asset.public_url; posterAssetId = asset.id; uploadedCoverAssetId = asset.id; }
      const payload={webtoon_id: existing?.webtoon_id || id(), title, genre, type:"original", tage:[], url:null, poster_image:posterImage, poster_image_asset_id:posterAssetId, webtoon_images:existing?.webtoon_images || [], webtoon_image_asset_ids:existing?.webtoon_image_asset_ids || []};
      if(existing){data=await Store.update("webtoons",existing.id,payload); webtoon=data.webtoons.find(item=>item.webtoon_id===payload.webtoon_id);}
      else {data=await Store.create("webtoons",payload); webtoon=data.webtoons.find(item=>item.webtoon_id===payload.webtoon_id);}
      if (uploadedCoverAssetId) await Store.updateMediaOwner([uploadedCoverAssetId], webtoon.id);
      if (uploadedCoverAssetId && existing?.poster_image_asset) await Store.deleteMedia(existing.poster_image_asset).catch(console.warn);
      coverFile = null;
      coverInput.value = "";
      history.replaceState(null,"",`webtoon-create.html?id=${encodeURIComponent(webtoon.webtoon_id)}`); renderComposer();
    } catch(error) { alert(`웹툰을 저장하지 못했습니다: ${error.message}`); }
  });
  const existingId=params.get("id");
  if(existingId){webtoon=data.webtoons.find(item=>String(item.webtoon_id)===existingId); if(webtoon) { form.elements.title.value = webtoon.title || ""; form.elements.genre.value = webtoon.genre || ""; if(webtoon.poster_image){coverPreview.src=webtoon.poster_image;coverPreview.hidden=false;document.getElementById("coverPlaceholder").hidden=true;} renderComposer(); }}
})();
