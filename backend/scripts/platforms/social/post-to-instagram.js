const axios = require('axios');

async function postToInstagram(post, account) {
  const { accessToken } = account.credentials;
  if (!accessToken || accessToken === 'TODO') {
    throw new Error('Instagram access token not configured');
  }

  // First, create the media container
  const url = `https://graph.instagram.com/me/media`;
  const payload = {
    image_url: post.image, // Assuming image is a URL
    caption: post.body,
    access_token: accessToken,
  };

  try {
    const response = await axios.post(url, payload);
    const mediaId = response.data.id;

    // Publish the media
    const publishUrl = `https://graph.instagram.com/me/media_publish`;
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

module.exports = postToInstagram;