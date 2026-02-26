/**
 * Generates a sidebar.yml file for shopify-dev from generated_docs_data.json.
 *
 * Usage:
 *   node generate-sidebar.cjs <package> <version> <json-path> <output-path>
 *
 * Arguments:
 *   package   - "hydrogen" or "hydrogen-react"
 *   version   - CalVer string, e.g. "2025-10" or "2026-01"
 *   json-path - Path to generated_docs_data.json (built by build-docs.sh)
 *   output-path - Where to write the sidebar.yml file
 *
 * The generated sidebar groups entries by category → subCategory, sorts
 * alphabetically, and produces YAML matching the shopify-dev convention.
 */

const fs = require('fs');

const [pkg, version, jsonPath, outputPath] = process.argv.slice(2);

if (!pkg || !version || !jsonPath || !outputPath) {
  console.error(
    'Usage: node generate-sidebar.cjs <package> <version> <json-path> <output-path>',
  );
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

if (!Array.isArray(data) || data.length === 0) {
  console.error('ERROR: generated_docs_data.json is empty or not an array');
  process.exit(1);
}

for (const item of data) {
  if (typeof item.name !== 'string' || typeof item.category !== 'string') {
    console.error(
      'ERROR: Missing expected fields (name, category) on entry:',
      JSON.stringify(item).slice(0, 100),
    );
    process.exit(1);
  }
}

// --- Grouping ---

function groupByCategory(items) {
  const grouped = {};
  for (const item of items) {
    const cat = item.category.toLowerCase();
    if (!grouped[cat]) grouped[cat] = { rootItems: [], subCategories: {} };

    const sub = item.subCategory ? item.subCategory.toLowerCase() : null;
    if (sub) {
      if (!grouped[cat].subCategories[sub]) grouped[cat].subCategories[sub] = [];
      grouped[cat].subCategories[sub].push(item);
    } else {
      grouped[cat].rootItems.push(item);
    }
  }
  return grouped;
}

// --- Slug helpers ---

/** YAML key: spaces → hyphens, dots preserved, everything else stripped. */
function itemKey(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.\-]/g, '');
}

/** URL slug: dots → hyphens, spaces → hyphens, everything else stripped. */
function urlSlug(name) {
  return name
    .toLowerCase()
    .replace(/\./g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// --- YAML generation ---

const sidebarKey = pkg.replace(/-/g, '_') + '_' + version.replace(/-/g, '_');
const CATEGORY_ORDER = ['components', 'utilities', 'hooks'];

function buildYaml(grouped) {
  const lines = [
    'en:',
    '  sidebar:',
    '    api:',
    `      ${sidebarKey}:`,
    '        links:',
  ];

  const orderedCategories = CATEGORY_ORDER.filter((c) => grouped[c]);
  for (const c of Object.keys(grouped).sort()) {
    if (!orderedCategories.includes(c)) orderedCategories.push(c);
  }

  for (const cat of orderedCategories) {
    const { rootItems, subCategories } = grouped[cat];
    lines.push(`          ${cat}:`);
    lines.push(`            label: ${cat}`);
    lines.push('            children:');

    const entries = [];
    for (const item of rootItems) {
      entries.push({ type: 'item', item, sortKey: item.name.toLowerCase() });
    }
    for (const [sub, items] of Object.entries(subCategories)) {
      items.sort((a, b) => a.name.localeCompare(b.name));
      entries.push({ type: 'sub', name: sub, items, sortKey: sub });
    }
    entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    for (const entry of entries) {
      if (entry.type === 'sub') {
        lines.push(`              ${entry.name}:`);
        lines.push(`                label: ${entry.name}`);
        lines.push('                children:');
        for (const item of entry.items) {
          lines.push(`                  ${itemKey(item.name)}:`);
          lines.push(`                    label: ${item.name}`);
          lines.push(
            `                    url: "/docs/api/${pkg}/${version}/${cat}/${entry.name}/${urlSlug(item.name)}"`,
          );
        }
      } else {
        lines.push(`              ${itemKey(entry.item.name)}:`);
        lines.push(`                label: ${entry.item.name}`);
        lines.push(
          `                url: "/docs/api/${pkg}/${version}/${cat}/${urlSlug(entry.item.name)}"`,
        );
      }
    }
  }

  return lines.join('\n') + '\n';
}

// --- Main ---

const grouped = groupByCategory(data);
fs.writeFileSync(outputPath, buildYaml(grouped));

console.log(`Generated ${outputPath}`);
console.log(`  Sidebar key: ${sidebarKey}`);
console.log(`  Total entries: ${data.length}`);
console.log(
  `  Categories: ${Object.keys(grouped).sort().join(', ')}`,
);
