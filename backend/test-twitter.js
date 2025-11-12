import postToX from './scripts/platforms/social/post-to-x.js';

async function testTwitter() {
  const post = {
    title: 'Test Tweet',
    body: 'This is a test tweet from PostPunk.',
    hashtags: ['test', 'postpunk'],
    image: null,
  };

  const account = {
    credentials: {
      apiKey: 'j7Cjcv9BgY9OwS56sqmvTOcz9',
      apiSecret: 'N6vCluOMEIpUA8f9Z288ySpgzjh19E86CCEQxTsldpYJ7QHxBd',
      accessToken: '972575433695232-6HtSozKAyNhXyEiAMDrEQdUUBTVflb',
      accessSecret: 'u26GfoGtrNpLGmc8RlarY4OQNs6Zrr2hx9vSWQtfMhyyX',
    },
  };

  try {
    const result = await postToX(post, account);
    console.log('Twitter test successful:', result);
  } catch (error) {
    console.error('Twitter test failed:', error.message);
  }
}

testTwitter();