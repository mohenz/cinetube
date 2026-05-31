(function () {
  const fieldSets = {
    movies: [
      ["title", "영화제목"], ["movie_code", "영화코드"], ["category_code", "카테고리", "category"], ["actor_id", "주연배우", "actor"], ["keywords", "키워드(쉼표 구분)"],
      ["rating_grade", "평가등급", "rating"], ["video_url", "영상링크"], ["description", "주요내용", "textarea"],
      ["release_month", "출시년월"], ["production_company", "제작사"], ["recommendation_score", "추천점수", "number"],
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
    ]
  };

  async function init(kind) {
    const UI = window.CineTubeUI;
    const Store = window.CineTubeStore;
    UI.setupChrome();

    let data = await Store.load();
    UI.setDbStatus(Store.getStatus());

    const formHost = document.getElementById("adminForm");
    const tableHost = document.getElementById("adminTable");
    const primaryKey = Store.primaryKeys[kind];
    let editingItem = null;
    let removedAssets = [];

    function optionList(type) {
      if (type === "category") return data.categories.map((item) => `<option value="${UI.escapeHtml(item.category_code)}">${UI.escapeHtml(item.name)}</option>`).join("");
      if (type === "actor") return data.actors.map((item) => `<option value="${UI.escapeHtml(item.id)}">${UI.escapeHtml(item.name)}</option>`).join("");
      if (type === "rating") return data.ratings.map((item) => `<option value="${UI.escapeHtml(item.grade)}">${UI.escapeHtml(item.grade)}</option>`).join("");
      return "";
    }

    function valueFor(name) {
      if (!editingItem) return "";
      const value = editingItem[name];
      if (Array.isArray(value)) return value.join(", ");
      return value ?? "";
    }

    function inputFor([name, label, type]) {
      const disabled = editingItem && name === primaryKey ? "disabled" : "";
      const value = UI.escapeHtml(valueFor(name));
      if (type === "textarea") return `<label>${label}<textarea class="input-control" name="${name}" rows="4">${value}</textarea></label>`;
      if (type === "boolean") {
        const current = String(valueFor(name) === false ? "false" : "true");
        return `<label>${label}<select class="select-control" name="${name}"><option value="true" ${current === "true" ? "selected" : ""}>전시</option><option value="false" ${current === "false" ? "selected" : ""}>미전시</option></select></label>`;
      }
      if (type === "category" || type === "actor" || type === "rating") {
        return `<label>${label}<select class="select-control" name="${name}">${optionList(type)}</select></label>`;
      }
      return `<label>${label}<input class="input-control" name="${name}" type="${type || "text"}" value="${value}" ${disabled}></label>`;
    }

    function imageValue(item, config) {
      if (!item) return { url: "", assetId: "", objectPath: "" };
      const url = config.arrayUrlKey ? (item[config.arrayUrlKey] || [])[config.index] : item[config.urlKey];
      const assetId = config.arrayAssetKey ? (item[config.arrayAssetKey] || [])[config.index] : item[config.assetKey];
      const asset = getAsset(assetId);
      return {
        url: url || "",
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

    function normalize(formData) {
      const payload = Object.fromEntries(formData.entries());
      Object.keys(payload).forEach((key) => {
        if (key.startsWith("file_") || key.startsWith("url_") || key.startsWith("asset_")) delete payload[key];
      });

      if (kind === "movies") {
        payload.actor_id = payload.actor_id ? Number(payload.actor_id) : null;
        payload.keywords = payload.keywords ? payload.keywords.split(",").map((item) => item.trim()).filter(Boolean) : [];
        payload.recommendation_score = Number(payload.recommendation_score || 0);
        payload.ranking_score = Number(payload.ranking_score || 0);
        payload.click_count = Number(payload.click_count || 0);
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
      return payload;
    }

    function ownerField(config) {
      return config.arrayUrlKey ? `actor_${config.field}` : config.field;
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

    function addRemovedAssetFromSlot(slot) {
      const assetId = slot.dataset.originalAssetId;
      if (!assetId || removedAssets.some((asset) => String(asset.id) === String(assetId))) return;
      removedAssets.push({
        id: assetId,
        bucket_id: slot.dataset.originalBucketId,
        object_path: slot.dataset.originalObjectPath
      });
    }

    function bindImageFields() {
      function clearSlot(slot) {
        const fileInput = slot.querySelector(".image-input");
        const preview = slot.querySelector(".image-preview");
        const urlInput = slot.querySelector('input[name^="url_"]');
        const assetInput = slot.querySelector('input[name^="asset_"]');
        addRemovedAssetFromSlot(slot);
        fileInput.value = "";
        urlInput.value = "";
        assetInput.value = "";
        preview.classList.remove("has-image");
        preview.innerHTML = "<span>이미지 없음</span>";
      }

      formHost.querySelectorAll(".image-field").forEach((slot) => {
        const fileInput = slot.querySelector(".image-input");
        const preview = slot.querySelector(".image-preview");
        const urlInput = slot.querySelector('input[name^="url_"]');
        const assetInput = slot.querySelector('input[name^="asset_"]');

        fileInput.addEventListener("change", () => {
          const file = fileInput.files[0];
          if (!file) return;
          preview.classList.add("has-image");
          preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="선택 이미지 미리보기">`;
          urlInput.value = "";
          assetInput.value = "";
        });
      });

      formHost.querySelectorAll(".image-clear-form").forEach((button) => {
        button.addEventListener("click", () => {
          const slot = formHost.querySelector(`[data-image-field="${button.dataset.targetImageField}"]`);
          if (slot) clearSlot(slot);
        });
      });
    }

    function setSelectValues(form) {
      if (!editingItem) return;
      form.querySelectorAll("select[name]").forEach((select) => {
        const value = editingItem[select.name];
        if (value !== undefined && value !== null) select.value = String(value);
      });
    }

    function renderForm() {
      removedAssets = [];
      const isEdit = Boolean(editingItem);
      formHost.innerHTML = `
        <h2>${isEdit ? "정보 수정" : "신규 등록"}</h2>
        <form class="form-grid" id="entryForm">
          ${fieldSets[kind].map(inputFor).join("")}
          ${renderImageFields()}
          <div class="form-actions">
            <button class="primary-button" type="submit"><span class="material-symbols-outlined">save</span>${isEdit ? "수정 저장" : "저장"}</button>
            ${renderImageActionButtons()}
            ${isEdit ? `<button class="ghost-button" type="button" id="cancelEdit"><span class="material-symbols-outlined">close</span>취소</button>` : ""}
          </div>
        </form>`;

      const form = document.getElementById("entryForm");
      setSelectValues(form);
      bindImageFields();

      const cancel = document.getElementById("cancelEdit");
      if (cancel) cancel.addEventListener("click", () => {
        editingItem = null;
        renderForm();
      });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          const payload = normalize(new FormData(form));
          const uploadedAssetIds = await applyImagePayload(payload, form);
          compactActorImages(payload);

          if (isEdit) {
            data = await Store.update(kind, editingItem[primaryKey], payload);
            await Store.updateMediaOwner(uploadedAssetIds, editingItem[primaryKey]);
          } else {
            data = await Store.create(kind, payload);
            const created = data[kind][0];
            if (created && primaryKey) await Store.updateMediaOwner(uploadedAssetIds, created[primaryKey]);
          }

          for (const asset of removedAssets) await Store.deleteMedia(asset);
          editingItem = null;
          renderForm();
          renderTable();
          UI.setDbStatus(Store.getStatus());
        } catch (error) {
          alert(`저장 실패: ${error.message}`);
        }
      });
    }

    function thumb(url, label) {
      if (!url) return `<span class="muted-text">없음</span>`;
      return `<img class="table-thumb" src="${UI.escapeHtml(url)}" alt="${UI.escapeHtml(label)}">`;
    }

    function rowActions(item) {
      const key = UI.escapeHtml(item[primaryKey]);
      return `
        <div class="table-actions">
          <button class="link-button table-edit" type="button" data-key="${key}">수정</button>
          <button class="link-button danger-link table-delete" type="button" data-key="${key}">삭제</button>
        </div>`;
    }

    function tableRows(items) {
      if (kind === "movies") {
        return items.map((item) => `<tr><td>${thumb(item.poster_url, item.title)}</td><td>${UI.escapeHtml(item.movie_code)}</td><td>${UI.escapeHtml(item.title)}</td><td>${UI.escapeHtml(item.category_name)}</td><td>${UI.escapeHtml(item.actor_name)}</td><td><span class="rating">${UI.escapeHtml(item.rating_grade)}</span></td><td>${UI.escapeHtml(Store.effectiveClickCount(item))}</td><td>${UI.escapeHtml(item.ranking_score || 0)}</td><td>${rowActions(item)}</td></tr>`).join("");
      }
      if (kind === "categories") {
        return items.map((item) => `<tr><td>${thumb(item.representative_image_url, item.name)}</td><td>${UI.escapeHtml(item.category_code)}</td><td>${UI.escapeHtml(item.name)}</td><td>${item.is_visible === false ? "미전시" : "전시"}</td><td>${rowActions(item)}</td></tr>`).join("");
      }
      if (kind === "actors") {
        return items.map((item) => `<tr><td>${thumb(item.representative_image_url, item.name)}</td><td>${UI.escapeHtml(item.name)}</td><td>${UI.escapeHtml(item.age)}</td><td>${UI.escapeHtml(item.height_cm)}cm</td><td>${UI.escapeHtml(item.body_size)}</td><td>${UI.escapeHtml(item.debut_year)}</td><td>${rowActions(item)}</td></tr>`).join("");
      }
      return items.map((item) => `<tr><td><span class="rating">${UI.escapeHtml(item.grade)}</span></td><td>${UI.escapeHtml(item.display_order)}</td><td>${rowActions(item)}</td></tr>`).join("");
    }

    function headerRow() {
      if (kind === "movies") return "<tr><th>포스터</th><th>영화코드</th><th>영화제목</th><th>카테고리</th><th>주연배우</th><th>평가등급</th><th>클릭수</th><th>랭킹</th><th>관리</th></tr>";
      if (kind === "categories") return "<tr><th>대표이미지</th><th>코드</th><th>카테고리명</th><th>전시여부</th><th>관리</th></tr>";
      if (kind === "actors") return "<tr><th>대표이미지</th><th>배우명</th><th>나이</th><th>신장</th><th>신체사이즈</th><th>데뷔년도</th><th>관리</th></tr>";
      return "<tr><th>평가등급</th><th>정렬순서</th><th>관리</th></tr>";
    }

    function renderTable() {
      const items = data[kind] || [];
      tableHost.innerHTML = `
        <h2>등록 목록</h2>
        <table>
          <thead>${headerRow()}</thead>
          <tbody>${tableRows(items)}</tbody>
        </table>`;

      tableHost.querySelectorAll(".table-edit").forEach((button) => {
        button.addEventListener("click", () => {
          editingItem = items.find((item) => String(item[primaryKey]) === String(button.dataset.key)) || null;
          renderForm();
          formHost.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });

      tableHost.querySelectorAll(".table-delete").forEach((button) => {
        button.addEventListener("click", async () => {
          const item = items.find((entry) => String(entry[primaryKey]) === String(button.dataset.key));
          if (!item) return;
          const label = item.title || item.name || item.category_code || item.grade || item[primaryKey];
          if (!confirm(`삭제하시겠습니까?\n\n${label}`)) return;

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
  }

  window.CineTubeAdminPage = { init };
})();
