const fs = require('fs');
const path = require('path');

// We can just read pnpm-workspace.yaml as text and extract catalog versions using regex
const workspaceYaml = fs.readFileSync(path.join(__dirname, 'pnpm-workspace.yaml'), 'utf8');
const catalogMatch = workspaceYaml.match(/catalog:\s+([\s\S]+?)(\n[a-zA-Z]|\n\n)/);
const catalogBlock = catalogMatch ? catalogMatch[1] : '';

const catalogVersions = {};
const lines = catalogBlock.split('\n');
for (const line of lines) {
  // match lines like   '@types/node': ^25.3.3
  const match = line.match(/^\s*'?(@?[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)?)'?:\s*'?(.+?)'?\s*$/);
  if (match) {
    catalogVersions[match[1]] = match[2].trim();
  }
}

console.log('Found catalog versions:', catalogVersions);

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        processDir(fullPath);
      }
    } else if (file === 'package.json') {
      console.log('Processing', fullPath);
      let content = fs.readFileSync(fullPath, 'utf8');
      const pkg = JSON.parse(content);
      
      let modified = false;
      const depsFields = ['dependencies', 'devDependencies', 'peerDependencies'];
      
      for (const field of depsFields) {
        if (pkg[field]) {
          for (const [dep, version] of Object.entries(pkg[field])) {
            if (version === 'catalog:') {
              if (catalogVersions[dep]) {
                pkg[field][dep] = catalogVersions[dep];
                modified = true;
              } else {
                console.warn(`WARNING: Missing catalog version for ${dep}`);
              }
            } else if (version === 'workspace:*') {
              pkg[field][dep] = '*';
              modified = true;
            }
          }
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + '\n');
        console.log('  Updated', fullPath);
      }
    }
  }
}

processDir(__dirname);
console.log('Done!');
