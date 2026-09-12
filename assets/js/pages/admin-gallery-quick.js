(function () {
  const UI = window.CineTubeUI;
  const Store = window.CineTubeStore;

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const quickStatus = document.getElementById("quickStatus");

  const reviewGrid = document.getElementById("reviewGrid");
  const reviewCountEl = document.getElementById("reviewCount");
  const reviewTodayButton = document.getElementById("reviewTodayButton");
  const reviewRefreshButton = document.getElementById("reviewRefreshButton");
  const searchInput = document.getElementById("searchInput");

  let pendingFiles = [];
  let processing = false;
  let statusTimer = null;
  let reviewItems = [];
  let reviewTodayOnly = false;

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
    const slug = compactSlug(seed).slice(0, 20);
    const rand = Math.random().toString(36).slice(2, 6);
    return `GAL-${stamp}-${slug ? `${slug}-` : ""}${rand}`.toUpperCase();
  }

  function titleFromFile(fileName = "") {
    const base = String(fileName || "").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    return base || `Gallery ${new Date().toISOString().slice(0, 10)}`;
  }

  function normalizeFile(file, source) {
    const looksGeneric = !file.name || /^image\.(png|jpe?g|gif|webp)$/i.test(file.name);
    if (!looksGeneric) return file;
    const extension = (file.type.split("/")[1] || "png").replace("jpeg", "jpg");
    const fileName = `${source}-gallery-${Date.now()}-${Math.random().toString(16).slice(2, 6)}.${extension}`;
    return new File([file], fileName, { type: file.type || "image/png" });
  }

  function imageFilesFromClipboard(event) {
    const items = event.clipboardData?.items || [];
    const files = [];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    return files;
  }

  function setStatus(text, kind) {
    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }
    quickStatus.textContent = text;
    quickStatus.className = `quick-status is-${kind}`;
    quickStatus.style.display = text ? "flex" : "none";
    if (kind === "done") {
      statusTimer = setTimeout(() => { quickStatus.style.display = "none"; }, 4000);
    }
  }

  function addFiles(fileList, source) {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    files.forEach((rawFile) => pendingFiles.push({ file: normalizeFile(rawFile, source), source }));
    processQueue();
  }

  async function processQueue() {
    if (processing) return;
    processing = true;
    while (pendingFiles.length) {
      const { file, source } = pendingFiles.shift();
      await saveFile(file, source);
    }
    processing = false;
  }

  async function saveFile(file, source) {
    const waiting = pendingFiles.length;
    setStatus(`저장 중... ${file.name}${waiting ? ` (대기 ${waiting}장)` : ""}`, "uploading");
    try {
      const title = titleFromFile(file.name);
      const payload = {
        gallery_image_id: galleryAutoId(file.name),
        title,
        description: file.name ? `이미지 파일 ${file.name}` : "클립보드에서 붙여넣은 이미지",
        source,
        tags: ["gallery"],
        is_visible: true
      };
      const media = await Store.uploadMedia({ file, ownerTable: "galleryImages", ownerField: "image", ownerId: null, sortOrder: 0 });
      payload.image_url = media.public_url;
      payload.image_asset_id = media.id;
      const data = await Store.create("galleryImages", payload);
      const created = (data.galleryImages || []).find((entry) => String(entry.gallery_image_id) === String(payload.gallery_image_id)) || data.galleryImages[0];
      if (created?.id != null) await Store.updateMediaOwner([media.id], created.id);
      UI.setDbStatus(Store.getStatus());
      if (created) {
        reviewItems = [created, ...reviewItems.filter((entry) => String(entry.id) !== String(created.id))];
        renderReview();
      }
      setStatus(`저장 완료: ${title}`, "done");
    } catch (error) {
      setStatus(`저장 실패 (${file.name}): ${error.message || "알 수 없는 오류"}`, "error");
    }
  }

  function assetThumb(item) {
    return item.image_asset?.thumb_url || item.image_url || item.image_asset?.public_url || "";
  }

  async function deleteReviewItem(item) {
    if (!confirm(`삭제하시겠습니까?\n\n${item.title}`)) return;
    setStatus(`삭제 중... ${item.title}`, "uploading");
    try {
      await Store.remove("galleryImages", item.id);
      await Store.deleteMedia(item.image_asset);
      reviewItems = reviewItems.filter((entry) => String(entry.id) !== String(item.id));
      renderReview();
      UI.setDbStatus(Store.getStatus());
      setStatus(`삭제 완료: ${item.title}`, "done");
    } catch (error) {
      setStatus(`삭제 실패: ${error.message || "알 수 없는 오류"}`, "error");
    }
  }

  function renderReviewCount(displayedCount, totalCount) {
    if (!reviewItems.length) {
      reviewCountEl.textContent = "";
      return;
    }
    reviewCountEl.textContent = displayedCount < totalCount ? ` (${displayedCount}/${totalCount})` : ` (${totalCount})`;
  }

  function renderReview() {
    const term = (searchInput?.value || "").trim().toLowerCase();
    const todayStr = new Date().toISOString().slice(0, 10);
    let items = reviewItems;
    if (reviewTodayOnly) {
      items = items.filter((item) => String(item.regdate || item.created_at || "").slice(0, 10) === todayStr);
    }
    if (term) {
      items = items.filter((item) => {
        const tags = Array.isArray(item.tags) ? item.tags.join(" ") : item.tags || "";
        return [item.title, item.gallery_image_id, tags, item.source].join(" ").toLowerCase().includes(term);
      });
    }
    const shown = items.slice(0, 2);
    renderReviewCount(shown.length, items.length);

    if (!items.length) {
      reviewGrid.innerHTML = `<div class="empty">표시할 등록 이미지가 없습니다.</div>`;
      return;
    }
    reviewGrid.innerHTML = shown.map((item) => {
      const tags = Array.isArray(item.tags) ? item.tags.join(", ") : item.tags || "";
      const url = assetThumb(item);
      return `
        <div class="quick-review-card">
          <div class="quick-review-thumb">${url ? `<img src="${UI.escapeHtml(url)}" alt="${UI.escapeHtml(item.title)}">` : `<span class="muted-text">이미지 없음</span>`}</div>
          <h3 title="${UI.escapeHtml(item.title)}">${UI.escapeHtml(item.title)}</h3>
          <div class="quick-review-meta">
            <span class="summary-pill">${item.is_visible === false ? "미전시" : "전시"}</span>
            <span class="summary-pill">${UI.escapeHtml(tags || "-")}</span>
          </div>
          <div class="quick-review-actions">
            <a class="link-button" href="gallery-images.html">갤러리 관리에서 보기</a>
            <button class="link-button danger-link" type="button" data-review-delete="${UI.escapeHtml(item.id)}" aria-label="${UI.escapeHtml(item.title)} 삭제"><span class="material-symbols-outlined" aria-hidden="true">delete</span>삭제</button>
          </div>
        </div>`;
    }).join("");
  }

  async function loadReview() {
    if (Store.loadGalleryImagesWithUrls) await Store.loadGalleryImagesWithUrls();
    const data = await Store.load();
    reviewItems = data.galleryImages || [];
    UI.setDbStatus(Store.getStatus());
    renderReview();
  }

  function bindEvents() {
    fileInput.addEventListener("change", () => {
      addFiles(fileInput.files, "file-upload");
      fileInput.value = "";
    });
    dropzone.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      fileInput.click();
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add("drag-over");
      });
    });
    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove("drag-over");
      });
    });
    dropzone.addEventListener("drop", (event) => {
      addFiles(event.dataTransfer?.files, "file-upload");
    });

    document.addEventListener("paste", (event) => {
      const target = event.target;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const files = imageFilesFromClipboard(event);
      if (!files.length) return;
      event.preventDefault();
      addFiles(files, "clipboard");
    });

    reviewTodayButton.addEventListener("click", () => {
      reviewTodayOnly = !reviewTodayOnly;
      reviewTodayButton.classList.toggle("active", reviewTodayOnly);
      renderReview();
    });
    reviewRefreshButton.addEventListener("click", loadReview);
    searchInput?.addEventListener("input", renderReview);
    reviewGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-review-delete]");
      if (!button) return;
      const item = reviewItems.find((entry) => String(entry.id) === String(button.dataset.reviewDelete));
      if (item) deleteReviewItem(item);
    });
  }

  async function init() {
    UI.setupChrome();
    await Store.load();
    UI.setDbStatus(Store.getStatus());
    bindEvents();
    await loadReview();
  }

  init();
})();
