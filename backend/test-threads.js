import postToThreads from './scripts/platforms/social/post-to-threads.js';

async function testThreads() {
  const post = {
    title: 'Test Threads Post',
    body: 'This is a test post from PostPunk. #test #postpunk',
    hashtags: ['test', 'postpunk'],
    image: null, // Threads text only for now
  };

  const account = {
    credentials: {
      accessToken: process.env.THREADS_ACCESS_TOKEN || 'TODO_USER_ACCESS_TOKEN',
    },
  };

  try {
    const result = await postToThreads(post, account);
    console.log('Threads test successful:', result);
  } catch (error) {
    console.error('Threads test failed:', error.message);
  }
}

testThreads();