(function () {
  const fieldSets = {
    movies: [
      ["title", "영화제목"], ["movie_code", "영화코드"], ["category_code", "카테고리", "category"], ["actor_id", "주연배우", "actor"], ["keywords", "키워드(쉼표 구분)"],
      ["rating_grade", "평가등급", "rating"], ["video_url", "영상링크"], ["description", "주요내용", "textarea"], ["poster_url", "포스터 URL"], ["capture_url", "캡쳐 URL"],
      ["snapshot_url", "스냅샷 URL"], ["release_month", "출시년월"], ["production_company", "제작사"], ["recommendation_score", "추천점수", "number"]
    ],
    categories: [
      ["category_code", "카테고리코드"], ["name", "카테고리명"], ["representative_image_url", "카테고리대표이미지"], ["is_visible", "전시여부", "boolean"]
    ],
    actors: [
      ["name", "배우명"], ["age", "나이", "number"], ["height_cm", "신장", "number"], ["body_size", "신체사이즈"], ["debut_year", "데뷔년도", "number"],
      ["representative_image_url", "주연배우대표이미지"], ["image_urls", "주연배우일반이미지 4개(쉼표 구분)", "textarea"]
    ],
    ratings: [
      ["grade", "평가등급"], ["display_order", "정렬순서", "number"]
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

    function optionList(type) {
      if (type === "category") return data.categories.map((item) => `<option value="${UI.escapeHtml(item.category_code)}">${UI.escapeHtml(item.name)}</option>`).join("");
      if (type === "actor") return data.actors.map((item) => `<option value="${UI.escapeHtml(item.id)}">${UI.escapeHtml(item.name)}</option>`).join("");
      if (type === "rating") return data.ratings.map((item) => `<option value="${UI.escapeHtml(item.grade)}">${UI.escapeHtml(item.grade)}</option>`).join("");
      return "";
    }

    function inputFor([name, label, type]) {
      if (type === "textarea") return `<label>${label}<textarea class="input-control" name="${name}" rows="4"></textarea></label>`;
      if (type === "boolean") return `<label>${label}<select class="select-control" name="${name}"><option value="true">전시</option><option value="false">미전시</option></select></label>`;
      if (type === "category" || type === "actor" || type === "rating") return `<label>${label}<select class="select-control" name="${name}">${optionList(type)}</select></label>`;
      return `<label>${label}<input class="input-control" name="${name}" type="${type || "text"}"></label>`;
    }

    function normalize(formData) {
      const payload = Object.fromEntries(formData.entries());
      if (kind === "movies") {
        payload.actor_id = Number(payload.actor_id);
        payload.keywords = payload.keywords ? payload.keywords.split(",").map((item) => item.trim()).filter(Boolean) : [];
        payload.recommendation_score = Number(payload.recommendation_score || 0);
      }
      if (kind === "categories") payload.is_visible = payload.is_visible === "true";
      if (kind === "actors") {
        payload.age = Number(payload.age || 0);
        payload.height_cm = Number(payload.height_cm || 0);
        payload.debut_year = Number(payload.debut_year || 0);
        payload.image_urls = payload.image_urls ? payload.image_urls.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 4) : [];
      }
      if (kind === "ratings") payload.display_order = Number(payload.display_order || 99);
      return payload;
    }

    function renderForm() {
      formHost.innerHTML = `
        <h2>신규 등록</h2>
        <form class="form-grid" id="entryForm">
          ${fieldSets[kind].map(inputFor).join("")}
          <button class="primary-button" type="submit"><span class="material-symbols-outlined">save</span>저장</button>
          <p class="form-note">Supabase 설정이 없으면 현재 화면에서만 샘플 데이터로 추가됩니다.</p>
        </form>`;

      document.getElementById("entryForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          data = await Store.create(kind, normalize(new FormData(event.currentTarget)));
          event.currentTarget.reset();
          renderTable();
          UI.setDbStatus(Store.getStatus());
        } catch (error) {
          alert(`저장 실패: ${error.message}`);
        }
      });
    }

    function tableRows(items) {
      if (kind === "movies") {
        return items.map((item) => `<tr><td>${UI.escapeHtml(item.movie_code)}</td><td>${UI.escapeHtml(item.title)}</td><td>${UI.escapeHtml(item.category_name)}</td><td>${UI.escapeHtml(item.actor_name)}</td><td><span class="rating">${UI.escapeHtml(item.rating_grade)}</span></td></tr>`).join("");
      }
      if (kind === "categories") {
        return items.map((item) => `<tr><td>${UI.escapeHtml(item.category_code)}</td><td>${UI.escapeHtml(item.name)}</td><td>${item.is_visible === false ? "미전시" : "전시"}</td><td>${UI.escapeHtml(item.representative_image_url || "")}</td></tr>`).join("");
      }
      if (kind === "actors") {
        return items.map((item) => `<tr><td>${UI.escapeHtml(item.name)}</td><td>${UI.escapeHtml(item.age)}</td><td>${UI.escapeHtml(item.height_cm)}cm</td><td>${UI.escapeHtml(item.body_size)}</td><td>${UI.escapeHtml(item.debut_year)}</td></tr>`).join("");
      }
      return items.map((item) => `<tr><td><span class="rating">${UI.escapeHtml(item.grade)}</span></td><td>${UI.escapeHtml(item.display_order)}</td></tr>`).join("");
    }

    function headerRow() {
      if (kind === "movies") return "<tr><th>영화코드</th><th>영화제목</th><th>카테고리</th><th>주연배우</th><th>평가등급</th></tr>";
      if (kind === "categories") return "<tr><th>코드</th><th>카테고리명</th><th>전시여부</th><th>대표이미지</th></tr>";
      if (kind === "actors") return "<tr><th>배우명</th><th>나이</th><th>신장</th><th>신체사이즈</th><th>데뷔년도</th></tr>";
      return "<tr><th>평가등급</th><th>정렬순서</th></tr>";
    }

    function renderTable() {
      const items = data[kind] || [];
      tableHost.innerHTML = `
        <h2>등록 목록</h2>
        <table>
          <thead>${headerRow()}</thead>
          <tbody>${tableRows(items)}</tbody>
        </table>`;
    }

    renderForm();
    renderTable();
  }

  window.CineTubeAdminPage = { init };
})();
