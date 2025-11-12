import postToDevto from './scripts/platforms/dev/post-to-devto.js';

async function testDevto() {
  const post = {
    title: 'Test Post from PostPunk',
    body: 'This is a test post from PostPunk automation system.',
    hashtags: ['test', 'postpunk', 'automation'],
    image: null,
  };

  const account = {
    credentials: {
      apiKey: 'g2m9eyqc5YfoYbMPT91PKvcv',
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