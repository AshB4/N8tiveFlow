import postToX from './scripts/platforms/social/post-to-x.js';
import "dotenv/config";

async function testTwitter() {
  const post = {
    title: 'Test Tweet',
    body: 'This is a test tweet from PostPunk.',
    hashtags: ['test', 'postpunk'],
    image: null,
  };

  try {
    const result = await postToX(post);
    console.log('Twitter test successful:', result);
  } catch (error) {
    console.error('Twitter test failed:', error.message);
  }
}

testTwitter();
