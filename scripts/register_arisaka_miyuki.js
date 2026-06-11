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

// 2. Locate downloaded Javtiful HTML content
const contentPath = 'C:\\Users\\mohen\\.gemini\\antigravity-ide\\brain\\1ae1669c-dab1-4f4a-8d0d-f28a5676ffa8\\.system_generated\\steps\\147\\content.md';
if (!fs.existsSync(contentPath)) {
  console.error("Downloaded HTML content file not found at:", contentPath);
  process.exit(1);
}

const html = fs.readFileSync(contentPath, 'utf8');

// 3. Parse movies from HTML
const movies = [];
const articleRegex = /<article class="front-video-card">([\s\S]*?)<\/article>/g;
let match;

while ((match = articleRegex.exec(html)) !== null) {
  const content = match[1];
  
  if (content.includes('reducing-mosaic') || content.includes('Reducing')) {
    const hrefMatch = content.match(/href="([^"]+)"/);
    const href = hrefMatch ? hrefMatch[1] : '';
    
    let poster = '';
    const lazySrcMatch = content.match(/data-front-lazy-src="([^"]+)"/);
    if (lazySrcMatch) {
      poster = lazySrcMatch[1];
    } else {
      const srcMatch = content.match(/src="([^"]+)"/);
      if (srcMatch) poster = srcMatch[1];
    }
    
    // Normalize poster URL to high quality
    if (poster && poster.endsWith('-sm.jpg')) {
      poster = poster.replace('-sm.jpg', '.jpg');
    }
    
    const titleMatch = content.match(/class="front-video-title">([^<]+)<\/a>/);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    const durationMatch = content.match(/class="front-duration-tag">([^<]+)</);
    const duration = durationMatch ? durationMatch[1].trim() : '';
    
    const dateMatch = content.match(/<span>([^<]+)<\/span>\s*<\/div>/);
    const timeAgo = dateMatch ? dateMatch[1].trim() : '';
    
    let movieCode = '';
    const codeMatch = href.match(/\/video\/\d+\/([a-zA-Z0-9\-]+)/);
    if (codeMatch) {
      movieCode = codeMatch[1].toUpperCase();
    } else {
      const titleCodeMatch = title.match(/^([a-zA-Z0-9\-]+)/);
      if (titleCodeMatch) {
        movieCode = titleCodeMatch[1].toUpperCase();
      }
    }
    
    if (movieCode.endsWith('-REDUCING-MOSAIC')) {
      movieCode = movieCode.replace('-REDUCING-MOSAIC', '');
    }
    
    movies.push({
      title,
      video_url: href.startsWith('http') ? href : `https://javtiful.com${href}`,
      movie_code: movieCode,
      poster_url: poster.startsWith('http') ? poster : `https://javtiful.com${poster}`,
      duration,
      timeAgo
    });
  }
}

console.log(`Parsed ${movies.length} Reducing movies for Arisaka Miyuki.`);

// Helper function to calculate release month from "timeAgo" relative to May 31, 2026
function parseReleaseMonth(timeAgo) {
  const baseDate = new Date('2026-05-31');
  
  if (timeAgo.includes('시간 전')) {
    return '2026-05';
  }
  
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
  const actorName = "Arisaka Miyuki";
  
  // 4. Query or create the actor
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
      console.log(`Actor exists. ID: ${actorId}`);
    } else {
      console.log("Actor not found. Creating new actor...");
      // Add Arisaka Miyuki details
      const actorBody = {
        name: actorName,
        age: 28,
        height_cm: 161,
        body_size: "B82-W55-H84",
        debut_year: 2017,
        representative_image_url: "https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/5b9c92ca67495f540dcbf1642c55cb71.jpg",
        image_urls: [
          "https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/5b9c92ca67495f540dcbf1642c55cb71.jpg"
        ]
      };
      
      const createRes = await fetch(`${supabaseUrl}/rest/v1/actors`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(actorBody)
      });
      
      if (createRes.ok) {
        const created = await createRes.json();
        actorId = created[0].id;
        actorAction = "Created new actor";
        console.log(`Created actor successfully. ID: ${actorId}`);
      } else {
        console.error("Failed to create actor:", createRes.status, await createRes.text());
        process.exit(1);
      }
    }
  } else {
    console.error("Failed to query actor:", actorRes.status, await actorRes.text());
    process.exit(1);
  }
  
  // Update image_urls array with some movie posters to fill the actor gallery beautifully
  const topPosters = movies.slice(0, 4).map(m => m.poster_url);
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
          "https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/5b9c92ca67495f540dcbf1642c55cb71.jpg",
          ...topPosters
        ]
      })
    });
  }

  // 5. Register movies
  console.log(`Registering ${movies.length} movies...`);
  let insertedCount = 0;
  let updatedCount = 0;
  
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    const releaseMonth = parseReleaseMonth(movie.timeAgo);
    
    // Assign rating grades alternating beautifully
    let rating_grade = 'A';
    if (i < 2) rating_grade = 'A+';
    else if (i < 4) rating_grade = 'A';
    else rating_grade = 'B+';
    
    const recommendation_score = Math.max(93 - i, 75);
    
    // Map production company dynamically based on code
    let production_company = "Moodyz";
    if (movie.movie_code.startsWith("DASD")) {
      production_company = "DAS";
    } else if (movie.movie_code.startsWith("JUY")) {
      production_company = "Honnaka";
    } else if (movie.movie_code.startsWith("HND")) {
      production_company = "Honeypot";
    }
    
    const movieData = {
      title: movie.title,
      movie_code: movie.movie_code,
      category_code: "reducing-mosaic",
      actor_id: actorId,
      keywords: ["Arisaka Miyuki", production_company, "Reducing", "Featured Actress"],
      rating_grade,
      video_url: movie.video_url,
      description: `Javtiful 개별 영상 페이지 기준으로 등록한 Arisaka Miyuki 작품 (${movie.movie_code}) 입니다.`,
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
          console.error(`Failed to update movie ${movie.movie_code}:`, updateRes.status, await updateRes.text());
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
          console.error(`Failed to insert movie ${movie.movie_code}:`, insertRes.status, await insertRes.text());
        }
      }
    } else {
      console.error(`Failed to verify movie existence for ${movie.movie_code}:`, checkRes.status, await checkRes.text());
    }
  }
  
  console.log("\n=================== Registration Summary ===================");
  console.log(`Actor Name: ${actorName}`);
  console.log(`Actor Status: ${actorAction} (ID: ${actorId})`);
  console.log(`Category: reducing-mosaic (Reducing Mosaic)`);
  console.log(`Total Movies Parsed: ${movies.length}`);
  console.log(`Movies Inserted: ${insertedCount}`);
  console.log(`Movies Updated: ${updatedCount}`);
  console.log("============================================================\n");
}

registerAll().catch(err => {
  console.error("Error during registration process:", err);
});











