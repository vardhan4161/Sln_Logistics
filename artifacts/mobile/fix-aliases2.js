const fs = require('fs');
const path = require('path');

function fixAliases(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixAliases(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // First, revert the broken relative paths back to @/
      content = content.replace(/from "\.\.\/\.\.\/(.*?)"/g, 'from "@/$1"');
      content = content.replace(/import\("\.\.\/\.\.\/(.*?)"\)/g, 'import("@/$1")');
      content = content.replace(/from "\.\.\/(.*?)"/g, 'from "@/$1"');
      content = content.replace(/import\("\.\.\/(.*?)"\)/g, 'import("@/$1")');
      
      // Now do it properly using path.dirname
      const dirOfFile = path.dirname(fullPath);
      const relativeToMobileRoot = path.relative(dirOfFile, path.join(__dirname)).replace(/\\/g, '/') + '/';
      // If relativeToMobileRoot is "./", make it just ""
      const prefix = relativeToMobileRoot === './' ? '' : relativeToMobileRoot;
      
      let newContent = content.replace(/from "@\/(.*?)"/g, `from "${prefix}$1"`);
      newContent = newContent.replace(/import\("@\/(.*?)"\)/g, `import("${prefix}$1")`);
      
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

fixAliases(path.join(__dirname, 'app'));
