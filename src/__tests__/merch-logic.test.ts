import { addressLines, normalisePostcode, parseDelivery } from '@/lib/merch/logic';

const good = { size: 'M', name: ' Asha  Patel ', line1: '12 Mill Lane', line2: '', town: 'Reading', postcode: 'rg1 1aa' };
const SIZES = ['S', 'M', 'L'];

describe('normalisePostcode', () => {
  it('tidies real postcodes whatever the spacing or case', () => {
    expect(normalisePostcode('sw1a1aa')).toBe('SW1A 1AA');
    expect(normalisePostcode(' m1  1ae ')).toBe('M1 1AE');
    expect(normalisePostcode('B33 8TH')).toBe('B33 8TH');
    expect(normalisePostcode('cr2-6xh')).toBe('CR2 6XH');
  });

  it('refuses anything that is not a UK postcode', () => {
    expect(normalisePostcode('560001')).toBeNull();
    expect(normalisePostcode('12345')).toBeNull();
    expect(normalisePostcode('ABCDEFG')).toBeNull();
    expect(normalisePostcode('')).toBeNull();
    expect(normalisePostcode(null)).toBeNull();
  });
});

describe('parseDelivery', () => {
  it('accepts a good address and tidies it', () => {
    expect(parseDelivery(good, SIZES)).toEqual({
      ok: true,
      value: { size: 'M', name: 'Asha Patel', line1: '12 Mill Lane', line2: null, town: 'Reading', postcode: 'RG1 1AA' },
    });
  });

  it('needs a size only when the item comes in sizes', () => {
    expect(parseDelivery({ ...good, size: 'XXS' }, SIZES)).toEqual({ ok: false, error: 'Choose a size.' });
    expect(parseDelivery({ ...good, size: undefined }, SIZES).ok).toBe(false);
    const noSizes = parseDelivery({ ...good, size: 'M' }, []);
    expect(noSizes.ok && noSizes.value.size).toBeNull();
  });

  it('needs a name, a first line, a town and a UK postcode', () => {
    expect(parseDelivery({ ...good, name: 'A' }, SIZES).ok).toBe(false);
    expect(parseDelivery({ ...good, line1: '' }, SIZES).ok).toBe(false);
    expect(parseDelivery({ ...good, town: ' ' }, SIZES).ok).toBe(false);
    expect(parseDelivery({ ...good, postcode: '560001' }, SIZES).ok).toBe(false);
    expect(parseDelivery(null, SIZES).ok).toBe(false);
    expect(parseDelivery('nonsense', []).ok).toBe(false);
  });

  it('cuts over-long text', () => {
    const parsed = parseDelivery({ ...good, name: 'x'.repeat(500), line2: 'y'.repeat(500) }, SIZES);
    expect(parsed.ok && parsed.value.name.length).toBe(80);
    expect(parsed.ok && parsed.value.line2?.length).toBe(100);
  });
});

describe('addressLines', () => {
  it('leaves out an empty second line', () => {
    expect(addressLines({ size: null, name: 'Asha Patel', line1: '12 Mill Lane', line2: null, town: 'Reading', postcode: 'RG1 1AA' }))
      .toEqual(['Asha Patel', '12 Mill Lane', 'Reading', 'RG1 1AA']);
  });
});
