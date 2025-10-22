/** @format */

// Simple Dev.to posting via API
// Requires DEVTO_API_KEY env variable

export default async function postToDevto(post) {
  if (typeof fetch !== 'function') {
    throw new Error('fetch API not available in this environment');
  }
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) {
    throw new Error('DEVTO_API_KEY not set');
  }

  const response = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      article: {
        title: post.title,
        body_markdown: post.body,
        published: true,
        tags: post.hashtags || [],
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dev.to error: ${response.status} ${text}`);
  }
  return await response.json();
}
