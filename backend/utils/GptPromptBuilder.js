/** @format */

export const buildSeoPrompt = (productName, productType, audience) => {
	return `
You are an SEO and branding expert.

Product: ${productName}
Type: ${productType}
Audience: ${audience}

Answer the following:

1. What would someone Google if they were desperate enough to pay for this?
2. What question would they ask if they didn’t even know this product existed?
3. Describe this in a way that sounds fun but still makes search engines say YES.
4. Provide:
  - 5 SEO keywords
  - 5 platform hashtags
  - 1 meta description (under 160 chars)
  - 1 alt text example
`;
};
