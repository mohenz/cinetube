(function () {
  const fieldSets = {
    movies: [
      ["title", "영화제목"], ["movie_code", "영화코드"], ["category_code", "카테고리", "category"], ["actor_ids", "주연배우", "actors"], ["director_names", "영화감독", "directors"],
      ["keywords", "키워드(쉼표 구분)"], ["rating_grade", "평가등급", "rating"], ["is_main", "메인전시 여부", "boolean"], ["video_url", "영상링크"], ["source_url", "정보출처 URL"], ["description", "주요내용", "textarea"],
      ["release_month", "출시년월"], ["production_company", "제작사"], ["recommendation_score", "추천점수", "number"], ["rotten_tomatoes_score", "루튼토마토 점수", "number"],
      ["ranking_score", "랭킹점수", "number"], ["click_count", "클릭수", "number"]
    ],
    categories: [
      ["category_code", "카테고리코드"], ["name", "카테고리명"], ["is_visible", "전시여부", "boolean"]
    ],
    actors: [
      ["name", "배우명"], ["age", "나이", "number"], ["height_cm", "신장", "number"], ["body_size", "신체사이즈"], ["debut_year", "데뷔년도", "number"]
    ],
    ratings: [
      ["grade", "평가등급"], ["display_order", "정렬순서", "number"]
    ],
    commonCodes: [
      ["code_group", "코드그룹"], ["code_value", "코드값"], ["code_label", "표시명"], ["display_order", "정렬순서", "number"], ["is_enabled", "사용여부", "boolean"], ["extra", "부가정보 JSON", "textarea"]
    ],
    webtoons: [
      ["webtoon_id", "Webtoon ID"], ["title", "Title"], ["rating", "Rating"], ["alternative", "Alternative"], ["artist", "Artist"], ["genre", "Genre"], ["type", "Type"],
      ["tage", "Tage(쉼표 구분)"], ["url", "URL"], ["regdate", "등록일", "readonly"]
    ],
    webtoonChapters: [
      ["webtoon_chapter_id", "Webtoon Chapter ID"], ["webtoon_id", "Webtoon ID", "webtoon"], ["chapter_number", "Chapter Number", "number"], ["chapter_url", "Chapter URL"], ["regdate", "등록일", "readonly"]
    ],
    galleryImages: [
      ["gallery_image_id", "Gallery ID"], ["title", "제목"], ["description", "설명", "textarea"], ["source", "출처"], ["tags", "태그(쉼표 구분)"], ["is_visible", "전시여부", "boolean"], ["regdate", "등록일", "readonly"]
    ]
  };

  const imageFields = {
    movies: [
      { field: "poster", label: "포스터", urlKey: "poster_url", assetKey: "poster_asset_id" },
      { field: "capture", label: "캡쳐", urlKey: "capture_url", assetKey: "capture_asset_id" },
      { field: "snapshot", label: "스냅샷", urlKey: "snapshot_url", assetKey: "snapshot_asset_id" }
    ],
    categories: [
      { field: "representative", label: "카테고리대표이미지", urlKey: "representative_image_url", assetKey: "representative_image_asset_id" }
    ],
    actors: [
      { field: "representative", label: "대표이미지", urlKey: "representative_image_url", assetKey: "representative_image_asset_id" },
      { field: "gallery_1", label: "일반이미지 1", arrayUrlKey: "image_urls", arrayAssetKey: "image_asset_ids", index: 0 },
      { field: "gallery_2", label: "일반이미지 2", arrayUrlKey: "image_urls", arrayAssetKey: "image_asset_ids", index: 1 },
      { field: "gallery_3", label: "일반이미지 3", arrayUrlKey: "image_urls", arrayAssetKey: "image_asset_ids", index: 2 },
      { field: "gallery_4", label: "일반이미지 4", arrayUrlKey: "image_urls", arrayAssetKey: "image_asset_ids", index: 3 }
    ],
    webtoons: [
      { field: "poster", label: "Poster Image", urlKey: "poster_image", assetKey: "poster_image_asset_id" },
      { field: "webtoon_image_1", label: "Webtoon Image 1", arrayUrlKey: "webtoon_images", arrayAssetKey: "webtoon_image_asset_ids", index: 0 },
      { field: "webtoon_image_2", label: "Webtoon Image 2", arrayUrlKey: "webtoon_images", arrayAssetKey: "webtoon_image_asset_ids", index: 1 },
      { field: "webtoon_image_3", label: "Webtoon Image 3", arrayUrlKey: "webtoon_images", arrayAssetKey: "webtoon_image_asset_ids", index: 2 },
      { field: "webtoon_image_4", label: "Webtoon Image 4", arrayUrlKey: "webtoon_images", arrayAssetKey: "webtoon_image_asset_ids", index: 3 },
      { field: "webtoon_image_5", label: "Webtoon Image 5", arrayUrlKey: "webtoon_images", arrayAssetKey: "webtoon_image_asset_ids", index: 4 },
      { field: "webtoon_image_6", label: "Webtoon Image 6", arrayUrlKey: "webtoon_images", arrayAssetKey: "webtoon_image_asset_ids", index: 5 }
    ],
    webtoonChapters: [
      { field: "chapter_poster", label: "Chapter Poster", urlKey: "chapter_poster", assetKey: "chapter_poster_asset_id" }
    ],
    galleryImages: [
      { field: "image", label: "갤러리 이미지", urlKey: "image_url", assetKey: "image_asset_id" }
    ]
  };

  async function init(kind) {
  try {
    const UI = window.CineTubeUI;
    const Store = window.CineTubeStore;
    UI.setupChrome();

    let data = await Store.load();
    if (kind === "galleryImages" && Store.loadGalleryImagesWithUrls) {
      await Store.loadGalleryImagesWithUrls();
      data = await Store.load();
    }
    if (["movies", "categories", "actors", "webtoons", "webtoonChapters"].includes(kind) && Store.loadMediaAssetsWithUrls) {
      await Store.loadMediaAssetsWithUrls();
      data = await Store.load();
    }
    UI.setDbStatus(Store.getStatus());

    const formHost = document.getElementById("adminForm");
    const tableHost = document.getElementById("adminTable");
    const primaryKey = Store.primaryKeys[kind];
    let editingItem = null;
    let removedAssets = [];
    let pendingWebtoonChapters = [];

    let currentPage = 1;
    let pageSize = "20";

    const searchInput = document.getElementById("searchInput");
    if (searchInput && (kind === "movies" || kind === "actors" || kind === "commonCodes" || kind === "webtoons" || kind === "webtoonChapters" || kind === "galleryImages")) {
      searchInput.addEventListener("input", () => {
        currentPage = 1;
        const actorTableSearch = document.getElementById("actorTableSearch");
        if (kind === "actors" && actorTableSearch && actorTableSearch.value !== searchInput.value) {
          actorTableSearch.value = searchInput.value;
        }
        renderTable();
      });
    }

    function optionList(type) {
      if (type === "category") return data.categories.map((item) => `<option value="${UI.escapeHtml(item.category_code)}">${UI.escapeHtml(item.name)}</option>`).join("");
      if (type === "actor") return data.actors.map((item) => `<option value="${UI.escapeHtml(item.id)}">${UI.escapeHtml(item.name)}</option>`).join("");
      if (type === "rating") return data.ratings.map((item) => `<option value="${UI.escapeHtml(item.grade)}">${UI.escapeHtml(item.grade)}</option>`).join("");
      if (type === "webtoon") return (data.webtoons || []).map((item) => `<option value="${UI.escapeHtml(item.webtoon_id)}">${UI.escapeHtml(item.webtoon_id)} · ${UI.escapeHtml(item.title)}</option>`).join("");
      return "";
    }

    function actorOptions(selectedValue) {
      const selected = String(selectedValue || "");
      return [
        `<option value="">선택 안 함</option>`,
        ...data.actors.map((item) => `<option value="${UI.escapeHtml(item.id)}" ${String(item.id) === selected ? "selected" : ""}>${UI.escapeHtml(item.name)}</option>`)
      ].join("");
    }

    function valueFor(name) {
      if (!editingItem) return "";
      const value = editingItem[name];
      if (Array.isArray(value)) return value.join(", ");
      if (value && typeof value === "object") return JSON.stringify(value, null, 2);
      return value ?? "";
    }

    function inputFor([name, label, type]) {
      const disabled = editingItem && name === primaryKey ? "disabled" : "";
      const value = UI.escapeHtml(valueFor(name));
      if (type === "textarea") return `<label>${label}<textarea class="input-control" name="${name}" rows="4">${value}</textarea></label>`;
      if (type === "readonly") return `<label>${label}<input class="input-control" name="${name}" type="text" value="${value}" readonly></label>`;
      if (type === "boolean") {
        const current = String(valueFor(name) === false ? "false" : "true");
        const trueLabel = name === "is_enabled" ? "사용" : "전시";
        const falseLabel = name === "is_enabled" ? "미사용" : "미전시";
        if (name === "is_main") {
          return `<label class="toggle-field">${label}
            <input type="hidden" name="${name}" value="${current}">
            <span class="toggle-buttons" role="group" aria-label="${label}">
              <button class="toggle-button ${current === "true" ? "active" : ""}" type="button" data-toggle-name="${name}" data-toggle-value="true" aria-pressed="${current === "true"}">${trueLabel}</button>
              <button class="toggle-button ${current === "false" ? "active" : ""}" type="button" data-toggle-name="${name}" data-toggle-value="false" aria-pressed="${current === "false"}">${falseLabel}</button>
            </span>
          </label>`;
        }
        return `<label>${label}<select class="select-control" name="${name}"><option value="true" ${current === "true" ? "selected" : ""}>${trueLabel}</option><option value="false" ${current === "false" ? "selected" : ""}>${falseLabel}</option></select></label>`;
      }
      if (type === "category" || type === "actor" || type === "rating" || type === "webtoon") {
        return `<label>${label}<select class="select-control" name="${name}">${optionList(type)}</select></label>`;
      }
      if (type === "actors") {
        const actorIds = editingItem
          ? (Array.isArray(editingItem.actor_ids) && editingItem.actor_ids.length ? editingItem.actor_ids : [editingItem.actor_id]).filter(Boolean).slice(0, 4)
          : [];
        return Array.from({ length: 4 }, (_, index) => `
          <label class="actor-picker-label">${label} ${index + 1}
            <div class="actor-picker">
              <select class="select-control" name="actor_ids_${index}" aria-label="${label} ${index + 1} 목록 선택">${actorOptions(actorIds[index])}</select>
              <input class="input-control" name="actor_names_${index}" type="text" placeholder="직접입력">
            </div>
          </label>
        `).join("");
      }
      if (type === "directors") {
        const directors = editingItem && Array.isArray(editingItem.director_names) ? editingItem.director_names : [];
        return Array.from({ length: 2 }, (_, index) => `
          <label>${label} ${index + 1}<input class="input-control" name="director_names_${index}" type="text" value="${UI.escapeHtml(directors[index] || "")}"></label>
        `).join("");
      }
      return `<label>${label}<input class="input-control" name="${name}" type="${type || "text"}" value="${value}" ${disabled}></label>`;
    }

    function imageValue(item, config) {
      if (!item) return { url: "", assetId: "", objectPath: "" };
      const url = config.arrayUrlKey ? (item[config.arrayUrlKey] || [])[config.index] : item[config.urlKey];
      const assetId = config.arrayAssetKey ? (item[config.arrayAssetKey] || [])[config.index] : item[config.assetKey];
      const asset = getAsset(assetId);
      return {
        url: url || asset?.public_url || "",
        assetId: assetId || "",
        objectPath: asset?.object_path || "",
        bucketId: asset?.bucket_id || ""
      };
    }

    function getAsset(assetId) {
      if (!assetId) return null;
      return (data.mediaAssets || []).find((asset) => String(asset.id) === String(assetId)) || null;
    }

    function imageSlot(config) {
      const value = imageValue(editingItem, config);
      const name = config.field;
      return `
        <div class="image-field" data-image-field="${UI.escapeHtml(name)}" data-original-asset-id="${UI.escapeHtml(value.assetId)}" data-original-object-path="${UI.escapeHtml(value.objectPath)}" data-original-bucket-id="${UI.escapeHtml(value.bucketId)}">
          <div class="image-field-head">
            <strong>${UI.escapeHtml(config.label)}</strong>
          </div>
          <div class="image-preview ${value.url ? "has-image" : ""}">
            ${value.url ? `<img src="${UI.escapeHtml(value.url)}" alt="${UI.escapeHtml(config.label)} 미리보기">` : `<span>이미지 없음</span>`}
          </div>
          <input class="image-input" type="file" name="file_${UI.escapeHtml(name)}" accept="image/*">
          ${kind === "galleryImages" && name === "image" ? `<p class="form-note">이 영역을 선택한 뒤 Ctrl+V로 클립보드 이미지를 붙여넣을 수 있습니다.</p>` : ""}
          <input type="hidden" name="url_${UI.escapeHtml(name)}" value="${UI.escapeHtml(value.url)}">
          <input type="hidden" name="asset_${UI.escapeHtml(name)}" value="${UI.escapeHtml(value.assetId)}">
        </div>`;
    }

    function renderImageFields() {
      const fields = imageFields[kind] || [];
      if (!fields.length) return "";
      return `
        <fieldset class="image-fieldset">
          <legend>이미지 관리</legend>
          <div class="image-grid">${fields.map(imageSlot).join("")}</div>
        </fieldset>`;
    }

    function renderImageActionButtons() {
      const fields = imageFields[kind] || [];
      return fields.map((config) => `
        <button class="ghost-button image-clear-form" type="button" data-target-image-field="${UI.escapeHtml(config.field)}">
          <span class="material-symbols-outlined">delete</span>${UI.escapeHtml(config.label)} 삭제
        </button>
      `).join("");
    }

    function renderMovieImportPanel() {
      if (kind !== "movies") return "";
      const value = editingItem?.source_url || "";
      const sites = importSiteCodes();
      const defaultSite = sites[0]?.code_value || "auto";
      return `
        <fieldset class="image-fieldset tmdb-import-panel">
          <legend>URL / 작품번호 가져오기</legend>
          <label>URL 또는 작품번호
            <input class="input-control" id="movieImportInput" type="text" value="${UI.escapeHtml(value)}" placeholder="영화소스등록">
          </label>
          <div class="import-site-field">
            <span class="import-site-label">가져오기 대상</span>
            <input type="hidden" id="movieImportSite" value="${UI.escapeHtml(defaultSite)}">
            <div class="import-site-buttons" role="group" aria-label="가져오기 대상">
              ${sites.map((site, index) => `
                <button class="import-site-button ${index === 0 ? "active" : ""}" type="button" data-import-site="${UI.escapeHtml(site.code_value)}" aria-pressed="${index === 0 ? "true" : "false"}">${UI.escapeHtml(site.code_label)}</button>
              `).join("")}
            </div>
          </div>
          <div class="form-actions">
            <button class="ghost-button" id="movieImportButton" type="button">
              <span class="material-symbols-outlined">download</span>가져오기
            </button>
            <span class="tmdb-import-status" id="movieImportStatus"></span>
          </div>
        </fieldset>`;
    }

    function importSiteCodes() {
      const sites = (data.commonCodes || [])
        .filter((item) => item.code_group === "import_site" && item.is_enabled !== false)
        .sort((a, b) => Number(a.display_order ?? 99) - Number(b.display_order ?? 99));
      if (sites.length) return sites;
      return [
        { code_value: "auto", code_label: "자동 인식", display_order: 0 },
        { code_value: "tmdb", code_label: "TMDB", display_order: 10 },
        { code_value: "javtiful", code_label: "Javtiful", display_order: 20 },
        { code_value: "supjav", code_label: "Supjav", display_order: 30 },
        { code_value: "missav", code_label: "123AV", display_order: 40 }
      ];
    }

    function webtoonImportSiteCodes() {
      const defaults = [
        { code_value: "auto", code_label: "자동 인식", display_order: 0 },
        { code_value: "mangadistrict", code_label: "MangaDistrict", display_order: 10 },
        { code_value: "mangadna", code_label: "MangaDNA", display_order: 15 },
        { code_value: "hentai18", code_label: "Hentai18", display_order: 20 },
        { code_value: "imhentai", code_label: "IMHentai", display_order: 30 }
      ];
      const sites = (data.commonCodes || [])
        .filter((item) => item.code_group === "webtoon_import_site" && item.is_enabled !== false)
        .sort((a, b) => Number(a.display_order ?? 99) - Number(b.display_order ?? 99));
      const merged = [...sites];
      defaults.forEach((site) => {
        if (!merged.some((item) => item.code_value === site.code_value)) merged.push(site);
      });
      return merged.sort((a, b) => Number(a.display_order ?? 99) - Number(b.display_order ?? 99));
    }

    function renderActorImportPanel() {
      if (kind !== "actors") return "";
      const nameValue = editingItem?.name || "";
      return `
        <fieldset class="image-fieldset tmdb-import-panel">
          <legend>배우 URL 가져오기</legend>
          <label>배우명
            <input class="input-control" id="actorImportName" type="text" value="${UI.escapeHtml(nameValue)}" placeholder="예: Honjou Suzu">
          </label>
          <label>참고 URL
            <input class="input-control" id="actorImportUrl" type="url" placeholder="https://www.avdbs.com/menu/actor.php?actor_idx=4004">
          </label>
          <div class="form-actions">
            <button class="ghost-button" id="actorImportButton" type="button">
              <span class="material-symbols-outlined">person_search</span>배우정보 조회
            </button>
            <span class="tmdb-import-status" id="actorImportStatus"></span>
          </div>
        </fieldset>`;
    }

    function renderWebtoonImportPanel() {
      if (kind !== "webtoons") return "";
      const value = editingItem?.url || "";
      const sites = webtoonImportSiteCodes();
      const defaultSite = sites[0]?.code_value || "auto";
      return `
        <fieldset class="image-fieldset tmdb-import-panel">
          <legend>Webtoon URL 가져오기</legend>
          <label>참조사이트 URL
            <input class="input-control" id="webtoonImportInput" type="url" value="${UI.escapeHtml(value)}" placeholder="https://mangadistrict.com/series/... 또는 https://mangadna.com/manga/... 또는 https://hentai18.net/read-hentai/...">
          </label>
          <div class="import-site-field">
            <span class="import-site-label">가져오기 대상</span>
            <input type="hidden" id="webtoonImportSite" value="${UI.escapeHtml(defaultSite)}">
            <div class="import-site-buttons" role="group" aria-label="Webtoon 가져오기 대상">
              ${sites.map((site, index) => `
                <button class="import-site-button ${index === 0 ? "active" : ""}" type="button" data-import-site="${UI.escapeHtml(site.code_value)}" aria-pressed="${index === 0 ? "true" : "false"}">${UI.escapeHtml(site.code_label)}</button>
              `).join("")}
            </div>
          </div>
          <div class="form-actions">
            <button class="ghost-button" id="webtoonImportButton" type="button">
              <span class="material-symbols-outlined">download</span>가져오기
            </button>
            <span class="tmdb-import-status" id="webtoonImportStatus"></span>
          </div>
        </fieldset>`;
    }

    function bindMovieImportSiteButtons(form) {
      if (kind !== "movies") return;
      const valueInput = form.querySelector("#movieImportSite");
      const buttons = Array.from(form.querySelectorAll(".import-site-button"));
      if (!valueInput || !buttons.length) return;

      function setActiveSite(site) {
        valueInput.value = site;
        buttons.forEach((button) => {
          const isActive = button.dataset.importSite === site;
          button.classList.toggle("active", isActive);
          button.setAttribute("aria-pressed", String(isActive));
        });
      }

      buttons.forEach((button) => {
        button.addEventListener("click", () => setActiveSite(button.dataset.importSite || "auto"));
      });
      setActiveSite(valueInput.value || "auto");
    }

    function bindWebtoonImportSiteButtons(form) {
      if (kind !== "webtoons") return;
      const valueInput = form.querySelector("#webtoonImportSite");
      const buttons = Array.from(form.querySelectorAll(".import-site-button"));
      if (!valueInput || !buttons.length) return;

      function setActiveSite(site) {
        valueInput.value = site;
        buttons.forEach((button) => {
          const isActive = button.dataset.importSite === site;
          button.classList.toggle("active", isActive);
          button.setAttribute("aria-pressed", String(isActive));
        });
      }

      buttons.forEach((button) => {
        button.addEventListener("click", () => setActiveSite(button.dataset.importSite || "auto"));
      });
      setActiveSite(valueInput.value || "auto");
    }

    async function ensureActorByName(name) {
      const normalized = String(name || "").trim();
      if (!normalized) return null;
      let actor = data.actors.find((item) => String(item.name || "").trim().toLowerCase() === normalized.toLowerCase());
      if (actor) return actor;
      data = await Store.create("actors", {
        name: normalized,
        age: 0,
        height_cm: 0,
        body_size: "",
        debut_year: 0,
        representative_image_url: null,
        representative_image_asset_id: null,
        image_urls: [],
        image_asset_ids: []
      });
      return data.actors.find((item) => String(item.name || "").trim().toLowerCase() === normalized.toLowerCase()) || null;
    }

    async function normalize(formData) {
      const payload = Object.fromEntries(formData.entries());
      Object.keys(payload).forEach((key) => {
        if (key.startsWith("file_") || key.startsWith("url_") || key.startsWith("asset_")) delete payload[key];
      });

      if (kind === "movies") {
        const actorIds = [];
        for (const index of [0, 1, 2, 3]) {
          const typedName = (payload[`actor_names_${index}`] || "").trim();
          const typedActor = typedName ? await ensureActorByName(typedName) : null;
          const actorId = typedActor?.id || payload[`actor_ids_${index}`];
          const numericId = Number(actorId);
          if (Number.isFinite(numericId) && !actorIds.includes(numericId)) actorIds.push(numericId);
        }
        payload.actor_ids = actorIds.slice(0, 4);
        [0, 1, 2, 3].forEach((index) => {
          delete payload[`actor_ids_${index}`];
          delete payload[`actor_names_${index}`];
        });
        payload.actor_id = payload.actor_ids[0] || null;
        payload.director_names = [0, 1]
          .map((index) => (payload[`director_names_${index}`] || "").trim())
          .filter(Boolean)
          .slice(0, 2);
        [0, 1].forEach((index) => delete payload[`director_names_${index}`]);
        payload.source_url = payload.source_url || null;
        payload.keywords = payload.keywords ? payload.keywords.split(",").map((item) => item.trim()).filter(Boolean) : [];
        payload.recommendation_score = Number(payload.recommendation_score || 0);
        payload.rotten_tomatoes_score = payload.rotten_tomatoes_score === "" ? null : Number(payload.rotten_tomatoes_score || 0);
        payload.ranking_score = Number(payload.ranking_score || 0);
        payload.click_count = Number(payload.click_count || 0);
        payload.is_main = payload.is_main === "true";
      }
      if (kind === "categories") payload.is_visible = payload.is_visible === "true";
      if (kind === "actors") {
        payload.age = Number(payload.age || 0);
        payload.height_cm = Number(payload.height_cm || 0);
        payload.debut_year = Number(payload.debut_year || 0);
        payload.image_urls = [];
        payload.image_asset_ids = [];
      }
      if (kind === "ratings") payload.display_order = Number(payload.display_order || 99);
      if (kind === "commonCodes") {
        payload.display_order = Number(payload.display_order || 99);
        payload.is_enabled = payload.is_enabled === "true";
        try {
          payload.extra = payload.extra ? JSON.parse(payload.extra) : {};
        } catch (error) {
          throw new Error("부가정보 JSON 형식이 올바르지 않습니다.");
        }
      }
      if (kind === "webtoons") {
        payload.tage = payload.tage ? payload.tage.split(",").map((item) => item.trim()).filter(Boolean) : [];
        payload.webtoon_images = [];
        payload.webtoon_image_asset_ids = [];
        delete payload.regdate;
      }
      if (kind === "webtoonChapters") {
        payload.chapter_number = Number(payload.chapter_number || 0);
        delete payload.regdate;
      }
      if (kind === "galleryImages") {
        payload.tags = payload.tags ? payload.tags.split(",").map((item) => item.trim()).filter(Boolean) : [];
        payload.is_visible = payload.is_visible === "true";
        delete payload.regdate;
      }
      return payload;
    }

    function compactSlug(value) {
      return String(value || "")
        .replace(/\.[^.]+$/, "")
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9가-힣]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
    }

    function galleryAutoId(seed = "") {
      const now = new Date();
      const stamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0")
      ].join("");
      const suffix = compactSlug(seed).slice(0, 28) || Math.random().toString(36).slice(2, 8);
      return `GAL-${stamp}-${suffix}`.toUpperCase();
    }

    function galleryTitleFromFile(fileName = "") {
      const base = String(fileName || "").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
      return base || `Gallery ${new Date().toISOString().slice(0, 10)}`;
    }

    function galleryImageInput(form) {
      return form?.querySelector('[data-image-field="image"] .image-input') || null;
    }

    function imageFileFromClipboard(event) {
      const items = event.clipboardData?.items || [];
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          return item.getAsFile();
        }
      }
      return null;
    }

    function setFileInputFile(input, file, source = "file-upload") {
      if (!input || !file) return false;
      const transfer = new DataTransfer();
      const fileName = file.name && file.name !== "image.png"
        ? file.name
        : `clipboard-gallery-${Date.now()}.${(file.type.split("/")[1] || "png").replace("jpeg", "jpg")}`;
      const normalizedFile = new File([file], fileName, { type: file.type || "image/png" });
      transfer.items.add(normalizedFile);
      input.dataset.galleryInputSource = source;
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    function galleryHasImage(form) {
      const input = galleryImageInput(form);
      const slot = form?.querySelector('[data-image-field="image"]');
      const urlValue = slot?.querySelector('[name="url_image"]')?.value;
      const assetValue = slot?.querySelector('[name="asset_image"]')?.value;
      return Boolean(input?.files?.[0] || urlValue || assetValue);
    }

    function autofillGalleryFields(form, file) {
      if (kind !== "galleryImages" || !form || editingItem) return;
      const fileName = file?.name || "";
      const values = {
        gallery_image_id: galleryAutoId(fileName),
        title: galleryTitleFromFile(fileName),
        source: galleryImageInput(form)?.dataset.galleryInputSource || (fileName ? "file-upload" : "clipboard"),
        tags: "gallery",
        description: fileName ? `이미지 파일 ${fileName}` : "클립보드에서 붙여넣은 이미지"
      };
      Object.entries(values).forEach(([name, value]) => {
        const field = form.querySelector(`[name="${name}"]`);
        if (field && !field.value.trim()) field.value = value;
      });
    }

    function applyGalleryDefaults(payload, form) {
      if (kind !== "galleryImages") return;
      const file = galleryImageInput(form)?.files?.[0] || null;
      if (!galleryHasImage(form)) throw new Error("갤러리 이미지를 선택하거나 붙여넣어 주세요.");
      if (!payload.gallery_image_id) payload.gallery_image_id = galleryAutoId(file?.name || payload.title);
      if (!payload.title) payload.title = galleryTitleFromFile(file?.name);
      if (!payload.source) payload.source = file?.name ? "file-upload" : "clipboard";
      if (!payload.description) payload.description = file?.name ? `이미지 파일 ${file.name}` : "클립보드에서 붙여넣은 이미지";
      if (!payload.tags || !payload.tags.length) payload.tags = ["gallery"];
      payload.is_visible = payload.is_visible !== false;
    }

    function ownerField(config) {
      return config.arrayUrlKey ? `${kind}_${config.field}` : config.field;
    }

    async function applyImagePayload(payload, form) {
      const uploadedAssetIds = [];
      const fields = imageFields[kind] || [];

      for (const config of fields) {
        const slot = form.querySelector(`[data-image-field="${config.field}"]`);
        const file = slot.querySelector(".image-input").files[0];
        const urlValue = slot.querySelector(`[name="url_${config.field}"]`).value;
        const assetValue = slot.querySelector(`[name="asset_${config.field}"]`).value;

        if (file) {
          addRemovedAssetFromSlot(slot);
          const media = await Store.uploadMedia({
            file,
            ownerTable: kind,
            ownerField: ownerField(config),
            sortOrder: config.index || 0
          });
          uploadedAssetIds.push(media.id);
          setImagePayloadValue(payload, config, media.public_url, media.id);
          continue;
        }
        if (!assetValue && /^https?:\/\//i.test(urlValue) && Store.importMediaUrl) {
          const media = await Store.importMediaUrl({
            url: urlValue,
            ownerTable: kind,
            ownerField: ownerField(config),
            sortOrder: config.index || 0
          });
          if (media) {
            setImagePayloadValue(payload, config, media.public_url, media.id);
            continue;
          }
        }
        setImagePayloadValue(payload, config, urlValue, assetValue);
      }

      return uploadedAssetIds;
    }

    function setImagePayloadValue(payload, config, url, assetId) {
      if (config.arrayUrlKey) {
        payload[config.arrayUrlKey][config.index] = url || "";
        payload[config.arrayAssetKey][config.index] = assetId || null;
        return;
      }
      payload[config.urlKey] = url || null;
      payload[config.assetKey] = assetId || null;
    }

    function compactActorImages(payload) {
      if (kind !== "actors") return;
      const compacted = payload.image_urls
        .map((url, index) => ({ url, assetId: payload.image_asset_ids[index] }))
        .filter((item) => item.url || item.assetId);
      payload.image_urls = compacted.map((item) => item.url);
      payload.image_asset_ids = compacted.map((item) => item.assetId).filter(Boolean);
    }

    function compactWebtoonImages(payload) {
      if (kind !== "webtoons") return;
      const compacted = payload.webtoon_images
        .map((url, index) => ({ url, assetId: payload.webtoon_image_asset_ids[index] }))
        .filter((item) => item.url || item.assetId);
      payload.webtoon_images = compacted.map((item) => item.url);
      payload.webtoon_image_asset_ids = compacted.map((item) => item.assetId).filter(Boolean);
    }

    async function syncPendingWebtoonChapters(webtoonId) {
      if (kind !== "webtoons" || !pendingWebtoonChapters.length || !webtoonId) return;
      const existing = data.webtoonChapters || [];
      for (const chapter of pendingWebtoonChapters) {
        const payload = { ...chapter, webtoon_id: webtoonId };
        const matched = existing.find((item) => String(item.webtoon_chapter_id) === String(payload.webtoon_chapter_id));
        if (matched) {
          data = await Store.update("webtoonChapters", matched.id, payload);
        } else {
          data = await Store.create("webtoonChapters", payload);
        }
      }
      pendingWebtoonChapters = [];
    }

    function localApiBase() {
      const config = window.CINETUBE_LOCAL_API || {};
      return String(config.url || "").replace(/\/$/, "");
    }

    function setFieldValue(form, name, value) {
      const field = form.querySelector(`[name="${name}"]`);
      if (!field) return;
      field.value = value ?? "";
      if (field.type === "hidden") {
        updateToggleButtons(form, name, field.value);
        field.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    function updateToggleButtons(form, name, value) {
      const current = String(value);
      form.querySelectorAll(`[data-toggle-name="${name}"]`).forEach((button) => {
        const isActive = button.dataset.toggleValue === current;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    }

    function bindToggleButtons(form) {
      form.querySelectorAll("[data-toggle-name]").forEach((button) => {
        button.addEventListener("click", () => {
          const name = button.dataset.toggleName;
          const value = button.dataset.toggleValue;
          const field = form.querySelector(`input[type="hidden"][name="${name}"]`);
          if (!field) return;
          field.value = value;
          updateToggleButtons(form, name, value);
          field.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });
    }

    function appendSelectOption(select, value, label) {
      if (!select || !value) return;
      const exists = Array.from(select.options).some((option) => String(option.value) === String(value));
      if (!exists) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label || value;
        select.appendChild(option);
      }
    }

    function setImageSlotUrl(form, field, url, label) {
      const slot = form.querySelector(`[data-image-field="${field}"]`);
      if (!slot) return;
      const preview = slot.querySelector(".image-preview");
      const fileInput = slot.querySelector(".image-input");
      const urlInput = slot.querySelector(`input[name="url_${field}"]`);
      const assetInput = slot.querySelector(`input[name="asset_${field}"]`);
      if (fileInput) fileInput.value = "";
      if (urlInput) urlInput.value = url || "";
      if (assetInput) assetInput.value = "";
      if (!preview) return;
      if (url) {
        preview.classList.add("has-image");
        preview.innerHTML = `<img src="${UI.escapeHtml(url)}" alt="${UI.escapeHtml(label)} 미리보기">`;
      } else {
        preview.classList.remove("has-image");
        preview.innerHTML = "<span>이미지 없음</span>";
      }
    }

    async function ensureImportCategory(imported, form) {
      const code = imported.category_code;
      if (!code) return "";
      let category = data.categories.find((item) => String(item.category_code) === String(code));
      if (!category) {
        data = await Store.create("categories", {
          category_code: code,
          name: imported.category_name || code,
          representative_image_url: imported.capture_url || imported.poster_url || null,
          representative_image_asset_id: null,
          is_visible: true
        });
        category = data.categories.find((item) => String(item.category_code) === String(code));
      }
      const select = form.querySelector('[name="category_code"]');
      appendSelectOption(select, category?.category_code || code, category?.name || imported.category_name || code);
      return category?.category_code || code;
    }

    async function ensureImportActors(imported, form) {
      const profiles = (imported.actor_profiles || []).slice(0, 4);
      const selectedIds = [];
      for (const profile of profiles) {
        const name = (profile.name || "").trim();
        if (!name) continue;
        let actor = data.actors.find((item) => String(item.name).toLowerCase() === name.toLowerCase());
        if (!actor) {
          data = await Store.create("actors", {
            name,
            age: 0,
            height_cm: 0,
            body_size: "",
            debut_year: 0,
            representative_image_url: profile.profile_url || null,
            representative_image_asset_id: null,
            image_urls: [],
            image_asset_ids: []
          });
          actor = data.actors.find((item) => String(item.name).toLowerCase() === name.toLowerCase());
        }
        if (actor?.id && !selectedIds.includes(actor.id)) selectedIds.push(actor.id);
      }
      [0, 1, 2, 3].forEach((index) => {
        const select = form.querySelector(`[name="actor_ids_${index}"]`);
        data.actors.forEach((actor) => appendSelectOption(select, actor.id, actor.name));
        select.value = selectedIds[index] || "";
      });
      return selectedIds;
    }

    async function fetchMovieImport(value, site) {
      const base = localApiBase();
      if (!base) throw new Error("로컬 API 설정이 필요합니다");
      const params = new URLSearchParams({ url: value, site: site || "auto" });
      const response = await fetch(`${base}/metadata/import?${params.toString()}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `가져오기 실패: HTTP ${response.status}`);
      }
      return await response.json();
    }

    async function fetchActorImport(name, url) {
      const base = localApiBase();
      if (!base) throw new Error("로컬 API 설정이 필요합니다");
      const params = new URLSearchParams({ name: name || "", url });
      const response = await fetch(`${base}/metadata/actor?${params.toString()}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `조회 실패: HTTP ${response.status}`);
      }
      return await response.json();
    }

    async function fetchWebtoonImport(url, site) {
      const base = localApiBase();
      if (!base) throw new Error("로컬 API 설정이 필요합니다");
      const params = new URLSearchParams({ url, site: site || "auto" });
      const response = await fetch(`${base}/metadata/webtoon?${params.toString()}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `가져오기 실패: HTTP ${response.status}`);
      }
      return await response.json();
    }

    async function applyMovieImport(form, imported) {
      const categoryCode = await ensureImportCategory(imported, form);
      await ensureImportActors(imported, form);

      setFieldValue(form, "title", imported.title);
      setFieldValue(form, "movie_code", imported.movie_code);
      setFieldValue(form, "category_code", categoryCode);
      setFieldValue(form, "keywords", (imported.keywords || []).join(", "));
      setFieldValue(form, "rating_grade", imported.rating_grade || "A");
      setFieldValue(form, "is_main", imported.is_main ? "true" : "false");
      setFieldValue(form, "video_url", imported.video_url);
      setFieldValue(form, "source_url", imported.source_url);
      setFieldValue(form, "description", imported.description);
      setFieldValue(form, "release_month", imported.release_month);
      setFieldValue(form, "production_company", imported.production_company);
      setFieldValue(form, "recommendation_score", imported.recommendation_score);
      setFieldValue(form, "rotten_tomatoes_score", imported.rotten_tomatoes_score ?? "");
      setFieldValue(form, "ranking_score", imported.ranking_score);
      setFieldValue(form, "click_count", 0);
      [0, 1].forEach((index) => setFieldValue(form, `director_names_${index}`, imported.director_names?.[index] || ""));

      setImageSlotUrl(form, "poster", imported.poster_url, "포스터");
      setImageSlotUrl(form, "capture", imported.capture_url, "캡쳐");
      setImageSlotUrl(form, "snapshot", imported.snapshot_url, "스냅샷");
    }

    function bindMovieImport(form) {
      if (kind !== "movies") return;
      const input = document.getElementById("movieImportInput");
      const siteSelect = document.getElementById("movieImportSite");
      const button = document.getElementById("movieImportButton");
      const status = document.getElementById("movieImportStatus");
      if (!input || !button) return;

      button.addEventListener("click", async () => {
        const value = input.value.trim();
        if (!value) {
          alert("URL 또는 작품번호를 입력해 주세요.");
          return;
        }
        button.disabled = true;
        if (status) status.textContent = "조회 중...";
        try {
          const imported = await fetchMovieImport(value, siteSelect?.value || "auto");
          await applyMovieImport(form, imported);
          UI.setDbStatus(Store.getStatus());
          if (status) status.textContent = "가져오기 완료";
        } catch (error) {
          if (status) status.textContent = "가져오기 실패";
          alert(`가져오기 실패: ${error.message}`);
        } finally {
          button.disabled = false;
        }
      });
    }

    function applyWebtoonImport(form, imported) {
      setFieldValue(form, "webtoon_id", imported.webtoon_id);
      setFieldValue(form, "title", imported.title);
      setFieldValue(form, "rating", imported.rating);
      setFieldValue(form, "alternative", imported.alternative || "");
      setFieldValue(form, "artist", imported.artist);
      setFieldValue(form, "genre", imported.genre);
      setFieldValue(form, "type", imported.type);
      setFieldValue(form, "tage", (imported.tage || []).join(", "));
      setFieldValue(form, "url", imported.url);
      setImageSlotUrl(form, "poster", imported.poster_image, "Poster Image");
      (imported.webtoon_images || []).slice(0, 6).forEach((image, index) => {
        setImageSlotUrl(form, `webtoon_image_${index + 1}`, image, `Webtoon Image ${index + 1}`);
      });
      pendingWebtoonChapters = (imported.chapters || []).map((chapter) => ({
        webtoon_chapter_id: chapter.webtoon_chapter_id,
        webtoon_id: imported.webtoon_id,
        chapter_number: Number(chapter.chapter_number || 0),
        chapter_url: chapter.chapter_url || "",
        chapter_poster: chapter.chapter_poster || imported.poster_image || null
      }));
    }

    function bindWebtoonImport(form) {
      if (kind !== "webtoons") return;
      const input = document.getElementById("webtoonImportInput");
      const siteInput = document.getElementById("webtoonImportSite");
      const button = document.getElementById("webtoonImportButton");
      const status = document.getElementById("webtoonImportStatus");
      if (!input || !button) return;

      button.addEventListener("click", async () => {
        const value = input.value.trim();
        if (!value) {
          alert("Webtoon 참조사이트 URL을 입력해 주세요.");
          return;
        }
        button.disabled = true;
        if (status) status.textContent = "조회 중...";
        try {
          const imported = await fetchWebtoonImport(value, siteInput?.value || "auto");
          applyWebtoonImport(form, imported);
          if (status) status.textContent = `가져오기 완료${pendingWebtoonChapters.length ? ` · Chapter ${pendingWebtoonChapters.length}건` : ""}`;
        } catch (error) {
          if (status) status.textContent = "가져오기 실패";
          alert(`Webtoon 가져오기 실패: ${error.message}`);
        } finally {
          button.disabled = false;
        }
      });
    }

    function applyActorImport(form, imported) {
      setFieldValue(form, "name", imported.name || "");
      setFieldValue(form, "age", imported.age || "");
      setFieldValue(form, "height_cm", imported.height_cm || "");
      setFieldValue(form, "body_size", imported.body_size || "");
      setFieldValue(form, "debut_year", imported.debut_year || "");

      const imageUrls = Array.isArray(imported.image_urls) ? imported.image_urls.filter(Boolean) : [];
      const representative = imported.representative_image_url || imageUrls[0] || "";
      setImageSlotUrl(form, "representative", representative, "대표이미지");
      [0, 1, 2, 3].forEach((index) => {
        setImageSlotUrl(form, `gallery_${index + 1}`, imageUrls[index + 1] || "", `일반이미지 ${index + 1}`);
      });
    }

    function bindActorImport(form) {
      if (kind !== "actors") return;
      const nameInput = document.getElementById("actorImportName");
      const urlInput = document.getElementById("actorImportUrl");
      const button = document.getElementById("actorImportButton");
      const status = document.getElementById("actorImportStatus");
      if (!nameInput || !urlInput || !button) return;

      button.addEventListener("click", async () => {
        const name = nameInput.value.trim();
        const url = urlInput.value.trim();
        if (!name || !url) {
          alert("배우명과 참고 URL을 입력해 주세요.");
          return;
        }
        button.disabled = true;
        if (status) status.textContent = "조회 중...";
        try {
          const imported = await fetchActorImport(name, url);
          applyActorImport(form, imported);
          if (status) status.textContent = "조회 완료";
        } catch (error) {
          if (status) status.textContent = "조회 실패";
          alert(`배우정보 조회 실패: ${error.message}`);
        } finally {
          button.disabled = false;
        }
      });
    }

    function setSelectValues(form) {
      if (!editingItem) return;
      form.querySelectorAll("select[name]").forEach((select) => {
        const value = editingItem[select.name];
        if (value !== undefined && value !== null) select.value = String(value);
      });
      form.querySelectorAll('input[type="hidden"][name]').forEach((input) => {
        const value = editingItem[input.name];
        if (value === undefined || value === null) return;
        input.value = String(value);
        updateToggleButtons(form, input.name, input.value);
      });
    }

    // projectjav.com에서 실제 커버 이미지 URL 조회 (codetabs 프록시 경유)
    async function fetchProjectJavCoverUrl(cleanCode) {
      try {
        const searchUrl = `https://projectjav.com/?searchTerm=${cleanCode.toUpperCase()}`;
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(searchUrl)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();

        // 패턴 1: href="/movie/cleanCode-{ID}"
        const linkMatch = html.match(new RegExp('/movie/' + cleanCode.replace(/[-]/g, '\\-') + '-(\\d+)', 'i'));
        if (linkMatch) {
          return `https://images.projectjav.com/data/covers/${linkMatch[1]}.jpg`;
        }

        // 패턴 2: data-link 속성에서 직접 추출 (alt="cleanCode")
        const altMatch = html.match(new RegExp('data-link="(https://images\\.projectjav\\.com/data/covers/\\d+\\.jpg)"[^>]*alt="' + cleanCode.replace(/[-]/g, '\\-') + '"', 'i'));
        if (altMatch) return altMatch[1];

        return null;
      } catch (e) {
        console.warn('projectjav 커버 이미지 조회 실패:', e);
        return null;
      }
    }

    function setImageSlotCoverUrl(form, coverUrl) {
      ["capture", "snapshot"].forEach((field) => {
        const slot = form.querySelector(`[data-image-field="${field}"]`);
        if (!slot) return;
        const preview = slot.querySelector(".image-preview");
        const urlInput = slot.querySelector(`input[name="url_${field}"]`);
        if (urlInput) urlInput.value = coverUrl;
        if (preview) {
          preview.classList.add("has-image");
          preview.innerHTML = `<img src="${UI.escapeHtml(coverUrl)}" alt="${field === "capture" ? "캡쳐" : "스냅샷"} 미리보기">`;
        }
      });
    }

    function restoreOriginalImageSlots(form) {
      ["capture", "snapshot"].forEach((field) => {
        const slot = form.querySelector(`[data-image-field="${field}"]`);
        if (!slot) return;
        const preview = slot.querySelector(".image-preview");
        const urlInput = slot.querySelector(`input[name="url_${field}"]`);
        const originalUrl = editingItem ? (field === "capture" ? editingItem.capture_url : editingItem.snapshot_url) : "";
        if (urlInput) urlInput.value = originalUrl || "";
        if (preview) {
          if (originalUrl) {
            preview.classList.add("has-image");
            preview.innerHTML = `<img src="${UI.escapeHtml(originalUrl)}" alt="${field === "capture" ? "캡쳐" : "스냅샷"} 미리보기">`;
          } else {
            preview.classList.remove("has-image");
            preview.innerHTML = "<span>이미지 없음</span>";
          }
        }
      });
    }

    function bindMainExhibitionAutoCover(form) {
      if (kind !== "movies") return;

      const isMainSelect = form.querySelector('[name="is_main"]');
      const movieCodeInput = form.querySelector('input[name="movie_code"]');
      if (!isMainSelect || !movieCodeInput) return;

      let _fetchTimer = null;

      async function updateAutoCovers() {
        const isMain = isMainSelect.value === "true";
        if (!isMain) {
          restoreOriginalImageSlots(form);
          return;
        }

        let cleanCode = (movieCodeInput.value || "").trim();
        if (!cleanCode) return;
        cleanCode = cleanCode.replace(/-DECENSORED/i, "");
        cleanCode = cleanCode.replace(/-REDUCING-MOSAIC/i, "");
        cleanCode = cleanCode.replace(/-REDUCING/i, "");
        cleanCode = cleanCode.toLowerCase();

        // 로딩 상태 표시
        ["capture", "snapshot"].forEach((field) => {
          const slot = form.querySelector(`[data-image-field="${field}"]`);
          if (!slot) return;
          const preview = slot.querySelector(".image-preview");
          if (preview) {
            preview.classList.add("has-image");
            preview.innerHTML = `<span style="color:var(--accent-soft);font-size:12px;">projectjav 커버 조회 중…</span>`;
          }
        });

        const coverUrl = await fetchProjectJavCoverUrl(cleanCode);

        if (coverUrl) {
          setImageSlotCoverUrl(form, coverUrl);
        } else {
          // 조회 실패 시 기존 이미지 복원 + 경고
          restoreOriginalImageSlots(form);
          ["capture", "snapshot"].forEach((field) => {
            const slot = form.querySelector(`[data-image-field="${field}"]`);
            if (!slot) return;
            const preview = slot.querySelector(".image-preview");
            if (preview && !preview.querySelector("img")) {
              preview.classList.remove("has-image");
              preview.innerHTML = `<span style="color:var(--danger,#e55);font-size:12px;">커버 조회 실패: poster_url 사용</span>`;
            }
          });
        }
      }

      isMainSelect.addEventListener("change", () => {
        clearTimeout(_fetchTimer);
        _fetchTimer = setTimeout(updateAutoCovers, 100);
      });
      movieCodeInput.addEventListener("input", () => {
        if (isMainSelect.value !== "true") return;
        clearTimeout(_fetchTimer);
        _fetchTimer = setTimeout(updateAutoCovers, 600);
      });

      if (isMainSelect.value === "true") {
        _fetchTimer = setTimeout(updateAutoCovers, 100);
      }
    }

    function renderForm() {
      removedAssets = [];
      const isEdit = Boolean(editingItem);
      formHost.innerHTML = `
        <div class="form-title-row">
          <h2>${isEdit ? "정보 수정" : "신규 등록"}</h2>
          <button class="primary-button form-title-submit" type="button"><span class="material-symbols-outlined">save</span>${isEdit ? "수정 저장" : "저장"}</button>
        </div>
        <form class="form-grid" id="entryForm">
          ${renderMovieImportPanel()}
          ${renderActorImportPanel()}
          ${renderWebtoonImportPanel()}
          ${fieldSets[kind].map(inputFor).join("")}
          ${renderImageFields()}
          <div class="form-actions">
            <button class="primary-button" type="submit"><span class="material-symbols-outlined">save</span>${isEdit ? "수정 저장" : "저장"}</button>
            ${renderImageActionButtons()}
            ${isEdit ? `<button class="ghost-button" type="button" id="cancelEdit"><span class="material-symbols-outlined">close</span>취소</button>` : ""}
          </div>
        </form>`;

      const form = document.getElementById("entryForm");
      const titleSubmit = formHost.querySelector(".form-title-submit");
      if (titleSubmit) {
        titleSubmit.addEventListener("click", () => {
          if (form.requestSubmit) form.requestSubmit();
          else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        });
      }
      bindToggleButtons(form);
      setSelectValues(form);
      bindImageFields();
      bindMovieImportSiteButtons(form);
      bindWebtoonImportSiteButtons(form);
      bindMovieImport(form);
      bindActorImport(form);
      bindWebtoonImport(form);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          const payload = await normalize(new FormData(form));
          applyGalleryDefaults(payload, form);
          const uploadedAssetIds = await applyImagePayload(payload, form);
          compactActorImages(payload);
          compactWebtoonImages(payload);

          if (isEdit) {
            // 메인전시로 설정하는 경우, 기존 메인전시 영화(본인 제외)를 미전시로 일괄 해제
            if (kind === "movies" && payload.is_main) {
              await Store.clearMainMovies(editingItem[primaryKey]);
            }
            data = await Store.update(kind, editingItem[primaryKey], payload);
            await Store.updateMediaOwner(uploadedAssetIds, editingItem[primaryKey]);
            await syncPendingWebtoonChapters(payload.webtoon_id || editingItem.webtoon_id);
            editingItem = data[kind].find((item) => String(item[primaryKey]) === String(editingItem[primaryKey])) || null;
          } else {
            const existingWebtoon = kind === "webtoons"
              ? (data.webtoons || []).find((item) => String(item.webtoon_id) === String(payload.webtoon_id))
              : null;
            if (existingWebtoon) {
              data = await Store.update(kind, existingWebtoon[primaryKey], payload);
            } else {
              data = await Store.create(kind, payload);
            }
            const created = (data[kind] || []).find((item) => {
              if (kind === "webtoons") return String(item.webtoon_id) === String(payload.webtoon_id);
              if (kind === "galleryImages") return String(item.gallery_image_id) === String(payload.gallery_image_id);
              return Object.entries(payload).every(([key, value]) => {
                if (Array.isArray(value) || value === null || value === undefined) return true;
                return String(item[key] ?? "") === String(value);
              });
            }) || existingWebtoon || data[kind][0];
            if (created && primaryKey) await Store.updateMediaOwner(uploadedAssetIds, created[primaryKey]);
            await syncPendingWebtoonChapters(created?.webtoon_id || payload.webtoon_id);
            // 신규 등록 시에도 메인전시라면 기존 것 해제
            if (kind === "movies" && payload.is_main && created) {
              await Store.clearMainMovies(created[primaryKey]);
            }
            editingItem = null;
          }

          for (const asset of removedAssets) await Store.deleteMedia(asset);
          renderForm();
          renderTable();
          UI.setDbStatus(Store.getStatus());
          if (isEdit) alert("정보수정이 완료되었습니다.");
        } catch (error) {
          alert(`저장 실패: ${error.message}`);
        }
      });
    }

    function addRemovedAssetFromSlot(slot) {
      const originalAssetId = slot?.getAttribute("data-original-asset-id");
      if (originalAssetId && !removedAssets.includes(originalAssetId)) {
        removedAssets.push(originalAssetId);
      }
    }

    function clearSlot(slot) {
      if (!slot) return;
      const preview = slot.querySelector(".image-preview");
      const urlInput = slot.querySelector('input[name^="url_"]');
      const assetInput = slot.querySelector('input[name^="asset_"]');
      const fileInput = slot.querySelector(".image-input");

      addRemovedAssetFromSlot(slot);
      if (fileInput) fileInput.value = "";
      if (urlInput) urlInput.value = "";
      if (assetInput) assetInput.value = "";
      if (preview) {
        preview.classList.remove("has-image");
        preview.innerHTML = "<span>이미지 없음</span>";
      }
    }

    function bindImageFields() {
      const form = document.getElementById("entryForm");
      if (!form) return;

      form.querySelectorAll(".image-input").forEach((input) => {
        const slot = input.closest(".image-field");
        const label = slot?.querySelector("strong")?.textContent.trim() || "";

        input.addEventListener("change", () => {
          const preview = slot?.querySelector(".image-preview");
          if (!input.files || !input.files[0]) {
            if (preview) {
              preview.classList.remove("has-image");
              preview.innerHTML = "<span>이미지 없음</span>";
            }
            return;
          }

          const url = URL.createObjectURL(input.files[0]);
          if (preview) {
            preview.classList.add("has-image");
            preview.innerHTML = `<img src="${UI.escapeHtml(url)}" alt="${UI.escapeHtml(label)} 미리보기">`;
          }
          autofillGalleryFields(form, input.files[0]);

          addRemovedAssetFromSlot(slot);
          const urlInput = slot?.querySelector('input[name^="url_"]');
          const assetInput = slot?.querySelector('input[name^="asset_"]');
          if (urlInput) urlInput.value = "";
          if (assetInput) assetInput.value = "";
        });

        const pasteTarget = slot || input;
        if (pasteTarget) {
          pasteTarget.setAttribute("tabindex", "0");
          pasteTarget.addEventListener("paste", (event) => {
            const file = imageFileFromClipboard(event);
            if (!file) return;
            event.preventDefault();
            setFileInputFile(input, file);
          });
        }
      });

      if (kind === "galleryImages" && form.dataset.boundGalleryPaste !== "true") {
        form.dataset.boundGalleryPaste = "true";
        form.addEventListener("paste", (event) => {
          const target = event.target;
          if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) && target.type !== "file") return;
          const file = imageFileFromClipboard(event);
          if (!file) return;
          const input = galleryImageInput(form);
          if (setFileInputFile(input, file, "clipboard")) event.preventDefault();
        });
      }

      if (kind === "galleryImages" && document.body.dataset.boundGalleryDocumentPaste !== "true") {
        document.body.dataset.boundGalleryDocumentPaste = "true";
        document.addEventListener("paste", (event) => {
          const target = event.target;
          if (target?.closest?.("#entryForm")) return;
          if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) && target.type !== "file") return;
          const file = imageFileFromClipboard(event);
          if (!file) return;
          const currentForm = document.getElementById("entryForm");
          const input = galleryImageInput(currentForm);
          if (setFileInputFile(input, file, "clipboard")) event.preventDefault();
        });
      }

      formHost.querySelectorAll(".image-clear-form").forEach((button) => {
        button.addEventListener("click", () => {
          const slot = formHost.querySelector(`[data-image-field="${button.dataset.targetImageField}"]`);
          clearSlot(slot);
        });
      });
    }


    function thumb(url, label) {
      if (!url) return `<span class="muted-text">없음</span>`;
      return `<img class="table-thumb" src="${UI.escapeHtml(url)}" alt="${UI.escapeHtml(label)}">`;
    }

    function assetThumb(asset, fallbackUrl = "") {
      return asset?.thumb_url || fallbackUrl || asset?.public_url || "";
    }

    function rowActions(item) {
      const key = UI.escapeHtml(item[primaryKey]);
      const detailLink = kind === "movies"
        ? `<a class="link-button" href="movie-detail.html?code=${UI.escapeHtml(item.movie_code || item[primaryKey])}">상세</a>`
        : kind === "webtoons"
          ? `<a class="link-button" href="../pages/webtoon.html?id=${UI.escapeHtml(item.webtoon_id || item[primaryKey])}">상세</a>`
        : kind === "galleryImages"
          ? `<a class="link-button" href="../pages/gallery.html?id=${UI.escapeHtml(item.gallery_image_id || item[primaryKey])}">상세</a>`
        : "";
      return `
        <div class="table-actions">
          ${detailLink}
          <button class="link-button table-edit" type="button" data-key="${key}">수정</button>
          <button class="link-button danger-link table-delete" type="button" data-key="${key}">삭제</button>
        </div>`;
    }

    function deleteMessage(item) {
      const label = item.title || item.name || item.category_code || item.grade || item[primaryKey];
      if (kind === "actors") {
        const linkedMovies = data.movies.filter((movie) => (movie.actor_ids || [movie.actor_id]).some((id) => String(id) === String(item.id))).length;
        return [
          "주연배우 정보를 삭제하시겠습니까?",
          "",
          label,
          `연결된 영화정보: ${linkedMovies}개`,
          "삭제 후 연결된 영화의 주연배우 표시는 비어 있을 수 있습니다."
        ].join("\n");
      }
      return `삭제하시겠습니까?\n\n${label}`;
    }

    function tableRows(items) {
      if (kind === "movies") {
        return items.map((item) => {
          const key = UI.escapeHtml(item[primaryKey]);
          return `<tr><td class="table-movie-trigger" data-key="${key}" style="cursor:pointer;" title="클릭 시 조회 및 수정">${thumb(UI.movieThumbnailUrl(item, ""), item.title)}</td><td class="table-movie-trigger" data-key="${key}" style="cursor:pointer;color:var(--accent-soft);font-weight:600;text-decoration:underline;" title="클릭 시 조회 및 수정">${UI.escapeHtml(item.movie_code)}</td><td>${UI.escapeHtml(item.category_name)}</td><td>${UI.escapeHtml(item.actor_names || item.actor_name)}</td><td>${UI.escapeHtml((item.director_names || []).join(", ") || "-")}</td><td><span class="rating">${UI.escapeHtml(item.rating_grade)}</span></td><td>${item.is_main ? '<span class="summary-pill" style="min-height:24px;background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700;">전시</span>' : '<span class="summary-pill" style="min-height:24px;">미전시</span>'}</td><td>${UI.escapeHtml(Store.effectiveClickCount(item))}</td><td>${UI.escapeHtml(item.ranking_score || 0)}</td><td>${rowActions(item)}</td></tr>`;
        }).join("");
      }
      if (kind === "webtoons") {
        return items.map((item) => {
          const key = UI.escapeHtml(item[primaryKey]);
          const episodeCount = (data.webtoonChapters || []).filter((chapter) => String(chapter.webtoon_id) === String(item.webtoon_id)).length;
          return `<tr><td class="table-record-trigger" data-key="${key}" style="cursor:pointer;" title="클릭 시 조회 및 수정">${thumb(assetThumb(item.poster_image_asset, item.poster_image), item.title)}</td><td class="table-record-trigger" data-key="${key}" style="cursor:pointer;color:var(--accent-soft);font-weight:600;text-decoration:underline;" title="클릭 시 조회 및 수정">${UI.escapeHtml(item.webtoon_id)}</td><td>${UI.escapeHtml(item.title)}</td><td>${UI.escapeHtml(item.artist || "-")}</td><td>${UI.escapeHtml(item.genre || "-")}</td><td>${UI.escapeHtml(episodeCount)}</td><td>${rowActions(item)}</td></tr>`;
        }).join("");
      }
      if (kind === "webtoonChapters") {
        return items.map((item) => `<tr><td>${thumb(assetThumb(item.chapter_poster_asset, item.chapter_poster), item.webtoon_chapter_id)}</td><td>${UI.escapeHtml(item.webtoon_chapter_id)}</td><td>${UI.escapeHtml(item.webtoon_id)}</td><td>${UI.escapeHtml(item.chapter_number)}</td><td>${item.chapter_url ? `<a class="link-button" href="${UI.escapeHtml(item.chapter_url)}" target="_blank" rel="noreferrer">열기</a>` : `<span class="muted-text">없음</span>`}</td><td>${rowActions(item)}</td></tr>`).join("");
      }
      if (kind === "galleryImages") {
        return items.map((item) => {
          const key = UI.escapeHtml(item[primaryKey]);
          const tags = Array.isArray(item.tags) ? item.tags.join(", ") : item.tags || "";
          return `<tr><td class="table-record-trigger" data-key="${key}" style="cursor:pointer;" title="클릭 시 조회 및 수정">${thumb(assetThumb(item.image_asset, item.image_url), item.title)}</td><td class="table-record-trigger" data-key="${key}" style="cursor:pointer;color:var(--accent-soft);font-weight:600;text-decoration:underline;" title="클릭 시 조회 및 수정">${UI.escapeHtml(item.gallery_image_id)}</td><td>${UI.escapeHtml(item.title)}</td><td>${UI.escapeHtml(tags || "-")}</td><td>${item.is_visible === false ? "미전시" : "전시"}</td><td>${rowActions(item)}</td></tr>`;
        }).join("");
      }
      if (kind === "categories") {
        return items.map((item) => `<tr><td>${thumb(assetThumb(item.representative_image_asset, item.representative_image_url), item.name)}</td><td>${UI.escapeHtml(item.category_code)}</td><td>${UI.escapeHtml(item.name)}</td><td>${item.is_visible === false ? "미전시" : "전시"}</td><td>${rowActions(item)}</td></tr>`).join("");
      }
      if (kind === "actors") {
        return items.map((item) => {
          const key = UI.escapeHtml(item[primaryKey]);
          const movieCount = item.movie_count ?? data.movies.filter((movie) => (movie.actor_ids || [movie.actor_id]).some((id) => String(id) === String(item.id))).length;
          return `<tr><td class="table-record-trigger" data-key="${key}" style="cursor:pointer;" title="클릭 시 조회 및 수정">${thumb(assetThumb(item.representative_image_asset, item.representative_image_url), item.name)}</td><td class="table-record-trigger" data-key="${key}" style="cursor:pointer;color:var(--accent-soft);font-weight:600;text-decoration:underline;" title="클릭 시 조회 및 수정">${UI.escapeHtml(item.name)}</td><td>${UI.escapeHtml(movieCount)}</td><td>${UI.escapeHtml(item.debut_year)}</td><td>${rowActions(item)}</td></tr>`;
        }).join("");
      }
      if (kind === "commonCodes") {
        const sortedItems = [...items].sort((a, b) => {
          const groupCompare = String(a.code_group || "").localeCompare(String(b.code_group || ""));
          if (groupCompare !== 0) return groupCompare;
          const orderCompare = Number(a.display_order || 0) - Number(b.display_order || 0);
          if (orderCompare !== 0) return orderCompare;
          return String(a.code_value || "").localeCompare(String(b.code_value || ""));
        });
        let currentGroup = null;
        return sortedItems.map((item) => {
          const group = String(item.code_group || "");
          const groupRow = group !== currentGroup
            ? `<tr><td colspan="6" style="background:var(--surface-2);color:var(--text);border-top:1px solid var(--line);font-weight:800;">${UI.escapeHtml(group || "-")}</td></tr>`
            : "";
          currentGroup = group;
          return `${groupRow}<tr><td>${UI.escapeHtml(item.code_group)}</td><td>${UI.escapeHtml(item.code_value)}</td><td>${UI.escapeHtml(item.code_label)}</td><td>${UI.escapeHtml(item.display_order)}</td><td>${item.is_enabled === false ? "미사용" : "사용"}</td><td>${rowActions(item)}</td></tr>`;
        }).join("");
      }
      return items.map((item) => `<tr><td><span class="rating">${UI.escapeHtml(item.grade)}</span></td><td>${UI.escapeHtml(item.display_order)}</td><td>${rowActions(item)}</td></tr>`).join("");
    }

    function headerRow() {
      if (kind === "movies") return "<tr><th>포스터</th><th>영화코드</th><th>카테고리</th><th>주연배우</th><th>감독</th><th>평가등급</th><th>메인전시</th><th>클릭수</th><th>랭킹</th><th>관리</th></tr>";
      if (kind === "webtoons") return "<tr><th>포스터</th><th>Webtoon ID</th><th>Title</th><th>Artist</th><th>Genre</th><th>에피소드 개수</th><th>관리</th></tr>";
      if (kind === "webtoonChapters") return "<tr><th>포스터</th><th>Chapter ID</th><th>Webtoon ID</th><th>Chapter</th><th>URL</th><th>관리</th></tr>";
      if (kind === "galleryImages") return "<tr><th>이미지</th><th>Gallery ID</th><th>제목</th><th>태그</th><th>전시여부</th><th>관리</th></tr>";
      if (kind === "categories") return "<tr><th>대표이미지</th><th>코드</th><th>카테고리명</th><th>전시여부</th><th>관리</th></tr>";
      if (kind === "actors") return "<tr><th>대표이미지</th><th>배우명</th><th>작품수</th><th>데뷔년도</th><th>관리</th></tr>";
      if (kind === "commonCodes") return "<tr><th>코드그룹</th><th>코드값</th><th>표시명</th><th>정렬</th><th>사용여부</th><th>관리</th></tr>";
      return "<tr><th>평가등급</th><th>정렬순서</th><th>관리</th></tr>";
    }

    function focusTableTop() {
      requestAnimationFrame(() => {
        const top = tableHost.getBoundingClientRect().top + window.scrollY - 80;
        tableHost.setAttribute("tabindex", "-1");
        tableHost.focus({ preventScroll: true });
        window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
      });
    }

    function renderTable() {
      const allItems = data[kind] || [];
      let filteredItems = allItems;
      
      if (kind === "movies" && searchInput && searchInput.value.trim()) {
        const term = searchInput.value.trim();
        filteredItems = allItems.filter(movie => UI.matchesSearch(movie, term));
      }
      if (kind === "actors") {
        const actorTableSearch = document.getElementById("actorTableSearch");
        const term = (actorTableSearch?.value || searchInput?.value || "").trim().toLowerCase();
        if (term) {
          filteredItems = allItems.filter((actor) => String(actor.name || "").toLowerCase().includes(term));
        }
        filteredItems = [...filteredItems].sort((a, b) => {
          const countCompare = Number(b.movie_count || 0) - Number(a.movie_count || 0);
          if (countCompare !== 0) return countCompare;
          return String(a.name || "").localeCompare(String(b.name || ""));
        });
      }
      if (kind === "commonCodes" && searchInput && searchInput.value.trim()) {
        const term = searchInput.value.trim().toLowerCase();
        filteredItems = allItems.filter((item) => [
          item.code_group,
          item.code_value,
          item.code_label
        ].some((value) => String(value || "").toLowerCase().includes(term)));
      }
      if ((kind === "webtoons" || kind === "webtoonChapters" || kind === "galleryImages") && searchInput && searchInput.value.trim()) {
        const term = searchInput.value.trim().toLowerCase();
        filteredItems = allItems.filter((item) => Object.values(item).some((value) => {
          if (Array.isArray(value)) return value.join(" ").toLowerCase().includes(term);
          if (value && typeof value === "object") return false;
          return String(value || "").toLowerCase().includes(term);
        }));
      }

      let paginatedItems = filteredItems;
      let totalPages = 1;
      
      if (kind === "movies" || kind === "webtoons" || kind === "webtoonChapters" || kind === "galleryImages") {
        const paginated = UI.paginate(filteredItems, currentPage, pageSize);
        paginatedItems = paginated.items;
        totalPages = paginated.totalPages;
        currentPage = paginated.page || 1;
      }

      tableHost.innerHTML = `
        <h2>등록 목록</h2>
        ${kind === "actors" ? `
          <div class="toolbar table-search-toolbar">
            <label>배우명 조회
              <input class="input-control" id="actorTableSearch" type="search" value="${UI.escapeHtml(searchInput?.value || "")}" placeholder="배우명 입력">
            </label>
            <span class="muted-text">${UI.escapeHtml(filteredItems.length)}건</span>
          </div>
        ` : ""}
        <table>
          <thead>${headerRow()}</thead>
          <tbody>${tableRows(paginatedItems)}</tbody>
        </table>`;

      if (kind === "actors") {
        const actorTableSearch = document.getElementById("actorTableSearch");
        if (actorTableSearch) {
          actorTableSearch.addEventListener("input", () => {
            if (searchInput && searchInput.value !== actorTableSearch.value) {
              searchInput.value = actorTableSearch.value;
            }
            currentPage = 1;
            renderTable();
          });
        }
      }

      if (kind === "movies" || kind === "webtoons" || kind === "webtoonChapters" || kind === "galleryImages") {
        const controlsDiv = document.createElement("div");
        controlsDiv.className = "toolbar";
        controlsDiv.style.marginTop = "16px";
        controlsDiv.style.padding = "10px 14px";
        controlsDiv.style.display = "flex";
        controlsDiv.style.alignItems = "center";
        controlsDiv.style.justifyContent = "space-between";
        controlsDiv.style.flexWrap = "wrap";
        controlsDiv.style.gap = "12px";
        
        controlsDiv.innerHTML = `
          <label class="page-size-label">
            페이지당 개수
            <select class="select-control" id="pageSizeSelect" style="min-height:32px;padding:4px 8px;font-size:13px;">
              <option value="20" ${pageSize === "20" ? "selected" : ""}>20개</option>
              <option value="40" ${pageSize === "40" ? "selected" : ""}>40개</option>
              <option value="80" ${pageSize === "80" ? "selected" : ""}>80개</option>
              <option value="100" ${pageSize === "100" ? "selected" : ""}>100개</option>
              <option value="all" ${pageSize === "all" ? "selected" : ""}>전체</option>
            </select>
          </label>
          <div class="pagination" id="tablePagination" style="margin-top:0;"></div>
        `;
        
        tableHost.appendChild(controlsDiv);
        
        const sizeSelect = document.getElementById("pageSizeSelect");
        if (sizeSelect) {
          sizeSelect.addEventListener("change", (e) => {
            pageSize = e.target.value;
            currentPage = 1;
            renderTable();
            focusTableTop();
          });
        }
        
        const paginationContainer = document.getElementById("tablePagination");
        UI.renderPagination(paginationContainer, totalPages, currentPage, (nextPage) => {
          currentPage = nextPage;
          renderTable();
          focusTableTop();
        });
      }

      function loadItemIntoForm(key) {
        editingItem = allItems.find((item) => String(item[primaryKey]) === String(key)) || null;
        renderForm();
        formHost.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      tableHost.querySelectorAll(".table-edit").forEach((button) => {
        button.addEventListener("click", () => loadItemIntoForm(button.dataset.key));
      });

      tableHost.querySelectorAll(".table-movie-trigger").forEach((element) => {
        element.addEventListener("click", () => loadItemIntoForm(element.dataset.key));
      });

      tableHost.querySelectorAll(".table-record-trigger").forEach((element) => {
        element.addEventListener("click", () => loadItemIntoForm(element.dataset.key));
      });

      tableHost.querySelectorAll(".table-delete").forEach((button) => {
        button.addEventListener("click", async () => {
          const item = allItems.find((entry) => String(entry[primaryKey]) === String(button.dataset.key));
          if (!item) return;
          if (!confirm(deleteMessage(item))) return;

          try {
            const assets = collectItemAssets(item);
            await Store.remove(kind, item[primaryKey]);
            for (const asset of assets) await Store.deleteMedia(asset);
            if (editingItem && String(editingItem[primaryKey]) === String(item[primaryKey])) {
              editingItem = null;
              renderForm();
            }
            data = await Store.load();
            renderTable();
            UI.setDbStatus(Store.getStatus());
            alert("삭제가 완료되었습니다.");
          } catch (error) {
            alert(`삭제 실패: ${error.message}`);
          }
        });
      });
    }

    function collectItemAssets(item) {
      const fields = imageFields[kind] || [];
      const assets = [];
      fields.forEach((config) => {
        if (config.arrayAssetKey) {
          (item[config.arrayAssetKey] || []).forEach((assetId) => {
            const asset = getAsset(assetId);
            if (asset) assets.push(asset);
          });
          return;
        }
        const asset = getAsset(item[config.assetKey]);
        if (asset) assets.push(asset);
      });
      return assets;
    }

    renderForm();
    renderTable();

    // URL 파라미터로 영화코드가 전달된 경우, 해당 영화를 자동 조회하여 수정 폼에 로드
    if (kind === "movies") {
      const urlParams = new URLSearchParams(window.location.search);
      const preloadCode = urlParams.get("code");
      if (preloadCode) {
        const matched = data.movies.find(
          (item) => String(item.movie_code).toLowerCase() === String(preloadCode).toLowerCase()
        );
        if (matched) {
          editingItem = matched;
          renderForm();
          renderTable();
          setTimeout(() => {
            if (formHost) formHost.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        }
      }
    }
    if (kind === "webtoons") {
      const urlParams = new URLSearchParams(window.location.search);
      const preloadId = urlParams.get("id");
      if (preloadId) {
        const matched = data.webtoons.find(
          (item) => String(item.webtoon_id).toLowerCase() === String(preloadId).toLowerCase()
        );
        if (matched) {
          editingItem = matched;
          renderForm();
          renderTable();
          setTimeout(() => {
            if (formHost) formHost.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        }
      }
    }
    if (kind === "galleryImages") {
      const urlParams = new URLSearchParams(window.location.search);
      const preloadId = urlParams.get("id");
      if (preloadId) {
        const matched = data.galleryImages.find(
          (item) => String(item.gallery_image_id).toLowerCase() === String(preloadId).toLowerCase()
        );
        if (matched) {
          editingItem = matched;
          renderForm();
          renderTable();
          setTimeout(() => {
            if (formHost) formHost.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        }
      }
    }
    } catch (err) {
      UI.showError(err.message);
      console.error(err);
    }
  }

  window.CineTubeAdminPage = { init };
})();











