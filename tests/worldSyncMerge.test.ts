import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRoomCode,
  mergeById,
  mergeWorldSnapshots,
  type SyncableWorldData,
} from '../src/utils/worldSyncMerge.ts';

describe('normalizeRoomCode', () => {
  it('trims whitespace, uppercases, strips non-alphanumeric, and limits to 6 chars', () => {
    assert.equal(normalizeRoomCode('  miel26  '), 'MIEL26');
    assert.equal(normalizeRoomCode('ab-cd 1234'), 'ABCD12');
    assert.equal(normalizeRoomCode('  a1b2  '), 'A1B2');
  });
});

describe('mergeById', () => {
  it('merges concurrent additions from local and remote without dropping either', () => {
    const local = [
      { id: '1', title: 'Shared' },
      { id: 'local-only', title: 'Added on Phone A' },
    ];
    const remote = [
      { id: '1', title: 'Shared Updated' },
      { id: 'remote-only', title: 'Added on Phone B' },
    ];
    const merged = mergeById(local, remote, []);
    const ids = merged.map((x) => x.id);
    assert.ok(ids.includes('1'));
    assert.ok(ids.includes('local-only'));
    assert.ok(ids.includes('remote-only'));
    assert.equal(merged.find((x) => x.id === '1')?.title, 'Shared Updated');
  });

  it('respects deletedIds tombstones so deleted items do not resurrect', () => {
    const local = [
      { id: 'keep', title: 'Keep' },
      { id: 'deleted-by-partner', title: 'Old' },
    ];
    const remote = [{ id: 'keep', title: 'Keep' }];
    const merged = mergeById(local, remote, ['deleted-by-partner']);
    assert.deepEqual(
      merged.map((x) => x.id),
      ['keep']
    );
  });
});

describe('mergeWorldSnapshots', () => {
  const baseLocal: SyncableWorldData = {
    worldId: 'w-1',
    planetName: 'Planeta Miel',
    totalKissesHistory: 100,
    kissesResetAt: 0,
    deletedIds: ['crav-del-local'],
    diaryPages: [
      {
        id: 'd1',
        title: 'Local Note',
        caption: 'Hola',
        readByUserA: true,
        readByUserB: false,
        strokes: [{ id: 's1' }],
        stickers: [{ id: 'st1' }],
      },
      {
        id: 'd-local',
        title: 'Only Local',
        caption: 'Desde iPhone A',
        readByUserA: true,
        readByUserB: false,
        strokes: [],
        stickers: [],
      },
    ],
    mediaItems: [
      {
        id: 'm1',
        title: 'Totoro',
        status: 'watched',
        ratingA: 5,
        reviewA: 'Preciosa',
      },
    ],
    mapPins: [{ id: 'pin-local', name: 'Madrid' }],
    cravings: [
      { id: 'c1', title: 'Ramen', completed: false },
      { id: 'crav-del-remote', title: 'Should disappear', completed: false },
    ],
    expenses: [{ id: 'e-local', title: 'Café', amount: 6 }],
    savingsGoals: [
      {
        id: 'g1',
        title: 'Japón',
        currentAmount: 300,
        contributions: [{ id: 'c1', amount: 300 }],
      },
    ],
  };

  const baseRemote: SyncableWorldData = {
    worldId: 'w-1',
    planetName: 'Planeta Miel',
    totalKissesHistory: 120,
    kissesResetAt: 0,
    deletedIds: ['crav-del-remote'],
    diaryPages: [
      {
        id: 'd1',
        title: 'Local Note',
        caption: 'Hola',
        readByUserA: false,
        readByUserB: true,
        strokes: [{ id: 's2' }],
        stickers: [{ id: 'st2' }],
      },
      {
        id: 'd-remote',
        title: 'Only Remote',
        caption: 'Desde iPhone B',
        readByUserA: false,
        readByUserB: true,
        strokes: [],
        stickers: [],
      },
    ],
    mediaItems: [
      {
        id: 'm1',
        title: 'Totoro',
        status: 'watched',
        ratingB: 4,
        reviewB: 'Muy cute',
      },
    ],
    mapPins: [{ id: 'pin-remote', name: 'Kioto' }],
    cravings: [
      { id: 'c1', title: 'Ramen', completed: true },
      { id: 'crav-del-local', title: 'Deleted locally', completed: false },
    ],
    expenses: [{ id: 'e-remote', title: 'Sushi', amount: 40 }],
    savingsGoals: [
      {
        id: 'g1',
        title: 'Japón',
        currentAmount: 500,
        contributions: [{ id: 'c2', amount: 200 }],
      },
    ],
  };

  it('merges all modules without losing concurrent edits and merges per-user media ratings', () => {
    const merged = mergeWorldSnapshots(baseLocal, baseRemote);

    // Diary pages: both local and remote kept, strokes/stickers/read flags unioned
    assert.equal(merged.diaryPages?.length, 3);
    const d1 = merged.diaryPages?.find((d) => d.id === 'd1');
    assert.equal(d1?.readByUserA, true);
    assert.equal(d1?.readByUserB, true);
    assert.equal(d1?.strokes?.length, 2);
    assert.equal(d1?.stickers?.length, 2);

    // Media item: preserves BOTH ratingA/reviewA and ratingB/reviewB
    const m1 = merged.mediaItems?.find((m) => m.id === 'm1');
    assert.equal(m1?.ratingA, 5);
    assert.equal(m1?.reviewA, 'Preciosa');
    assert.equal(m1?.ratingB, 4);
    assert.equal(m1?.reviewB, 'Muy cute');

    // Pins & expenses: unioned
    assert.equal(merged.mapPins?.length, 2);
    assert.equal(merged.expenses?.length, 2);

    // Cravings: tombstones respected from BOTH sides
    assert.deepEqual(
      merged.cravings?.map((c) => c.id),
      ['c1']
    );
    assert.equal(merged.cravings?.[0].completed, true);

    // Savings goals: contributions unioned
    const g1 = merged.savingsGoals?.find((g) => g.id === 'g1');
    assert.equal(g1?.contributions?.length, 2);
    assert.equal(g1?.currentAmount, 500);

    // Kisses: takes max when no newer reset
    assert.equal(merged.totalKissesHistory, 120);
  });

  it('honors a newer kiss counter reset timestamp instead of keeping old max', () => {
    const merged = mergeWorldSnapshots(
      { totalKissesHistory: 500, kissesResetAt: 1000 },
      { totalKissesHistory: 0, kissesResetAt: 2000 }
    );
    assert.equal(merged.totalKissesHistory, 0);
    assert.equal(merged.kissesResetAt, 2000);
  });

  it('never overwrites valid local pet/lunar fields with null/undefined from remote and handles non-arrays safely', () => {
    const local: SyncableWorldData = {
      roomCode: 'MIEL26',
      petA: { ownerName: 'Alex', birthday: '1999-04-18', petName: 'Mochi' },
      diaryPages: [{ id: 'd1', title: 'Ok', strokes: [], stickers: [] }],
    };
    const corruptRemote = {
      roomCode: 123456 as unknown as string,
      petA: { ownerName: 'Alex', birthday: null, petName: undefined } as unknown as Record<
        string,
        unknown
      >,
      diaryPages: 'not-an-array' as unknown as SyncableWorldData['diaryPages'],
    };
    const merged = mergeWorldSnapshots(local, corruptRemote);
    assert.equal(merged.roomCode, '123456');
    assert.equal(merged.petA?.birthday, '1999-04-18');
    assert.equal(merged.petA?.petName, 'Mochi');
    assert.equal(merged.diaryPages?.length, 1);
  });
});
