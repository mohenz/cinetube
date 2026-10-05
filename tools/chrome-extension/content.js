// content.js - 123AV / MissAV 페이지에서 실행되어 정보를 파싱하는 스크립트
(function() {
  try {
    const h1Title = document.querySelector("h1")?.textContent?.trim() || document.title || "";
    const pageUrl = window.location.href;
    const host = window.location.hostname;
    const siteLabel = host.includes("123av") ? "123AV"
      : host.includes("missav") ? "MissAV"
      : host.includes("javhdporn") ? "JavHDporn"
      : host.includes("javtiful") ? "Javtiful"
      : host.includes("ijavtorrent") ? "iJavTorrent"
      : host;

    // 1. 영화 코드 파싱 (URL 경로 또는 제목에서 추출)
    // 예: .../ko/v/pred-890-uncensored-leaked -> PRED-890
    // 예: .../ko/v/abp-123 -> ABP-123
    let movieCode = "";
    const urlParts = pageUrl.split("/");
    const slug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || "";
    
    // 슬러그 첫 부분에서 코드 추출 시도 (예: pred-890-...)
    const slugCodeMatch = slug.match(/^([a-z0-9]+-[0-9]+)/i);
    if (slugCodeMatch) {
      movieCode = slugCodeMatch[1].toUpperCase();
    } else {
      // 제목에서 코드 추출 시도 (예: ABP-123 제목...)
      const titleCodeMatch = h1Title.match(/([a-z0-9]+-[0-9]+)/i);
      if (titleCodeMatch) {
        movieCode = titleCodeMatch[1].toUpperCase();
      }
    }

    // 2. 대표 이미지(포스터) 추출
    const posterUrl = document.querySelector('meta[property="og:image"]')?.content || 
                      document.querySelector('meta[name="twitter:image"]')?.content || "";

    // 3. 다국어(한국어/영어) 키값 기반 상세 속성값 추출기
    function getDetailValue(labels) {
      // 123AV/MissAV는 라벨과 값이 다른 태그에 분리되어 있거나, 하나의 텍스트에 들어있을 수 있음
      const allElements = Array.from(document.querySelectorAll("div, p, span, li, td, a"));
      
      for (const el of allElements) {
        // 자식이 없거나 텍스트 노드 위주인 단말 요소만 검사하여 속도가 빠름
        if (el.children.length > 1) continue; 
        const text = el.textContent?.trim() || "";
        
        for (const label of labels) {
          if (text.startsWith(label)) {
            // "코드: PRED-890" 과 같이 한 줄에 들어있는 경우 처리
            let value = text.substring(label.length).trim();
            if (value.startsWith(":")) value = value.substring(1).trim();
            if (value) return value;

            // 라벨과 값이 나란히 배치된 형제 노드인 경우 처리 (예: <span>출시일:</span> <span>2026-09-12</span>)
            const sibling = el.nextElementSibling;
            if (sibling) {
              const sibText = sibling.textContent?.trim() || "";
              if (sibText) return sibText;
            }

            // 부모의 다음 형제 노드로 배치된 경우 처리
            const parentSibling = el.parentElement?.nextElementSibling;
            if (parentSibling) {
              const psText = parentSibling.textContent?.trim() || "";
              if (psText) return psText;
            }
          }
        }
      }
      return "";
    }

    // 각각의 다국어 라벨 매칭 정의
    const codeValue = getDetailValue(["코드", "Code"]) || movieCode;
    const releaseDate = getDetailValue(["출시일", "Release Date", "Release"]);
    const actorText = getDetailValue(["여배우", "Actresses", "Actress"]);
    const genreText = getDetailValue(["장르", "Genres", "Genre"]);
    const makerText = getDetailValue(["제작사", "Maker", "Studio", "Developer"]);
    const tagText = getDetailValue(["태그", "Tags", "Tag"]);

    // 4. 세부 배열 데이터 가공
    const actorNames = actorText ? actorText.split(/,|、/).map(a => a.trim()).filter(Boolean) : [];
    const genres = genreText ? genreText.split(/,|、/).map(g => g.trim()).filter(Boolean) : [];
    const tags = tagText ? tagText.split(/,|、/).map(t => t.trim()).filter(Boolean) : [];

    // 출시년월 추출 (YYYY-MM 형식)
    let releaseMonth = "";
    if (releaseDate) {
      const dateMatch = releaseDate.match(/(20\d{2}|19\d{2})[-/.](0?[1-9]|1[0-2])/);
      if (dateMatch) {
        releaseMonth = `${dateMatch[1]}-${parseInt(dateMatch[2], 10).toString().padStart(2, "0")}`;
      }
    }

    // 5. 비디오 태그나 페이지 인라인 스크립트에서 직접 스트림(.m3u8) 주소 검색 (동기적 1차 시도)
    let inlineStreamUrl = "";
    const videoEl = document.querySelector("video");
    if (videoEl) {
      inlineStreamUrl = videoEl.src || videoEl.querySelector("source")?.src || "";
    }
    if (!inlineStreamUrl) {
      const scripts = Array.from(document.querySelectorAll("script"));
      for (const script of scripts) {
        const code = script.textContent || "";
        const m3u8Match = code.match(/(https?:\/\/[^\s"'`]+\.m3u8[^\s"'`]*)/i);
        if (m3u8Match) {
          inlineStreamUrl = m3u8Match[1];
          break;
        }
      }
    }

    // 6. 깔끔한 제목 가공 (품번 중복 제거)
    let cleanTitle = h1Title;
    if (movieCode) {
      const regex = new RegExp(movieCode.replace("-", "\\s*-?\\s*"), "gi");
      cleanTitle = cleanTitle.replace(regex, "").replace(/\s*[-|]\s*$/, "").trim();
    }
    // "123AV" / "MissAV" 타이틀 테일 제거
    cleanTitle = cleanTitle.replace(/\s*[-|]\s*(Javtiful|Supjav|MissAV|123AV).*$/i, "").trim();

    return {
      success: true,
      data: {
        title: cleanTitle || h1Title,
        movie_code: movieCode || codeValue.toUpperCase(),
        category_code: "missav", // CineTube 기본 카테고리 코드
        actor_names: actorNames.slice(0, 4),
        site_label: siteLabel,
        extra_keywords: [...genres.slice(0, 4), ...tags.slice(0, 2)],
        keywords: [siteLabel, movieCode, ...actorNames.slice(0, 2), ...genres.slice(0, 4), ...tags.slice(0, 2)].filter(Boolean),
        rating_grade: "B+",
        video_url: inlineStreamUrl || pageUrl, // 인라인 검출 실패시 페이지 URL로 폴백 (네트워크 가로채기가 2차 보완)
        source_url: pageUrl,
        description: document.querySelector('meta[name="description"]')?.content || `${siteLabel}에서 추출한 콘텐츠 정보입니다.`,
        poster_url: posterUrl || null,
        capture_url: posterUrl || null,
        release_month: releaseMonth,
        production_company: makerText || "",
        recommendation_score: 80,
        ranking_score: 80,
        is_main: false
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
})();
