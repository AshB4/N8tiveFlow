import axios from 'axios';

async function postToFacebook(post, account) {
  const { accessToken } = account.credentials;
  const { pageId } = account.metadata || {};
  if (!accessToken || accessToken === 'REPLACE_WITH_REAL_PAGE_TOKEN') {
    throw new Error('Facebook page access token not configured');
  }
  if (!pageId) {
    throw new Error('Facebook page ID not configured in metadata');
  }

  const url = `https://graph.facebook.com/v18.0/${pageId}/feed`;
  const payload = {
    message: post.body,
    link: post.canonicalUrl || undefined,
    access_token: accessToken,
  };

  try {
    const response = await axios.post(url, payload);
    return { success: true, postId: response.data.id };
  } catch (error) {
    console.error('Facebook posting error:', error.response?.data || error.message);
    throw new Error('Failed to post to Facebook');
  }
}

export default postToFacebook;