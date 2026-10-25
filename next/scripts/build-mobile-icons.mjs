import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';

// Build-time only: the mobile bundle contains SVG data, never React.
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../mobile/web/package.json', import.meta.url));
const {parse: parseTemplate} = require('@vue/compiler-dom');
const {parseExpression} = require('@babel/parser');
const lucideRoot = path.join(root, 'node_modules/lucide-react');
const {version} = JSON.parse(await fs.readFile(path.join(lucideRoot, 'package.json'), 'utf8'));
if (version !== '0.577.0') throw new Error(`Review icon generation before updating Lucide ${version}`);

// Keep every historical mobile name; aliases describe the same desktop Lucide icon.
const aliases = {
  trash:'trash-2', shop:'shopping-bag', network:'network', mail:'mail', star:'star',
  music:'music-2', play:'play', pause:'pause', next:'skip-forward', previous:'skip-back',
  compass:'compass', games:'gamepad-2', sun:'sun', moon:'moon', chat:'message-circle',
  forum:'messages-square', blueprint:'box', notice:'bell', user:'user-round',
  headphones:'headphones', mic:'mic', mute:'mic-off', close:'x', back:'chevron-left',
  plus:'plus', send:'send', search:'search', refresh:'refresh-cw', chevron:'chevron-right',
  like:'thumbs-up', download:'download', upload:'upload', logout:'log-out',
  speaker:'volume-2', settings:'settings', smile:'smile', check:'check', more:'ellipsis',
  lock:'lock-keyhole', image:'image', home:'house', archive:'archive', users:'users-round',
  gamepad:'gamepad-2', feedback:'message-square-warning', palette:'palette', shield:'shield',
  help:'circle-question-mark', 'circle-help':'circle-question-mark', volume:'volume-2',
  folder:'folder', link:'link', clock:'clock', coins:'coins', trophy:'trophy',
};
const sourceRoot = path.join(root, 'mobile/web/src');
const used = new Set(), dynamic = [];
const record = (name, file) => {
  if (!Object.hasOwn(aliases, name)) throw new Error(`Unknown mobile icon ${JSON.stringify(name)} in ${file}`);
  used.add(name);
};
// Collection/prop bindings are fed by the literal icon: fields audited below.
// All other dynamic expressions must resolve to literal names or an inline map.
function outputs(node, file, expression) {
  if (node.type === 'StringLiteral') return record(node.value, file);
  if (node.type === 'ConditionalExpression') {
    outputs(node.consequent, file, expression); outputs(node.alternate, file, expression); return;
  }
  if (node.type === 'MemberExpression' && node.object.type === 'ObjectExpression') {
    for (const property of node.object.properties) {
      if (property.type !== 'ObjectProperty') throw new Error(`Unreviewed icon map in ${file}`);
      outputs(property.value, file, expression);
    }
    return;
  }
  if (['item.icon', 'entry.icon', 'icon'].includes(expression)) return;
  throw new Error(`Unreviewed dynamic Icon name in ${file}: ${expression}`);
}
async function audit(directory) {
  for (const entry of await fs.readdir(directory, {withFileTypes:true})) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {await audit(filename); continue;}
    if (!/\.(vue|js)$/.test(entry.name) || entry.name === 'icon-nodes.js') continue;
    const source = await fs.readFile(filename, 'utf8'), file = path.relative(root, filename);
    for (const match of source.matchAll(/\bicon\s*:\s*(['"])([a-z0-9-]+)\1/g)) record(match[2], file);
    if (!entry.name.endsWith('.vue')) continue;
    const template = source.match(/<template>([\s\S]*)<\/template>/)?.[1];
    if (!template) continue;
    function visit(node) {
      if (node.type === 1) {
        for (const property of node.props) {
          if (property.type === 6 && (property.name === 'icon' || (node.tag === 'Icon' && property.name === 'name'))) {
            if (property.value) record(property.value.content, file);
          }
          if (node.tag === 'Icon' && property.type === 7 && property.name === 'bind' && property.arg?.content === 'name') {
            const expression = property.exp?.content;
            if (!expression) throw new Error(`Missing Icon name in ${file}`);
            const literalMap=expression==='sectionIcons[section]'?source.match(/const sectionIcons=(\{[^;]+\});/)?.[1]:null;
            outputs(parseExpression(literalMap?'('+literalMap+')[section]':expression), file, expression);
            dynamic.push({file, expression});
          }
        }
      }
      for (const child of node.children || []) visit(child);
    }
    visit(parseTemplate(template));
  }
}
await audit(sourceRoot);

const nodes = {};
const allowedTags = new Set(['path','line','polyline','polygon','rect','circle','ellipse']);
const allowedAttributes = new Set(['d','x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','width','height','points','fill','stroke','key']);
for (const name of [...new Set(Object.values(aliases))].sort()) {
  const module = await import(pathToFileURL(path.join(lucideRoot, 'dist/esm/icons', name + '.js')).href);
  if (!Array.isArray(module.__iconNode) || !module.__iconNode.length) throw new Error(`No __iconNode exported by ${name}`);
  nodes[name] = module.__iconNode.map(([tag, attributes]) => {
    if (!allowedTags.has(tag)) throw new Error(`Unexpected SVG primitive ${tag} in ${name}`);
    for (const key of Object.keys(attributes)) if (!allowedAttributes.has(key)) throw new Error(`Unexpected SVG attribute ${key} in ${name}`);
    const {key, ...svg} = attributes;
    return [tag, svg];
  });
}
const generated = `// Generated by scripts/build-mobile-icons.mjs from lucide-react ${version} (ISC).\n// See public/licenses/lucide.txt. Do not edit SVG primitives by hand.\nexport const lucideVersion = ${JSON.stringify(version)};\nexport const iconAliases = ${JSON.stringify(aliases, null, 2)};\nexport const iconNodes = ${JSON.stringify(nodes, null, 2)};\n`;
const target = path.join(sourceRoot, 'icon-nodes.js');
const license = path.join(root, 'mobile/web/public/licenses/lucide.txt');
if (process.argv.includes('--check')) {
  if (await fs.readFile(target, 'utf8') !== generated) throw new Error('Mobile icon data is stale; run node scripts/build-mobile-icons.mjs');
  if (await fs.readFile(license, 'utf8') !== await fs.readFile(path.join(lucideRoot, 'LICENSE'), 'utf8')) throw new Error('Mobile Lucide license is stale');
} else {
  await fs.writeFile(target, generated);
  await fs.mkdir(path.dirname(license), {recursive:true});
  await fs.copyFile(path.join(lucideRoot, 'LICENSE'), license);
}
console.log(JSON.stringify({lucide:version, aliases:Object.keys(aliases).length, icons:Object.keys(nodes).length, used:[...used].sort(), dynamic}, null, 2));

