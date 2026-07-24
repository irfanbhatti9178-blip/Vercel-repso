export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, error: 'URL required' });

  try {
    const cleanUrl = url.split('?')[0];

    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Cache-Control': 'no-cache'
      },
      redirect: 'follow'
    });

    const html = await response.text();
    let videoUrl = null;
    let imageUrls = [];
    let username = '';
    let caption = 'Threads Video';

    const ogVideoMatch = html.match(/property="og:video" content="([^"]+)"/);
    if (ogVideoMatch) videoUrl = ogVideoMatch[1];

    if (!videoUrl) {
      const mp4Matches = [...html.matchAll(/"video_url":"([^"]+\.mp4[^"]*)"/g)];
      if (mp4Matches.length > 0) {
        videoUrl = mp4Matches[0][1].replace(/\\u0026/g, '&').replace(/\\/g, '');
      }
    }
    if (!videoUrl) {
      const allMp4 = [...html.matchAll(/https:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/g)];
      if (allMp4.length > 0) videoUrl = allMp4[0][0];
    }

    const ogImages = [...html.matchAll(/property="og:image" content="([^"]+)"/g)];
    for (const m of ogImages) {
      const img = m[1];
      if (img &&!imageUrls.includes(img) &&!img.includes('profile')) imageUrls.push(img);
    }

    const userMatch = cleanUrl.match(/@([^\/]+)/);
    if (userMatch) username = userMatch[1];

    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) caption = titleMatch[1].substring(0, 100);

    if (!videoUrl && imageUrls.length === 0) {
      return res.status(200).json({ success: false, error: 'Could not extract media - Threads blocked' });
    }

    return res.status(200).json({
      success: true,
      data: {
        username, caption, video_url: videoUrl, image_urls: imageUrls,
        is_carousel: imageUrls.length > 1, is_video:!!videoUrl
      }
    });
  } catch (err) {
    return res.status(200).json({ success: false, error: err.message });
  }
}
