const postToDevto = require('./scripts/platforms/dev/post-to-devto.js');

async function testDevto() {
  const post = {
    title: 'Test Post',
    body: 'This is a test post from PostPunk.',
    hashtags: ['test', 'postpunk'],
    image: null,
  };

  const account = {
    credentials: {
      apiKey: process.env.DEVTO_API_KEY || 'YOUR_API_KEY_HERE',
    },
  };

  try {
    const result = await postToDevto(post, account);
    console.log('Dev.to test successful:', result);
  } catch (error) {
    console.error('Dev.to test failed:', error.message);
  }
}

testDevto();