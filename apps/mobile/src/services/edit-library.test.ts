import { beforeEach, describe, expect, it, vi } from "vitest";

import { archiveEdit, deleteSavedEdit, getSavedEdit, listSavedEdits } from "./edit-library";

const mock = vi.hoisted(() => ({
  directories: new Set<string>(),
  files: new Map<string, Uint8Array>(),
}));

vi.mock("expo-file-system", () => {
  const join = (parts: (string | { uri: string })[]) => parts.reduce<string>((path, part) => {
    const segment = typeof part === "string" ? part : part.uri;
    return path === "" ? segment : `${path.replace(/\/$/, "")}/${segment.replace(/^\//, "")}`;
  }, "");

  class Directory {
    readonly uri: string;
    constructor(...parts: (string | { uri: string })[]) { this.uri = join(parts); }
    get name() { return this.uri.split("/").at(-1) ?? ""; }
    get exists() { return mock.directories.has(this.uri); }
    create() { mock.directories.add(this.uri); }
    delete() {
      for (const path of mock.files.keys()) if (path.startsWith(`${this.uri}/`)) mock.files.delete(path);
      for (const path of mock.directories) if (path === this.uri || path.startsWith(`${this.uri}/`)) mock.directories.delete(path);
    }
    list() {
      return [...mock.directories].filter((path) => path.startsWith(`${this.uri}/`) &&
        !path.slice(this.uri.length + 1).includes("/"))
        .map((path) => new Directory(path));
    }
  }

  class File {
    readonly uri: string;
    constructor(...parts: (string | { uri: string })[]) { this.uri = join(parts); }
    get exists() { return mock.files.has(this.uri); }
    create() { mock.files.set(this.uri, new Uint8Array()); }
    write(value: string) { mock.files.set(this.uri, new TextEncoder().encode(value)); }
    async text() { return new TextDecoder().decode(mock.files.get(this.uri)); }
    async copy(destination: File) {
      const bytes = mock.files.get(this.uri);
      if (bytes === undefined) throw new Error("missing original");
      mock.files.set(destination.uri, bytes);
    }
    async move(destination: File) {
      await this.copy(destination);
      mock.files.delete(this.uri);
    }
    open() {
      return { readBytes: (count: number) => mock.files.get(this.uri)?.slice(0, count) ?? new Uint8Array(), close: () => {} };
    }
    static async downloadFileAsync(_url: string, destination: File) {
      mock.files.set(destination.uri, new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1]));
      return destination;
    }
  }

  return { Directory, File, Paths: { document: new Directory("file:///documents") } };
});

vi.mock("expo-file-system/legacy", () => ({
  EncodingType: { Base64: "base64" },
  writeAsStringAsync: async (uri: string, value: string) => {
    mock.files.set(uri, Uint8Array.from(atob(value), (character) => character.charCodeAt(0)));
  },
}));

describe("edit library", () => {
  beforeEach(() => {
    mock.directories.clear();
    mock.files.clear();
    mock.files.set("file:///original.jpg", new Uint8Array([255, 216, 255]));
  });

  it("keeps an original/edit pair for later comparison, repeat download, and deletion", async () => {
    const saved = await archiveEdit({
      fileName: "original.jpg", height: 1600, mimeType: "image/jpeg", source: "library",
      uri: "file:///original.jpg", width: 1200,
    }, {
      durationMs: 1000, imageUrl: "https://example.test/result", preset: "golden", provider: "test",
    });

    expect(saved.beforeUri).toMatch(/\/before\.jpg$/);
    expect(saved.afterUri).toMatch(/\/after\.png$/);
    expect((await listSavedEdits()).map((edit) => edit.id)).toEqual([saved.id]);
    expect(await getSavedEdit(saved.id)).toEqual(saved);
    await deleteSavedEdit(saved.id);
    expect(await listSavedEdits()).toEqual([]);
  });

  it("archives an OpenAI base64 image result", async () => {
    const saved = await archiveEdit({
      fileName: "original.jpg", height: 1600, mimeType: "image/jpeg", source: "library",
      uri: "file:///original.jpg", width: 1200,
    }, {
      durationMs: 1000,
      imageUrl: "data:image/jpeg;base64,/9j/",
      preset: "golden",
      provider: "openai",
    });

    expect(saved.afterUri).toMatch(/\/after\.jpg$/);
  });
});

vi.mock("./billing", () => ({ requirePaidAccess: vi.fn() }));
