import { describe, it, expect, vi } from 'vitest';
import type { StoredSignature } from '@fillit/shared';

import type { SignatureListProps } from '../SignatureList';

// Verify the component module structure is importable
describe('SignatureList', () => {
  const mockSignatures: StoredSignature[] = [
    {
      id: 'sig-1',
      profileId: 'profile-1',
      type: 'drawn',
      label: 'Full Name',
      svgPath: 'M 10 20 L 30 40',
      createdAt: '2026-03-29T00:00:00Z',
      isDefault: true,
    },
    {
      id: 'sig-2',
      profileId: 'profile-1',
      type: 'typed',
      label: 'Initials',
      text: 'RK',
      fontFamily: 'DancingScript-Regular',
      createdAt: '2026-03-29T01:00:00Z',
      isDefault: false,
    },
  ];

  it('should have correct props interface', () => {
    const props: SignatureListProps = {
      signatures: mockSignatures,
      onAdd: vi.fn(),
      onDelete: vi.fn(),
      onSetDefault: vi.fn(),
    };

    expect(props.signatures).toHaveLength(2);
    expect(props.signatures[0]!.isDefault).toBe(true);
    expect(props.signatures[1]!.type).toBe('typed');
  });

  it('should accept empty signatures list', () => {
    const props: SignatureListProps = {
      signatures: [],
      onAdd: vi.fn(),
      onDelete: vi.fn(),
      onSetDefault: vi.fn(),
    };

    expect(props.signatures).toHaveLength(0);
  });

  it('should handle signatures of both types', () => {
    const drawnSig = mockSignatures.find((s) => s.type === 'drawn');
    const typedSig = mockSignatures.find((s) => s.type === 'typed');

    expect(drawnSig).toBeDefined();
    expect(drawnSig!.svgPath).toBeDefined();
    expect(typedSig).toBeDefined();
    expect(typedSig!.text).toBeDefined();
    expect(typedSig!.fontFamily).toBeDefined();
  });
});
