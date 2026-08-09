import { vi } from 'vitest';

vi.mock('@cloudflare/containers', () => ({
  Container: class {},
  getContainer: (binding: ContainerTestNamespace, name = 'cf-singleton-container') => binding.get(binding.idFromName(name)),
  getRandom: (binding: ContainerTestNamespace, _instances = 3) => Promise.resolve(binding.get(binding.idFromName('instance-0')))
}));

type ContainerTestNamespace = {
  get(id: { toString(): string }): { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> };
  idFromName(name: string): { toString(): string };
};
