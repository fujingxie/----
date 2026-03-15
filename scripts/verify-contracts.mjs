import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const clientSource = fs.readFileSync(path.join(projectRoot, 'src/api/client.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(projectRoot, 'src-server/index.js'), 'utf8');

const requiredClientFragments = [
  'request(\'/auth/login\'',
  'request(`/students/${studentId}`',
  'request(`/shop-items/${itemId}/redeem`',
  'request(`/shop-items/${itemId}`',
  'request(`/rules/${ruleId}`',
];

const requiredServerFragments = [
  "path === '/api/auth/login' && request.method === 'POST'",
  "path === '/api/bootstrap' && request.method === 'GET'",
  "request.method === 'PATCH') {\n        return await handleUpdateStudent",
  "request.method === 'PATCH') {\n        return await handleUpdateShopItem",
  "request.method === 'PATCH') {\n        return await handleUpdateRule",
  "request.method === 'POST') {\n        return await handleRedeemShopItem",
];

const missing = [];

for (const fragment of requiredClientFragments) {
  if (!clientSource.includes(fragment)) {
    missing.push(`client: ${fragment}`);
  }
}

for (const fragment of requiredServerFragments) {
  if (!serverSource.includes(fragment)) {
    missing.push(`server: ${fragment}`);
  }
}

if (missing.length > 0) {
  console.error('核心接口契约检查未通过:');
  missing.forEach((fragment) => console.error(`- ${fragment}`));
  process.exit(1);
}

console.log('核心接口契约检查通过。');
