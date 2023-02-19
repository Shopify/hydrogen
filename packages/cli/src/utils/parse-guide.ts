import fs from 'fs';

export interface Changeset {
  before: string;
  after: string;
  description: string;
  filename: string;
  title: string;
}

export function parseGuide(root: string): Changeset[] {
  const markdown = fs.readFileSync(new URL('./guide.md', root), 'utf8');
  const samples = markdown
    .split(/^## /gm)
    .slice(1)
    .map((block: string) => {
      const lines = block.split('\n');
      const title = lines[0] || '';

      const descriptionEnd = lines.findIndex((line) => line.startsWith('###'));
      const description = lines.slice(1, descriptionEnd).join('\n');

      const filename = /### In file `(.+)`/.exec(block);
      const before = /```(js|jsx|ts|tsx) before\n([^]*?)\n```/.exec(block);
      const after = /```(js|jsx|ts|tsx) after\n([^]*?)\n```/.exec(block);
      return {
        title,
        description,
        before: before && before[2] ? before[2] : '',
        after: after && after[2] ? after[2] : '',
        filename: filename && filename[1] ? filename[1] : '',
      };
    });

  return samples;
}
