// profiles is own-row only. Embedding it in another table's select returns nothing for other people (or fails when the
// foreign key points at auth.users), so names are looked up with src/lib/profile/lookup.ts instead.
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? (f === '__tests__' || f === 'node_modules' ? [] : walk(p)) : /\.(ts|tsx)$/.test(f) ? [p] : [];
});

describe('no profiles(...) embeds in server queries', () => {
  it('finds none under src', () => {
    const offenders: string[] = [];
    for (const file of walk('src')) {
      const text = readFileSync(file, 'utf8');
      text.split('\n').forEach((line, i) => {
        if (/\bprofiles(!\w+)?\s*\(/.test(line) && !/\.from\(\s*['"]profiles['"]\s*\)/.test(line) && !/^\s*(\/\/|\*)/.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
