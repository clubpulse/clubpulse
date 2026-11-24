import { clipStoragePath } from '@/lib/highlights';
import { demoHighlight, isDemoHighlight } from '@/lib/highlights-demo';

describe('private highlight clips', () => {
  it('reads the object path out of a public or signed storage URL', () => {
    const path = '11111111-1111-1111-1111-111111111111/1700000000000/clip-1.webm';
    expect(clipStoragePath({ path, url: 'https://example.supabase.co/storage/v1/object/public/session-videos/' + path })).toBe(path);
    expect(clipStoragePath({
      path: 'demo/clip-1.mp4',
      url: 'https://example.supabase.co/storage/v1/object/sign/session-videos/' + path + '?token=abc',
    })).toBe(path);
  });

  it('leaves an external sample clip unsigned', () => {
    expect(clipStoragePath({ path: 'demo/clip-1.mp4', url: 'https://example.com/flower.mp4' })).toBeNull();
    expect(isDemoHighlight(demoHighlight())).toBe(true);
  });
});
