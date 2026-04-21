import axios from 'axios';

function normalizeDevtoTags(tags = []) {
  return tags
    .map((tag) => String(tag || '').trim().replace(/^#+/, ''))
    .map((tag) => tag.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .slice(0, 4);
}

async function postToDevto(post, account) {
  const apiKey = account?.credentials?.apiKey || process.env.DEVTO_API_KEY;
  if (!apiKey) {
    throw new Error('Dev.to API key not configured');
  }

  const url = 'https://dev.to/api/articles';
  const payload = {
    article: {
      title: post.title,
      body_markdown: post.body,
      published: true,
      tags: normalizeDevtoTags(post.hashtags || post.tags || []),
      canonical_url: post.canonicalUrl,
      cover_image: post.image,
      // Note: Dev.to doesn't support header/banner colors directly in API
      // Colors might be handled in frontend for preview
    },
  };

  const headers = {
    'Api-Key': apiKey,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.post(url, payload, { headers });
    return { success: true, articleId: response.data.id, url: response.data.url };
  } catch (error) {
    console.error('Dev.to posting error:', error.response?.data || error.message);
    throw new Error('Failed to post to Dev.to');
  }
}

export default postToDevto;
