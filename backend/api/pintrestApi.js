/** @format */

const fetch = require("node-fetch");
const tokenData = require("./../auth/pinterest-token.json");
const PINTEREST_ACCESS_TOKEN = tokenData.access_token;

async function createPin({ boardId, imageUrl, title, description, link }) {
	const apiUrl = `https://api.pinterest.com/v5/pins`;

	const body = {
		board_id: boardId,
		title,
		alt_text: description,
		media_source: {
			source_type: "image_url",
			url: imageUrl,
		},
		link,
	};

	const res = await fetch(apiUrl, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	const json = await res.json();
	if (!res.ok) throw new Error(`Pinterest API Error: ${JSON.stringify(json)}`);
	return json;
}

module.exports = { createPin };
