const axios = require('axios');

async function postToThreads(post, account) {
  const { accessToken } = account.credentials;
  if (!accessToken || accessToken === 'TODO') {
    throw new Error('Threads access token not configured');
  }

  const url = `https://graph.threads.net/v1.0/me/threads`;
  const payload = {
    media_type: 'TEXT',
    text: post.body,
    access_token: accessToken,
  };

  try {
    const response = await axios.post(url, payload);
    const threadId = response.data.id;

    // Publish the thread
    const publishUrl = `https://graph.threads.net/v1.0/me/threads_publish`;
    const publishPayload = {
      creation_id: threadId,
      access_token: accessToken,
    };
    await axios.post(publishUrl, publishPayload);

    return { success: true, threadId };
  } catch (error) {
    console.error('Threads posting error:', error.response?.data || error.message);
    throw new Error('Failed to post to Threads');
  }
}

module.exports = postToThreads;