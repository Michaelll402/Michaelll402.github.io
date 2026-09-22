import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const pages = ['index.html', '404.html', ...['support', 'vision', 'simiutopia', 'subways', 'classforge'].map((slug) => `work/${slug}/index.html`)];
const required = [...pages, '.nojekyll', 'cv.pdf', 'favicon.png', 'apple-touch-icon.png', 'og/home.png', 'robots.txt', 'sitemap.xml'];
const failures = [];
const files = [];
const visit = (folder) => {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isSymbolicLink()) { failures.push(`Symlink in artifact: ${path.relative(root, file)}`); continue; }
    if (entry.isDirectory()) visit(file);
    else if (entry.isFile()) files.push(path.relative(root, file).replaceAll('\\', '/'));
  }
};
visit(root);
for (const file of required) if (!existsSync(path.join(root, file))) failures.push(`Missing required artifact: ${file}`);

const forbiddenPath = /(^|\/)(?:\.env(?:\.|$)|\.git|node_modules|src|tests|scripts|performance-optimization-report|portfolio-audit-handoff)(?:\/|$)|\.(?:map|pem|p12|key|tfstate)(?:$|\.)/i;
const allowedPath = /^(?:index\.html|404\.html|\.nojekyll|cv\.pdf|favicon\.png|apple-touch-icon\.png|robots\.txt|sitemap\.xml|work\/(?:support|vision|simiutopia|subways|classforge)\/index\.html|og\/[\w.-]+\.png|_astro\/[\w.-]+)$/;
for (const file of files) {
  if (forbiddenPath.test(file) || !allowedPath.test(file)) failures.push(`Unexpected artifact path: ${file}`);
  if (statSync(path.join(root, file)).size > 2_000_000) failures.push(`Oversized artifact file: ${file}`);
}

const secret = /-----BEGIN (?:RSA|OPENSSH|EC|DSA|PRIVATE) KEY-----|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}|https?:\/\/[^/\s:@]+:[^/\s@]+@/;
const privatePath = /C:[\\/]Users[\\/]|OneDrive[\\/]|trycloudflare\.com|\/@vite\/client|@react-refresh|REPLACE_WITH_FORM_ID/;
for (const file of files) {
  const contents = readFileSync(path.join(root, file)).toString('latin1');
  if (secret.test(contents)) failures.push(`Credential-like signature in: ${file}`);
  if (privatePath.test(contents)) failures.push(`Development/private path in: ${file}`);
}

const home = readFileSync(path.join(root, 'index.html'), 'utf8');
if (!home.includes('The tools behind the things I build.')) failures.push('Skills copy missing');
if (!home.includes('I like building the parts of software that have to keep their promises.')) failures.push('About copy missing');
if (!home.includes('action="https://formspree.io/f/mqpaqrev"')) failures.push('Public Formspree action missing');
if (home.includes('data-mobile-motion-toggle')) failures.push('Removed motion control was published');
const sitemap = readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
for (const slug of ['support', 'vision', 'simiutopia', 'subways', 'classforge']) if (!sitemap.includes(`/work/${slug}/`)) failures.push(`Sitemap missing ${slug}`);

const resolves = (url) => {
  if (/^(?:https?:|mailto:|tel:|data:|blob:|#)/i.test(url)) return true;
  const pathname = url.split(/[?#]/, 1)[0];
  if (!pathname) return true;
  const relative = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  const target = relative.endsWith('/') || !path.extname(relative) ? `${relative.replace(/\/$/, '')}/index.html` : relative;
  return existsSync(path.join(root, target));
};
for (const file of files.filter((name) => /\.(?:html|css)$/.test(name))) {
  const contents = readFileSync(path.join(root, file), 'utf8');
  const references = file.endsWith('.html')
    ? [...contents.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) => match[1])
    : [...contents.matchAll(/url\((?:["']?)([^)"']+)/g)].map((match) => match[1]);
  for (const url of references) if (!resolves(url)) failures.push(`Broken local reference in ${file}: ${url}`);
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`Release artifact verified: ${pages.length} pages, ${files.length} allowlisted files, no credential signatures or broken local links.`);
}
