/** @format */

export const buildSeoPrompt = (productName, productType, audience) => {
	return `
You are an SEO and branding expert.

Product: ${productName}
Type: ${productType}
Audience: ${audience}

Return valid JSON only. Do not wrap it in markdown fences.

Use this exact shape:
{
  "product_name": "${productName}",
  "slug": "kebab-case-slug",
  "product_type": "${productType}",
  "audience": "${audience}",
  "platforms": ["Twitter", "LinkedIn", "Medium", "Dev.to", "Pinterest", "Instagram"],
  "desperate_search_queries": ["", "", ""],
  "unaware_search_questions": ["", "", ""],
  "seo_human_pitch": "",
  "keywords": ["", "", "", "", ""],
  "hashtags": {
    "Twitter": ["", "", ""],
    "Instagram": ["", "", ""],
    "LinkedIn": ["", "", ""],
    "Pinterest": ["", "", ""],
    "Dev.to": ["", "", ""],
    "Medium": ["", "", ""],
    "All": ["", "", ""]
  },
  "meta_description": "",
  "alt_text_examples": ["", ""],
  "image_requirements": {
    "Twitter": "1200x675",
    "Instagram": "1080x1080 or 1080x1350",
    "Pinterest": "1000x1500",
    "LinkedIn": "1200x627",
    "Default": "1200x630"
  },
  "preferred_post_times": {
    "Twitter": "",
    "LinkedIn": "",
    "Instagram": "",
    "Pinterest": "",
    "Medium": "",
    "Dev.to": ""
  },
  "link": {
    "gumroad": "",
    "amazon": "",
    "utm_base": "?utm_source=__PLATFORM__&utm_medium=social&utm_campaign=__CAMPAIGN__"
  },
  "campaigns": [
    {
      "name": "",
      "description": "",
      "tags": [""],
      "start_date": "",
      "end_date": ""
    }
  ]
}

Requirements:
- desperate_search_queries: real high-intent searches someone might type before buying
- unaware_search_questions: problem-first searches by someone who does not know the product exists
- seo_human_pitch: 1-2 sentences, human-readable, not robotic
- keywords: exactly 5 useful keywords
- meta_description: under 160 characters
- alt_text_examples: at least 2
`;
};
