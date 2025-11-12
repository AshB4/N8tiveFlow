import "dotenv/config";
import postToInstagram from './scripts/platforms/social/post-to-instagram.js';

async function testInstagram() {
  const post = {
    title: 'Test Instagram Post',
    body: 'This is a test post from PostPunk. #test #postpunk',
    hashtags: ['test', 'postpunk'],
    image: 'https://example.com/test-image.jpg', // Replace with a real image URL
  };

  const account = {
    credentials: {
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || 'TODO_USER_ACCESS_TOKEN',
    },
    metadata: {
      accountId: '17841402157642090',
    },
  };

  try {
    const result = await postToInstagram(post, account);
    console.log('Instagram test successful:', result);
  } catch (error) {
    console.error('Instagram test failed:', error.message);
  }
}

testInstagram();