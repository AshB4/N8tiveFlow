import axios from 'axios';

async function postToInstagram(post, context = {}) {
  const account = context?.account || context || {};
  const accessToken = account?.credentials?.accessToken;
  const { accountId } = account?.metadata || {};
  if (!accessToken || accessToken === 'TODO_USER_ACCESS_TOKEN') {
    throw new Error('Instagram access token not configured');
  }
  if (!accountId) {
    throw new Error('Instagram account ID not configured in metadata');
  }

  const url = `https://graph.instagram.com/${accountId}/media`;
  const payload = {
    image_url: post.image, // Assuming image is a URL
    caption: post.body,
    access_token: accessToken,
  };

  try {
    const response = await axios.post(url, payload);
    const mediaId = response.data.id;

    // Publish the media
    const publishUrl = `https://graph.instagram.com/${accountId}/media_publish`;
    const publishPayload = {
      creation_id: mediaId,
      access_token: accessToken,
    };
    await axios.post(publishUrl, publishPayload);

    return { success: true, mediaId };
  } catch (error) {
    console.error('Instagram posting error:', error.response?.data || error.message);
    throw new Error('Failed to post to Instagram');
  }
}

export default postToInstagram;
