// MIT License
const path = require('path');
const fs = require('fs-extra');
const matter = require('gray-matter');
const axios = require('axios');
const { chromium } = require('playwright');
const dayjs = require('dayjs');
const chalk = require('chalk');
const MarkdownIt = require('markdown-it');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const POSTS_DIR = path.join(__dirname, '../posts');
const LOG_DIR = path.join(__dirname, '../logs');
const API_PLATFORMS = ['devto', 'gumroad']; // extend as needed

function buildUtmLink(base, platform, campaign) {
  if (!base) return null;
  const utm = `?utm_source=${platform}&utm_medium=social&utm_campaign=${campaign}`;
  return base.includes('?') ? base + '&' + utm.slice(1) : base + utm;
}

async function postToApi(platform, payload) {
  const token = process.env[`${platform.toUpperCase()}_TOKEN`];
  const url = process.env[`${platform.toUpperCase()}_URL`];
  if (!token || !url) {
    return { success: false, message: 'Missing credentials' };
  }
  try {
    await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function postWithBrowser(platform, payload) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(payload.url);
    // Implement platform-specific logic here
    await browser.close();
    return { success: true };
  } catch (err) {
    await browser.close();
    return { success: false, message: err.message };
  }
}

async function processPosts() {
  await fs.ensureDir(LOG_DIR);
  const files = (await fs.readdir(POSTS_DIR)).filter(f => f.endsWith('.md'));
  const results = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(POSTS_DIR, file), 'utf-8');
    const { data, content } = matter(raw);
    if (data.status !== 'approved') continue;
    if (data.date && dayjs(data.date).isAfter(dayjs())) continue;
    const md = new MarkdownIt();
    const html = md.render(content);
    for (const platform of data.platforms || []) {
      const link = buildUtmLink(data.link, platform, data.campaign || 'default');
      const payload = { title: data.title, body: html, link };
      let res;
      if (API_PLATFORMS.includes(platform)) {
        res = await postToApi(platform, payload);
      } else {
        res = await postWithBrowser(platform, { ...payload, url: link });
      }
      results.push({ file, platform, ...res });
      if (res.success) console.log(chalk.green(`Posted ${file} to ${platform}`));
      else console.log(chalk.red(`Failed ${file} to ${platform}: ${res.message}`));
    }
  }
  const logFile = path.join(LOG_DIR, `post-run-${Date.now()}.json`);
  await fs.writeJson(logFile, results, { spaces: 2 });
}

module.exports = processPosts;
