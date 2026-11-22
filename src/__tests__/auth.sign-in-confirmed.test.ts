/** @jest-environment node */
jest.mock('@/components/auth/SignInForm', () => ({ SignInForm: () => null }));
jest.mock('next/link', () => ({ __esModule: true, default: () => null }));
import { renderToStaticMarkup } from 'react-dom/server';
import SignInPage from '@/app/auth/sign-in/page';

const render = async (sp: Record<string, string>) => renderToStaticMarkup(await SignInPage({ searchParams: Promise.resolve(sp) }));

describe('sign-in page', () => {
  it('says the email is confirmed, with no error, after a different-browser confirmation', async () => {
    const html = await render({ confirmed: '1' });
    expect(html).toContain('Your email is confirmed');
    expect(html).not.toContain('invalid or has expired');
  });
  it('keeps the error for a bad link', async () => {
    const html = await render({ error: 'auth-code-error', detail: 'otp_expired' });
    expect(html).toContain('invalid or has expired');
    expect(html).not.toContain('Your email is confirmed');
  });
});
