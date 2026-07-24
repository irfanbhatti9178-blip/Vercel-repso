export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  if (!url.includes('threads')) return res.status(400).json({ error: 'Invalid Threads URL' });

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });
    const html = await response.text();

    let videoUrl = null;
    let imageUrls = [];
    let username = '';
    let caption = '';

    const mp4Matches = html.match(/https:\/\/[^"]+\.mp4[^"]*/g);
    if (mp4Matches && mp4Matches.length > 0) {
      videoUrl = mp4Matches[0].replace(/\\u0026/g, '&').replace(/\\/g, '');
    }

    if (!videoUrl) {
      const ogVideo = html.match(/property="og:video" content="([^"]+)"/);
      if (ogVideo) videoUrl = ogVideo[1];
    }

    const ogImages = html.matchAll(/property="og:image" content="([^"]+)"/g);
    for (const m of ogImages) {
      if (!imageUrls.includes(m[1])) imageUrls.push(m[1]);
    }

    const userMatch = url.match(/@([^\/]+)/);
    if (userMatch) username = userMatch[1];

    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) caption = titleMatch[1];

    return res.status(200).json({
      success: true,
      data: {
        username: username || 'threads_user',
        caption: caption || '',
        video_url: videoUrl,
        image_urls: imageUrls,
        is_carousel: imageUrls.length > 1,
        is_video:!!videoUrl
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed', details: error.message });
  }
}          og_video: ogVideoMatch ? ogVideoMatch[1] : null,
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
