const fs = require('fs');
const path = require('path');

// 1. Read Supabase config
const configPath = path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js');
if (!fs.existsSync(configPath)) {
  console.error("Supabase config file not found at:", configPath);
  process.exit(1);
}

const configContent = fs.readFileSync(configPath, 'utf8');
const urlMatch = configContent.match(/url:\s*"([^"]+)"/);
const keyMatch = configContent.match(/anonKey:\s*"([^"]+)"/);

if (!urlMatch || !keyMatch) {
  console.error("Failed to parse Supabase url or anonKey from config.");
  process.exit(1);
}

const supabaseUrl = urlMatch[1];
const supabaseKey = keyMatch[1];

const HEADERS = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Raw parsed movies from step HTML
const moviesToRegister = [
  {
    title: "FSDSS-683 아르바이트 끝에서 내가 좋아하게 된 그 딸은 모두와… 토키타 아미",
    video_url: "https://javtiful.com/kr/video/106544/fsdss-683-reducing-mosaic",
    movie_code: "FSDSS-683",
    poster_url: "https://javtiful.com/uploads/uploads/videos/thumbs/2026/04/19/4c9331c91f00c4dd1a330b8423e2badf.jpg",
    duration: "02:04:34",
    timeAgo: "41일 전"
  },
  {
    title: "FSDSS-456 맞은편의 집에서 유혹해 오는 시골의 청순 미소녀는 젊은 절륜 성욕으로 오로지 성교를 요구한다 토키타 아미",
    video_url: "https://javtiful.com/kr/video/106223/fsdss-456-reducing-mosaic",
    movie_code: "FSDSS-456",
    poster_url: "https://javtiful.com/uploads/uploads/videos/thumbs/2026/04/12/a613789a2adeab3dda6cb4d774e81e7c.jpg",
    duration: "02:03:22",
    timeAgo: "49일 전"
  },
  {
    title: "FNS-067 수영복 매니아 점착 아저씨의 개인 촬영 떠오르는 발기 젖꼭지, 큰 엉덩이에 먹는 딱따구리 수영복.",
    video_url: "https://javtiful.com/kr/video/89849/fns-067-reducing-mosaic",
    movie_code: "FNS-067",
    poster_url: "https://javtiful.com/uploads/uploads/videos/thumbs/2025/07/28/80ed31900ccaac901a1dde0e16c74dfc.jpg",
    duration: "02:21:16",
    timeAgo: "307일 전"
  },
  {
    title: "FNS-046 무시무시한 소금 대응 J계를 하룻밤 내내 다듬는 점착 P활성교 토시다 아미",
    video_url: "https://javtiful.com/kr/video/87194/fns-046-reducing-mosaic",
    movie_code: "FNS-046",
    poster_url: "https://javtiful.com/uploads/uploads/videos/thumbs/2025/06/18/4e21c0d83f0eb086f6a808c69968b355.jpg",
    duration: "02:04:00",
    timeAgo: "347일 전"
  },
  {
    title: "FNS-010 토키타 아미의 얼굴로 누드! 【완전 주관】",
    video_url: "https://javtiful.com/kr/video/83899/fns-010-reducing-mosaic",
    movie_code: "FNS-010",
    poster_url: "https://javtiful.com/uploads/uploads/videos/thumbs/2025/04/28/349e5b16306b8d653652fc595a0b3e21.jpg",
    duration: "02:04:06",
    timeAgo: "398일 전"
  },
  {
    title: "FSDSS-990 싫은 얼굴이면서도 가랑이까지 해 준 밀기에 약한 에스테티션의 자택의 “안”까지 “붙어와” 토키타 아미",
    video_url: "https://javtiful.com/kr/video/83021/fsdss-990-reducing-mosaic",
    movie_code: "FSDSS-990",
    poster_url: "https://javtiful.com/uploads/uploads/videos/thumbs/2025/04/14/b05966af4647d55ed685c745f599e804.jpg",
    duration: "02:37:08",
    timeAgo: "412일 전"
  },
  {
    title: "FSDSS-574 놀이 반으로 가정교사를 발기시켜 미소짓는 색녀 아미쨩. 토키타 아미",
    video_url: "https://javtiful.com/kr/video/77938/fsdss-574-reducing-mosaic",
    movie_code: "FSDSS-574",
    poster_url: "https://javtiful.com/uploads/uploads/videos/thumbs/2025/02/07/80a38095234167d2d66d2014da8f1db4.jpg",
    duration: "02:05:01",
    timeAgo: "478일 전"
  },
  {
    title: "FSDSS-976 종전후에 친구의 그녀로부터 달콤한 권유…",
    video_url: "https://javtiful.com/kr/video/76552/fsdss-976-reducing-mosaic",
    movie_code: "FSDSS-976",
    poster_url: "https://javtiful.com/uploads/uploads/videos/thumbs/2025/01/20/62da583cdf9c85701e203087e427f578.jpg",
    duration: "02:02:52",
    timeAgo: "496일 전"
  },
  {
    title: "FSDSS-729 동정 너무 훌쩍일 것 같은 나는 어린 친숙함과 천을 넘어 3cm 삽입으로 섹스의 연습을 계속… 토키타 아미",
    video_url: "https://javtiful.com/kr/video/54162/fsdss-729-reducing-mosaic",
    movie_code: "FSDSS-729",
    poster_url: "https://javtiful.com/uploads/uploads/videos/thumbs/2024/02/29/56e29562f020a7bae27441090a1a696f.jpg",
    duration: "02:03:07",
    timeAgo: "822일 전"
  }
];

function parseReleaseMonth(timeAgo) {
  const baseDate = new Date('2026-05-31');
  
  const dayMatch = timeAgo.match(/(\d+)일 전/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    const date = new Date(baseDate.getTime() - days * 24 * 60 * 60 * 1000);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }
  
  const monthMatch = timeAgo.match(/(\d+)달 전/);
  if (monthMatch) {
    const months = parseInt(monthMatch[1], 10);
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() - months, 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }
  
  return '2026-05';
}

async function registerAll() {
  const actorName = "Tokita Ami";
  const categoryCode = "reducing-mosaic";
  
  // 2. Query or create the actor
  console.log(`Checking if actor '${actorName}' exists in database...`);
  const actorRes = await fetch(`${supabaseUrl}/rest/v1/actors?name=eq.${encodeURIComponent(actorName)}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  
  let actorId;
  let actorAction = "";
  
  if (actorRes.ok) {
    const actors = await actorRes.json();
    if (actors.length > 0) {
      actorId = actors[0].id;
      actorAction = "Reused existing actor";
      console.log(`Actor found. ID: ${actorId}`);
    } else {
      console.log(`Actor not found. Creating actor '${actorName}'...`);
      const actorBody = {
        name: actorName,
        age: 25,
        height_cm: 160,
        body_size: "B83-W56-H86",
        debut_year: 2021,
        representative_image_url: "https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/7aa3986227f5207cb678b0beecf62e2c.jpg",
        image_urls: [
          "https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/7aa3986227f5207cb678b0beecf62e2c.jpg"
        ]
      };
      
      const createRes = await fetch(`${supabaseUrl}/rest/v1/actors`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify([actorBody])
      });
      
      if (createRes.ok) {
        const created = await createRes.json();
        actorId = created[0].id;
        actorAction = "Created new actor";
        console.log(`Created actor successfully. ID: ${actorId}`);
      } else {
        console.error("Failed to create actor:", await createRes.text());
        process.exit(1);
      }
    }
  } else {
    console.error("Failed to query actor:", await actorRes.text());
    process.exit(1);
  }

  // Update actor image gallery with some top movie poster URLs
  const topPosters = moviesToRegister.slice(0, 4).map(m => m.poster_url);
  if (topPosters.length > 0) {
    console.log("Updating actor gallery with movie posters...");
    await fetch(`${supabaseUrl}/rest/v1/actors?id=eq.${actorId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_urls: [
          "https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/7aa3986227f5207cb678b0beecf62e2c.jpg",
          ...topPosters
        ]
      })
    });
  }

  // 3. Register movies
  console.log(`Registering ${moviesToRegister.length} movies...`);
  let insertedCount = 0;
  let updatedCount = 0;
  
  for (let i = 0; i < moviesToRegister.length; i++) {
    const movie = moviesToRegister[i];
    const releaseMonth = parseReleaseMonth(movie.timeAgo);
    
    // Assign rating grades alternating beautifully
    let rating_grade = 'A';
    if (i < 2) rating_grade = 'A+';
    else if (i < 5) rating_grade = 'A';
    else rating_grade = 'B+';
    
    const recommendation_score = Math.max(94 - i, 75);
    
    // Map production company dynamically based on code
    let production_company = "Faleno";
    if (movie.movie_code.startsWith("FSDSS")) {
      production_company = "Faleno Star";
    } else if (movie.movie_code.startsWith("FNS")) {
      production_company = "Faleno Neo";
    }
    
    const movieData = {
      title: movie.title,
      movie_code: movie.movie_code,
      category_code: categoryCode,
      actor_id: actorId,
      keywords: [actorName, production_company, "Reducing", "Featured Actress"],
      rating_grade,
      video_url: movie.video_url,
      description: `Javtiful 개별 영상 페이지 기준으로 등록한 Tokita Ami 작품 (${movie.movie_code}) 입니다.`,
      poster_url: movie.poster_url,
      capture_url: movie.poster_url, // Fallback to poster
      snapshot_url: movie.poster_url, // Fallback to poster
      release_month: releaseMonth,
      production_company,
      recommendation_score
    };
    
    // Check if movie already exists
    const checkRes = await fetch(`${supabaseUrl}/rest/v1/movies?movie_code=eq.${encodeURIComponent(movie.movie_code)}`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    
    if (checkRes.ok) {
      const existing = await checkRes.json();
      if (existing.length > 0) {
        // Update (PATCH)
        const updateRes = await fetch(`${supabaseUrl}/rest/v1/movies?movie_code=eq.${encodeURIComponent(movie.movie_code)}`, {
          method: 'PATCH',
          headers: HEADERS,
          body: JSON.stringify(movieData)
        });
        if (updateRes.ok) {
          updatedCount++;
        } else {
          console.error(`Failed to update movie ${movie.movie_code}:`, await updateRes.text());
        }
      } else {
        // Insert (POST)
        const insertRes = await fetch(`${supabaseUrl}/rest/v1/movies`, {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify([movieData])
        });
        if (insertRes.ok) {
          insertedCount++;
        } else {
          console.error(`Failed to insert movie ${movie.movie_code}:`, await insertRes.text());
        }
      }
    } else {
      console.error(`Failed to verify movie existence for ${movie.movie_code}:`, await checkRes.text());
    }
  }
  
  console.log("\n=================== Registration Summary ===================");
  console.log(`Actor Name: ${actorName}`);
  console.log(`Actor Status: ${actorAction} (ID: ${actorId})`);
  console.log(`Category: ${categoryCode} (Reducing Mosaic)`);
  console.log(`Total Movies Parsed: ${moviesToRegister.length}`);
  console.log(`Movies Inserted: ${insertedCount}`);
  console.log(`Movies Updated: ${updatedCount}`);
  console.log("============================================================\n");
}

registerAll().catch(err => {
  console.error("Error during registration process:", err);
});
