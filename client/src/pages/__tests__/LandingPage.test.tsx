// @jest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import LandingPage from '../LandingPage';

describe('LandingPage', () => {
  it('renders the hero and primary CTAs', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /remember/i })).toBeInTheDocument();
    expect(screen.getByText(/ski or snowboard season/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start tracking free/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /i have an account/i })).toBeInTheDocument();
  });
});
