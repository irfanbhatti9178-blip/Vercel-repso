// Vercel Serverless Function - Real Threads Downloader API
// File: /api/index.js
// Deploy on Vercel - Free

export default async function handler(req, res) {
  // CORS allow for Blogger
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!url.includes('threads')) {
    return res.status(400).json({ error: 'Invalid Threads URL' });
  }

  try {
    // Fetch Threads page HTML with proper headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Sec-Fetch-Mode': 'navigate',
      }
    });

    const html = await response.text();

    // Method 1: Extract from JSON data in page
    let videoUrl = null;
    let imageUrls = [];
    let username = '';
    let caption = '';

    // Try to find video_versions
    const videoRegex = "/video_versions":\s*\[([^\]]+)\]/g;
    const videoMatch = html.match(/"video_versions":\s*\[.*?\]/s);
    if (videoMatch) {
      try {
        const videoData = JSON.parse(`{${videoMatch[0]}}`);
        // Actually parse properly
        const urlMatches = [...html.matchAll(/"url":\s*"(https:\/\/[^"]+\.mp4[^"]*)"/g)];
        if (urlMatches.length > 0) {
          // Get highest quality
          videoUrl = urlMatches[0][1].replace(/\\u0026/g, '&').replace(/\\/g, '');
        }
      } catch (e) {}
    }

    // Method 2: More robust regex for mp4 urls
    if (!videoUrl) {
      const mp4Regex = /https:\\\/\\\/[^"]+\.mp4[^"]*/g;
      const mp4Matches = [...html.matchAll(mp4Regex)];
      if (mp4Matches.length > 0) {
        videoUrl = mp4Matches[0][0].replace(/\\/g, '').replace(/\\u0026/g, '&');
        // Clean
        videoUrl = videoUrl.split('\\')[0];
      }
    }

    // Method 3: og:video
    const ogVideoMatch = html.match(/property="og:video" content="([^"]+)"/);
    if (ogVideoMatch && !videoUrl) {
      videoUrl = ogVideoMatch[1];
    }
    
    // Extract images - og:image and candidates
    const ogImageMatches = [...html.matchAll(/property="og:image" content="([^"]+)"/g)];
    ogImageMatches.forEach(m => {
      let img = m[1];
      if (!imageUrls.includes(img)) imageUrls.push(img);
    });

    // Extract candidate images
    const imageCandidateRegex = /"url":\s*"(https:\/\/[^"]+\.jpg[^"]*)"/g;
    const imgMatches = [...html.matchAll(imageCandidateRegex)];
    imgMatches.slice(0, 10).forEach(m => {
      let img = m[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
      if (img.includes('scontent') && !imageUrls.includes(img)) {
        imageUrls.push(img);
      }
    });

    // Username
    const userMatch = url.match(/threads\.net\/@([^\/]+)/) || url.match(/threads\.com\/@([^\/]+)/) || html.match(/"username":\s*"([^"]+)"/);
    if (userMatch) username = userMatch[1] || userMatch[0];

    // Caption / title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/property="og:title" content="([^"]+)"/);
    if (titleMatch) caption = titleMatch[1];

    // If still no data, return error with helpful message
    if (!videoUrl && imageUrls.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'Could not extract directly - Threads blocked scraping. Trying fallback method.',
        fallback: true,
        data: {
          username,
          caption,
          og_video: ogVideoMatch ? ogVideoMatch[1] : null,
          og_images: imageUrls
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        username: username || 'threads_user',
        caption: caption || '',
        video_url: videoUrl,
        image_urls: imageUrls,
        is_carousel: imageUrls.length > 1,
        is_video: !!videoUrl
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch', details: error.message });
  }
}
