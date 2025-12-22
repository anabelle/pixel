const fs = require('fs');
const path = require('path');

const projects = [
  { name: 'Root', path: '.' },
  { name: 'API', path: 'lnpixels/api' },
  { name: 'App', path: 'lnpixels/lnpixels-app' },
  { name: 'Agent', path: 'pixel-agent' },
  { name: 'Landing', path: 'pixel-landing' }
];

function getKeys(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('=')[0].trim());
}

console.log('🔍 Checking environment health...\n');

let issues = 0;

projects.forEach(project => {
  const examplePath = path.join(process.cwd(), project.path, '.env.example');
  const envPath = path.join(process.cwd(), project.path, '.env');

  if (!fs.existsSync(examplePath)) {
    console.log(`⚠️  ${project.name}: No .env.example found at ${project.path}`);
    return;
  }

  if (!fs.existsSync(envPath)) {
    console.log(`❌ ${project.name}: Missing .env file!`);
    issues++;
    return;
  }

  const exampleKeys = getKeys(examplePath);
  const envKeys = getKeys(envPath);
  const missing = exampleKeys.filter(k => !envKeys.includes(k));

  if (missing.length > 0) {
    console.log(`❌ ${project.name}: Missing keys in .env: ${missing.join(', ')}`);
    issues++;
  } else {
    console.log(`✅ ${project.name}: Environment is healthy`);
  }
});

if (issues > 0) {
  console.log(`\nFound ${issues} issues. Please fix them before starting dev.`);
  process.exit(1);
} else {
  console.log('\n🚀 All systems go!');
}
