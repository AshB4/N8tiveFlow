import axios from 'axios';

async function postToThreads(post, account) {
  const { accessToken } = account.credentials;
  const { accountId } = account.metadata || {};
  if (!accessToken || accessToken === 'TODO_USER_ACCESS_TOKEN') {
    throw new Error('Threads access token not configured');
  }
  if (!accountId) {
    throw new Error('Threads account ID not configured in metadata');
  }

  const url = `https://graph.threads.net/v1.0/${accountId}/threads`;
  const payload = {
    media_type: 'TEXT',
    text: post.body,
    access_token: accessToken,
  };

  try {
    const response = await axios.post(url, payload);
    const threadId = response.data.id;

    // Publish the thread
    const publishUrl = `https://graph.threads.net/v1.0/${accountId}/threads_publish`;
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

export default postToThreads;
