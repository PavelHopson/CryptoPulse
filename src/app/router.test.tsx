import { describe, expect, it } from 'vitest';
import { useRequireRole } from '../hooks/useRequireRole';

describe('role scoring', () => {
  it('hook should be defined', () => {
    expect(useRequireRole).toBeTypeOf('function');
  });
});
