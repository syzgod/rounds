import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FhirRepositoryService } from './fhir-repository.service.js';

const FIXTURES_DIR = join(import.meta.dirname, '../../../../data/fhir');

async function load(dir: string): Promise<FhirRepositoryService> {
  const repository = new FhirRepositoryService(dir);
  await repository.onModuleInit();
  return repository;
}

describe('FhirRepositoryService (fixtures)', () => {
  let repository: FhirRepositoryService;

  beforeAll(async () => {
    repository = await load(FIXTURES_DIR);
  });

  it('loads all six patient bundles', () => {
    expect(
      repository
        .getPatients()
        .map((p) => p.id)
        .sort(),
    ).toEqual([
      'pat-amelia-hartwell',
      'pat-jonah-reyes',
      'pat-leilani-kahale',
      'pat-okafor-minimal',
      'pat-priya-natarajan',
      'pat-tomasz-kowalczyk',
    ]);
  });

  it('resolves a urn:uuid reference (transaction bundle)', () => {
    const resolved = repository.resolve({
      reference: 'urn:uuid:f1f98097-a101-4a7d-b587-59d09c35fb4d',
    });
    expect(resolved?.resourceType).toBe('Patient');
    expect(resolved?.id).toBe('pat-amelia-hartwell');
  });

  it('resolves a Type/id reference (collection bundle)', () => {
    const resolved = repository.resolve({
      reference: 'Encounter/enc-jonah-2024-12-18-inpatient',
    });
    expect(resolved?.resourceType).toBe('Encounter');
  });

  it('returns null for unknown or missing references', () => {
    expect(repository.resolve({ reference: 'Patient/nope' })).toBeNull();
    expect(
      repository.resolve({
        reference: 'urn:uuid:00000000-0000-0000-0000-000000000000',
      }),
    ).toBeNull();
    expect(repository.resolve({ display: 'no reference' })).toBeNull();
    expect(repository.resolve(undefined)).toBeNull();
  });

  it('finds a patient by id and only returns Patients', () => {
    expect(repository.getPatient('pat-okafor-minimal')?.name).toEqual([
      { family: 'Okafor' },
    ]);
    expect(repository.getPatient('enc-amelia-2023-03-14')).toBeNull();
    expect(repository.getPatient('nope')).toBeNull();
  });
});

describe('FhirRepositoryService (malformed bundles)', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'fhir-repo-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('rejects a file that is not a Bundle', async () => {
    await writeFile(
      join(dir, 'bad.json'),
      JSON.stringify({ resourceType: 'Patient', id: 'x' }),
    );
    await expect(load(dir)).rejects.toThrow('bad.json: not a FHIR Bundle');
  });

  it('rejects an entry without a resourceType or id', async () => {
    await writeFile(
      join(dir, 'bad.json'),
      JSON.stringify({
        resourceType: 'Bundle',
        type: 'collection',
        entry: [{ resource: { id: 'x' } }],
      }),
    );
    await expect(load(dir)).rejects.toThrow(
      'bad.json: entry 0 has no resource',
    );
  });

  it('rejects duplicate resources across bundles', async () => {
    const bundle = JSON.stringify({
      resourceType: 'Bundle',
      type: 'collection',
      entry: [{ resource: { resourceType: 'Patient', id: 'dup' } }],
    });
    await writeFile(join(dir, 'a.json'), bundle);
    await writeFile(join(dir, 'b.json'), bundle);
    await expect(load(dir)).rejects.toThrow(
      'b.json: duplicate resource key Patient/dup',
    );
  });

  it('ignores non-JSON files and accepts an empty directory', async () => {
    await writeFile(join(dir, 'README.md'), '# not a bundle');
    expect((await load(dir)).getPatients()).toEqual([]);
  });
});
