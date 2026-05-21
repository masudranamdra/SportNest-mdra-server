const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const ignoredDirs = new Set(['node_modules', '.git']);

const collectJavaScriptFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJavaScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
};

for (const file of collectJavaScriptFiles(rootDir)) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

console.log('JavaScript syntax check passed.');
