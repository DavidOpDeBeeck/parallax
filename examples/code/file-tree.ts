import type { ChangedFile } from "./code.ts"

export type FileNode = { kind: "file"; name: string; file: ChangedFile; weight: number }

export type FolderNode = { kind: "folder"; name: string; children: MapNode[]; weight: number }

export type MapNode = FileNode | FolderNode

// A file that changed no line, one that only moved, still weighs one so it shows.
export function buildTree(files: ChangedFile[]): FolderNode {
  const root: FolderNode = { kind: "folder", name: "", children: [], weight: 0 }

  for (const file of files) {
    const folderNames = file.path.split("/")
    const fileName = folderNames.pop() ?? file.path
    const folder = folderNames.reduce(childFolder, root)
    folder.children.push({ kind: "file", name: fileName, file, weight: Math.max(1, file.added + file.removed) })
  }

  return settle(root)
}

function childFolder(parent: FolderNode, name: string): FolderNode {
  const existing = parent.children.find((child) => child.kind === "folder" && child.name === name)
  if (existing?.kind === "folder") return existing

  const folder: FolderNode = { kind: "folder", name, children: [], weight: 0 }
  parent.children.push(folder)
  return folder
}

function settle(folder: FolderNode): FolderNode {
  const children = folder.children.map((child) => (child.kind === "folder" ? mergeChain(settle(child)) : child))
  const weight = children.reduce((total, child) => total + child.weight, 0)
  return { ...folder, children: children.sort(heaviestFirst), weight }
}

function mergeChain(folder: FolderNode): FolderNode {
  const [only] = folder.children
  if (folder.children.length !== 1 || only?.kind !== "folder") return folder

  return { ...only, name: `${folder.name}/${only.name}` }
}

function heaviestFirst(left: MapNode, right: MapNode): number {
  if (left.weight !== right.weight) return right.weight - left.weight
  return left.name < right.name ? -1 : 1
}
