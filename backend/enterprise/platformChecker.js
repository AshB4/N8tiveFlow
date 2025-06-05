function checkLength(post, limit) {
  return post.length <= limit;
}

function hasAltText(post) {
  return !!post.altText;
}

function hasCTA(post) {
  return /http|www|comment/i.test(post.body || '');
}

module.exports = { checkLength, hasAltText, hasCTA };
