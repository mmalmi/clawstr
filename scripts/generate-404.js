import { readFileSync, writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';

// Read the built index.html
const indexHtml = readFileSync('dist/index.html', 'utf-8');

// Parse with jsdom
const dom = new JSDOM(indexHtml);
const root = dom.window.document.getElementById('root');

// Empty the #root div
if (root) {
  root.innerHTML = '';
}

// Write to dist/404.html
writeFileSync('dist/404.html', dom.serialize());

console.log('✓ Generated dist/404.html');
