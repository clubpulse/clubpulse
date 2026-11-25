import fs from 'fs';
import path from 'path';

function filesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(full);
    return entry.name.endsWith('.tsx') ? [full] : [];
  });
}

const duplicate = /(?:^|[^\w])title\s*[:=]\s*(['"`])[^'"`]*(?:\| SHIFTUP|— SHIFTUP|· SHIFTUP|SHIFTUP Admin)/;

describe('page titles', () => {
  it('does not repeat SHIFTUP in a title the root template already suffixes', () => {
    const root = path.join(__dirname, '../app');
    const offenders = filesUnder(root).flatMap((file) => {
      if (file.endsWith(`${path.sep}layout.tsx`) && path.dirname(file) === root) return [];
      if (file.endsWith('opengraph-image.tsx')) return [];
      return fs.readFileSync(file, 'utf8').split('\n').flatMap((line, index) => (
        duplicate.test(line) ? [`${path.relative(root, file)}:${index + 1}`] : []
      ));
    });
    expect(offenders).toEqual([]);
  });

  it('shows SHIFTUP on the sign-in wordmark used by /login', () => {
    const shell = fs.readFileSync(path.join(__dirname, '../components/auth/AuthShell.tsx'), 'utf8');
    expect(shell).toContain('>SHIFT<');
    expect(shell).toContain('>UP<');
    expect(shell).not.toContain('>Shift<');
    expect(shell).not.toContain('>Up<');
  });
});
