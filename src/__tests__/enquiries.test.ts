import { parseEnquiry } from '@/lib/enquiries/logic';

const good = { name: 'Asha Patel', email: ' Asha@Example.org ', club: 'Riverside CC', role: 'secretary', members: '50 to 150', needs: ['volunteers', 'juniors'], message: '' };

describe('parseEnquiry', () => {
  it('accepts a good enquiry and tidies it', () => {
    expect(parseEnquiry(good)).toEqual({
      ok: true,
      value: { name: 'Asha Patel', email: 'asha@example.org', club_name: 'Riverside CC', role: 'secretary', members: '50 to 150', needs: ['volunteers', 'juniors'], message: null },
    });
  });

  it('needs a name, a real email, and something to go on', () => {
    expect(parseEnquiry({ ...good, name: 'A' })).toMatchObject({ ok: false });
    expect(parseEnquiry({ ...good, email: 'asha@' })).toMatchObject({ ok: false });
    expect(parseEnquiry({ ...good, needs: [], message: 'hi' })).toMatchObject({ ok: false });
    expect(parseEnquiry({ ...good, needs: [], message: 'We need help with match fees.' }).ok).toBe(true);
    expect(parseEnquiry(null).ok).toBe(false);
  });

  it('keeps only known needs and sizes, and cuts long text', () => {
    const parsed = parseEnquiry({ ...good, needs: ['volunteers', 'volunteers', 'hack', 7], members: 'loads', message: 'x'.repeat(9000) });
    expect(parsed.ok && parsed.value.needs).toEqual(['volunteers']);
    expect(parsed.ok && parsed.value.members).toBeNull();
    expect(parsed.ok && parsed.value.message?.length).toBe(3000);
  });

  it('quietly drops a form filled in by a script', () => {
    expect(parseEnquiry({ ...good, website: 'http://spam.example' })).toEqual({ ok: false, error: 'spam', silent: true });
  });
});
