import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { Button, LinkButton } from './Button';
import { Hairline } from './Hairline';
import { Input } from './Input';
import { Wordmark } from './Wordmark';

describe('Button', () => {
  it('is a real button that reports clicks', async () => {
    const onClick = vi.fn();
    renderWithProviders(<Button onClick={onClick}>Publish</Button>);
    const button = screen.getByRole('button', { name: 'Publish' });
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled and announced as busy while working', () => {
    renderWithProviders(
      <Button busy busyLabel="Saving">
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Saving' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('renders router links with the same styling', () => {
    renderWithProviders(<LinkButton to="/desk">Enter the Desk</LinkButton>);
    expect(screen.getByRole('link', { name: 'Enter the Desk' })).toHaveAttribute('href', '/desk');
  });
});

describe('Input', () => {
  it('associates its label', () => {
    renderWithProviders(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('marks itself invalid and announces the error', () => {
    renderWithProviders(<Input label="Email" error="That doesn't look like an email." />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription("That doesn't look like an email.");
    expect(screen.getByRole('alert')).toHaveTextContent("That doesn't look like an email.");
  });
});

describe('Hairline', () => {
  it('is hidden from assistive tech unless it separates content', () => {
    const { container } = renderWithProviders(
      <>
        <Hairline />
        <Hairline decorative={false} />
      </>,
    );
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});

describe('Wordmark', () => {
  it('uses the site defaults when no copy is given', () => {
    renderWithProviders(<Wordmark as="h1" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('WordsBy theshivaank');
  });

  it('accepts custom copy', () => {
    renderWithProviders(<Wordmark name="Notes" byline="By someone" />);
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('By someone')).toBeInTheDocument();
  });
});
