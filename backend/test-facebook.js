import "dotenv/config";
import postToFacebook from './scripts/platforms/social/post-to-facebook.js';

async function testFacebook() {
  const post = {
    title: 'Test Facebook Post',
    body: 'This is a test post from PostPunk.',
    hashtags: ['test', 'postpunk'],
    image: null,
  };

  const account = {
    credentials: {
      accessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || 'REPLACE_WITH_REAL_PAGE_TOKEN',
    },
    metadata: {
      pageId: '17841402157642090',
    },
  };

  try {
    const result = await postToFacebook(post, account);
    console.log('Facebook test successful:', result);
  } catch (error) {
    console.error('Facebook test failed:', error.message);
  }
}

testFacebook();