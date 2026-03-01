/**
 * Tes integrasi: collectionId pada alur upload
 *
 * Memverifikasi bahwa collectionId disimpan dengan benar
 * saat membuat item, dan dapat diperbarui melalui updateItem.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  createTestUser,
  createTestWorkspace,
  cleanupTestData,
} from "./helpers/db";
import {
  createItem,
  getItem,
  listItems,
  updateItem,
} from "@/services/item-service";
import { db } from "@/db";
import { collections } from "@/db/schema";
import { ulid } from "ulid";

// Hindari akses disk saat tes
vi.mock("@/lib/file-storage", () => ({
  deleteFile: vi.fn().mockResolvedValue(undefined),
  buildSignedUrl: vi.fn((id: string) => `/api/v1/files/${id}?token=mock&expires=999`),
}));

let pengguna: { id: string; name: string; email: string };
let workspace: { id: string };
let koleksiId: string;

beforeAll(async () => {
  await cleanupTestData();

  pengguna = await createTestUser({ name: "__test__KoleksiUser" });
  workspace = await createTestWorkspace(pengguna.id, {
    name: "__test__KoleksiWs",
  });

  // Buat satu koleksi nyata di DB untuk dipakai oleh tes
  koleksiId = ulid();
  const sekarang = new Date();
  await db.insert(collections).values({
    id: koleksiId,
    workspaceId: workspace.id,
    createdBy: pengguna.id,
    name: "__test__Koleksi",
    parentId: null,
    createdAt: sekarang,
    updatedAt: sekarang,
  });
});

afterAll(async () => {
  await cleanupTestData();
});

// ---------------------------------------------------------------------------
// createItem — menyimpan collectionId
// ---------------------------------------------------------------------------

describe("createItem — collectionId disimpan dengan benar", () => {
  it("menyimpan collectionId saat item dibuat dengan koleksi", async () => {
    const item = await createItem({
      workspaceId: workspace.id,
      createdBy: pengguna.id,
      type: "note",
      title: "__test__ItemDalamKoleksi",
      content: "isi catatan",
      collectionId: koleksiId,
    });

    expect(item.collectionId).toBe(koleksiId);
  });

  it("menyimpan collectionId sebagai null saat item dibuat tanpa koleksi", async () => {
    const item = await createItem({
      workspaceId: workspace.id,
      createdBy: pengguna.id,
      type: "note",
      title: "__test__ItemTanpaKoleksi",
      content: "isi catatan tanpa koleksi",
    });

    expect(item.collectionId).toBeNull();
  });

  it("menyimpan collectionId null secara eksplisit", async () => {
    const item = await createItem({
      workspaceId: workspace.id,
      createdBy: pengguna.id,
      type: "drop",
      title: "__test__DropNullKoleksi",
      collectionId: null,
    });

    expect(item.collectionId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getItem — collectionId dikembalikan dengan benar
// ---------------------------------------------------------------------------

describe("getItem — collectionId tersedia dalam hasil", () => {
  it("mengembalikan collectionId yang benar saat item diambil", async () => {
    const dibuat = await createItem({
      workspaceId: workspace.id,
      createdBy: pengguna.id,
      type: "note",
      title: "__test__GetItemKoleksi",
      content: "isi",
      collectionId: koleksiId,
    });

    const ditemukan = await getItem(dibuat.id);
    expect(ditemukan.collectionId).toBe(koleksiId);
  });

  it("mengembalikan collectionId null saat item tidak berada di koleksi mana pun", async () => {
    const dibuat = await createItem({
      workspaceId: workspace.id,
      createdBy: pengguna.id,
      type: "drop",
      title: "__test__GetItemTanpaKoleksi",
    });

    const ditemukan = await getItem(dibuat.id);
    expect(ditemukan.collectionId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listItems — item dapat difilter berdasarkan collectionId
// ---------------------------------------------------------------------------

describe("listItems — item dalam koleksi", () => {
  let wsFilter: { id: string };
  let userFilter: { id: string };
  let koleksiFilter: string;

  beforeAll(async () => {
    userFilter = await createTestUser({ name: "__test__ListKolUser" });
    wsFilter = await createTestWorkspace(userFilter.id, {
      name: "__test__ListKolWs",
    });

    // Buat koleksi kedua untuk workspace ini
    koleksiFilter = ulid();
    const sekarang = new Date();
    await db.insert(collections).values({
      id: koleksiFilter,
      workspaceId: wsFilter.id,
      createdBy: userFilter.id,
      name: "__test__KoleksiFilter",
      parentId: null,
      createdAt: sekarang,
      updatedAt: sekarang,
    });

    // Item dalam koleksi
    await createItem({
      workspaceId: wsFilter.id,
      createdBy: userFilter.id,
      type: "note",
      title: "__test__ItemDalamKol1",
      content: "isi 1",
      collectionId: koleksiFilter,
    });
    await createItem({
      workspaceId: wsFilter.id,
      createdBy: userFilter.id,
      type: "note",
      title: "__test__ItemDalamKol2",
      content: "isi 2",
      collectionId: koleksiFilter,
    });

    // Item di luar koleksi
    await createItem({
      workspaceId: wsFilter.id,
      createdBy: userFilter.id,
      type: "note",
      title: "__test__ItemLuarKol",
      content: "isi luar",
    });
  });

  it("listItems mengembalikan semua item (termasuk yang di dalam dan luar koleksi)", async () => {
    const hasil = await listItems({
      workspaceId: wsFilter.id,
      page: 1,
      limit: 20,
    });
    // 3 item total: 2 dalam koleksi + 1 di luar koleksi
    expect(hasil.meta.total).toBe(3);
    expect(hasil.data.length).toBe(3);
  });

  it("item dalam koleksi memiliki collectionId yang benar", async () => {
    const hasil = await listItems({
      workspaceId: wsFilter.id,
      page: 1,
      limit: 20,
    });
    const dalamKoleksi = hasil.data.filter(
      (item) => item.collectionId === koleksiFilter,
    );
    expect(dalamKoleksi.length).toBe(2);
  });

  it("item di luar koleksi memiliki collectionId null", async () => {
    const hasil = await listItems({
      workspaceId: wsFilter.id,
      page: 1,
      limit: 20,
    });
    const luarKoleksi = hasil.data.filter((item) => item.collectionId === null);
    expect(luarKoleksi.length).toBe(1);
    expect(luarKoleksi[0].title).toBe("__test__ItemLuarKol");
  });
});

// ---------------------------------------------------------------------------
// updateItem — memindahkan item antar koleksi
// ---------------------------------------------------------------------------

describe("updateItem — memindahkan item ke koleksi lain atau menghapus dari koleksi", () => {
  it("memindahkan item ke koleksi yang berbeda", async () => {
    // Buat koleksi kedua
    const koleksiKeduaId = ulid();
    const sekarang = new Date();
    await db.insert(collections).values({
      id: koleksiKeduaId,
      workspaceId: workspace.id,
      createdBy: pengguna.id,
      name: "__test__KoleksiKedua",
      parentId: null,
      createdAt: sekarang,
      updatedAt: sekarang,
    });

    // Buat item di koleksi pertama
    const item = await createItem({
      workspaceId: workspace.id,
      createdBy: pengguna.id,
      type: "note",
      title: "__test__ItemPindahKoleksi",
      content: "isi",
      collectionId: koleksiId,
    });
    expect(item.collectionId).toBe(koleksiId);

    // Pindahkan ke koleksi kedua
    const diperbarui = await updateItem(item.id, {
      collectionId: koleksiKeduaId,
    });
    expect(diperbarui.collectionId).toBe(koleksiKeduaId);
  });

  it("menghapus item dari koleksi (set collectionId menjadi null)", async () => {
    // Buat item di dalam koleksi
    const item = await createItem({
      workspaceId: workspace.id,
      createdBy: pengguna.id,
      type: "note",
      title: "__test__ItemHapusDariKoleksi",
      content: "isi",
      collectionId: koleksiId,
    });
    expect(item.collectionId).toBe(koleksiId);

    // Hapus dari koleksi
    const diperbarui = await updateItem(item.id, { collectionId: null });
    expect(diperbarui.collectionId).toBeNull();
  });

  it("item yang tidak berkoleksi dapat ditambahkan ke koleksi", async () => {
    // Buat item tanpa koleksi
    const item = await createItem({
      workspaceId: workspace.id,
      createdBy: pengguna.id,
      type: "drop",
      title: "__test__DropTambahKoleksi",
    });
    expect(item.collectionId).toBeNull();

    // Tambahkan ke koleksi
    const diperbarui = await updateItem(item.id, { collectionId: koleksiId });
    expect(diperbarui.collectionId).toBe(koleksiId);
  });
});

// ---------------------------------------------------------------------------
// createItem — tipe drop dengan collectionId (simulasi alur upload)
// ---------------------------------------------------------------------------

describe("createItem — drop dengan collectionId (simulasi upload file)", () => {
  it("drop yang diunggah ke koleksi tertentu menyimpan collectionId dengan benar", async () => {
    const drop = await createItem({
      workspaceId: workspace.id,
      createdBy: pengguna.id,
      type: "drop",
      title: "__test__DropUploadKeKoleksi",
      collectionId: koleksiId,
    });

    expect(drop.type).toBe("drop");
    expect(drop.collectionId).toBe(koleksiId);
  });

  it("drop yang diunggah tanpa memilih koleksi menyimpan collectionId sebagai null", async () => {
    const drop = await createItem({
      workspaceId: workspace.id,
      createdBy: pengguna.id,
      type: "drop",
      title: "__test__DropUploadTanpaKoleksi",
    });

    expect(drop.type).toBe("drop");
    expect(drop.collectionId).toBeNull();
  });
});
