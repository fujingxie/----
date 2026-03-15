import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PET_LIBRARY, PET_IMAGE_FALLBACK } from '../src/api/petLibrary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const missingFiles = [];

const checkPublicAsset = (assetPath) => {
  const fullPath = path.join(projectRoot, 'public', assetPath.replace(/^\//, ''));
  if (!fs.existsSync(fullPath)) {
    missingFiles.push(assetPath);
  }
};

checkPublicAsset(PET_IMAGE_FALLBACK);

for (const pet of PET_LIBRARY) {
  checkPublicAsset(pet.icon);

  for (let level = 1; level <= 7; level += 1) {
    checkPublicAsset(`/assets/pets/${pet.id}${level}.png`);
  }
}

if (missingFiles.length > 0) {
  console.error('发现缺失的宠物资源文件:');
  missingFiles.forEach((assetPath) => console.error(`- ${assetPath}`));
  process.exit(1);
}

console.log(`宠物资源校验通过，共检查 ${PET_LIBRARY.length} 只宠物。`);
