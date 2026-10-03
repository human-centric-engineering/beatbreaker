// @vitest-environment happy-dom

/**
 * Settings → Your data (task 8.9): the download the privacy policy promises,
 * pointed at Sunrise's self-service export.
 *
 * @see components/app/account/your-data-section.tsx
 */

import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { YourDataSection } from '@/components/app/account/your-data-section';

it('links to the self-service export as a download', () => {
  render(<YourDataSection />);
  const link = screen.getByRole('link', { name: 'Download your data' });
  expect(link).toHaveAttribute('href', '/api/v1/users/me/export');
  expect(link).toHaveAttribute('download');
});

it('points to account deletion and the policy', () => {
  render(<YourDataSection />);
  expect(screen.getByText('Delete account')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'privacy policy' })).toHaveAttribute('href', '/privacy');
});
