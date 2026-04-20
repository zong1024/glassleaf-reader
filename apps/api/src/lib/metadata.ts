import { open, readFile, stat } from "node:fs/promises";
import { basename, extname, posix } from "node:path";
import { BookFormat } from "@prisma/client";
import matter from "gray-matter";
import { PDFDocument } from "pdf-lib";
import { XMLParser } from "fast-xml-parser";
import unzipper from "unzipper";

export type ParsedBookMetadata = {
  title: string;
  subtitle?: string;
  description?: string;
  authors: string[];
  language?: string;
  publisher?: string;
  publishedAt?: string;
  identifier?: string;
  isbn?: string;
  subject?: string;
  series?: string;
  pageCount?: number;
  wordCount?: number;
  chapterCount?: number;
  metadataSource: string;
  metadataJson?: Record<string, unknown>;
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  trimValues: true,
});

export async function extractBookMetadata(input: {
  format: BookFormat;
  absolutePath: string;
  originalFileName: string;
}): Promise<ParsedBookMetadata> {
  const fallbackTitle = inferTitleFromFileName(input.originalFileName);

  try {
    switch (input.format) {
      case BookFormat.EPUB:
        return await parseEpubMetadata(input.absolutePath, fallbackTitle);
      case BookFormat.PDF:
        return await parsePdfMetadata(input.absolutePath, fallbackTitle);
      case BookFormat.MD:
        return await parseMarkdownMetadata(input.absolutePath, fallbackTitle);
      case BookFormat.TXT:
        return await parseTextMetadata(input.absolutePath, fallbackTitle);
      default:
        return fallbackMetadata(fallbackTitle);
    }
  } catch (error) {
    return {
      ...fallbackMetadata(fallbackTitle),
      metadataJson: {
        error: error instanceof Error ? error.message : "Unknown metadata error",
      },
    };
  }
}

export function detectBookFormat(extension: string, mimeType: string): BookFormat | null {
  const normalizedExtension = extension.toLowerCase();
  if (normalizedExtension === ".epub" || mimeType === "application/epub+zip") {
    return BookFormat.EPUB;
  }

  if (normalizedExtension === ".pdf" || mimeType === "application/pdf") {
    return BookFormat.PDF;
  }

  if (normalizedExtension === ".txt" || mimeType.startsWith("text/plain")) {
    return BookFormat.TXT;
  }

  if (
    normalizedExtension === ".md" ||
    normalizedExtension === ".markdown" ||
    mimeType === "text/markdown"
  ) {
    return BookFormat.MD;
  }

  return null;
}

export function mergeMetadata(
  parsed: ParsedBookMetadata,
  overrides: Partial<ParsedBookMetadata>,
): ParsedBookMetadata {
  return {
    ...parsed,
    ...pickDefined(overrides),
    authors:
      overrides.authors && overrides.authors.length > 0 ? overrides.authors : parsed.authors,
    metadataJson:
      overrides.metadataJson !== undefined
        ? overrides.metadataJson
        : parsed.metadataJson,
  };
}

export function parseLooseAuthors(input?: string | string[]): string[] {
  if (!input) {
    return [];
  }

  const source = Array.isArray(input) ? input.join(",") : input;
  return Array.from(
    new Set(
      source
        .split(/[,\n;|/]+/)
        .map((item) => cleanText(item))
        .filter((item): item is string => Boolean(item)),
    ),
  );
}

function fallbackMetadata(title: string): ParsedBookMetadata {
  return {
    title,
    authors: [],
    metadataSource: "filename",
  };
}

async function parseEpubMetadata(
  absolutePath: string,
  fallbackTitle: string,
): Promise<ParsedBookMetadata> {
  const directory = await unzipper.Open.file(absolutePath);
  const containerEntry = directory.files.find(
    (entry) => entry.path.toLowerCase() === "meta-inf/container.xml",
  );

  if (!containerEntry) {
    return fallbackMetadata(fallbackTitle);
  }

  const containerXml = (await containerEntry.buffer()).toString("utf8");
  const containerDoc = xmlParser.parse(containerXml);
  const rootfilesNode = findXmlChild(findXmlChild(containerDoc, "container"), "rootfiles");
  const rootfileNode = asArray(findXmlChild(rootfilesNode, "rootfile"))[0] as
    | Record<string, unknown>
    | undefined;
  const opfPath = typeof rootfileNode?.["full-path"] === "string" ? rootfileNode["full-path"] : "";

  if (!opfPath) {
    return fallbackMetadata(fallbackTitle);
  }

  const opfEntry = directory.files.find(
    (entry) => entry.path.toLowerCase() === opfPath.toLowerCase(),
  );

  if (!opfEntry) {
    return fallbackMetadata(fallbackTitle);
  }

  const opfXml = (await opfEntry.buffer()).toString("utf8");
  const packageDoc = xmlParser.parse(opfXml);
  const packageNode = findXmlChild(packageDoc, "package") as Record<string, unknown> | undefined;
  const metadataNode = findXmlChild(packageNode, "metadata");
  const manifestNode = findXmlChild(packageNode, "manifest");
  const spineNode = findXmlChild(packageNode, "spine");

  const title =
    xmlText(firstItem(findXmlChild(metadataNode, "title"))) ||
    xmlText(firstMetaByProperty(metadataNode, "title")) ||
    fallbackTitle;
  const creators = asArray(findXmlChild(metadataNode, "creator"))
    .map((value) => xmlText(value))
    .filter((value): value is string => Boolean(value));
  const identifiers = asArray(findXmlChild(metadataNode, "identifier"))
    .map((value) => xmlText(value))
    .filter((value): value is string => Boolean(value));
  const metaEntries = asArray(findXmlChild(metadataNode, "meta")).filter(
    (value): value is Record<string, unknown> =>
      typeof value === "object" && value !== null && !Array.isArray(value),
  );
  const manifestItems = asArray(findXmlChild(manifestNode, "item")).filter(
    (value): value is Record<string, unknown> =>
      typeof value === "object" && value !== null && !Array.isArray(value),
  );
  const spineItems = asArray(findXmlChild(spineNode, "itemref")).filter(
    (value): value is Record<string, unknown> =>
      typeof value === "object" && value !== null && !Array.isArray(value),
  );

  const coverId = metaEntries.find((entry) => entry.name === "cover")?.content;
  const coverItem =
    manifestItems.find(
      (entry) =>
        typeof entry.properties === "string" &&
        entry.properties.split(/\s+/).includes("cover-image"),
    ) ||
    manifestItems.find((entry) => entry.id === coverId);
  const coverHref =
    typeof coverItem?.href === "string"
      ? posix.normalize(posix.join(posix.dirname(opfPath), coverItem.href))
      : undefined;
  const series =
    xmlText(metaEntries.find((entry) => entry.property === "belongs-to-collection")) ||
    xmlText(metaEntries.find((entry) => entry.name === "calibre:series"));

  return {
    title,
    authors: Array.from(new Set(creators)),
    description: xmlText(firstItem(findXmlChild(metadataNode, "description"))),
    language: xmlText(firstItem(findXmlChild(metadataNode, "language"))),
    publisher: xmlText(firstItem(findXmlChild(metadataNode, "publisher"))),
    publishedAt: xmlText(firstItem(findXmlChild(metadataNode, "date"))),
    identifier: identifiers[0],
    isbn: identifiers.find((value) => /97[89][\d-]+/.test(value)),
    subject: xmlText(firstItem(findXmlChild(metadataNode, "subject"))),
    series,
    chapterCount: spineItems.length,
    metadataSource: "epub-opf",
    metadataJson: {
      opfPath,
      coverHref,
      identifiers,
      manifestCount: manifestItems.length,
    },
  };
}

async function parsePdfMetadata(
  absolutePath: string,
  fallbackTitle: string,
): Promise<ParsedBookMetadata> {
  const bytes = await readFile(absolutePath);
  const pdf = await PDFDocument.load(bytes, {
    updateMetadata: false,
  });

  return {
    title: cleanText(pdf.getTitle()) || fallbackTitle,
    authors: parseLooseAuthors(pdf.getAuthor() ?? undefined),
    publishedAt: pdf.getCreationDate()?.toISOString(),
    subject: cleanText(pdf.getSubject()),
    pageCount: pdf.getPageCount(),
    metadataSource: "pdf-info",
    metadataJson: {
      creator: cleanText(pdf.getCreator()),
      producer: cleanText(pdf.getProducer()),
      keywords: cleanText(pdf.getKeywords()),
      modificationDate: pdf.getModificationDate()?.toISOString(),
    },
  };
}

async function parseMarkdownMetadata(
  absolutePath: string,
  fallbackTitle: string,
): Promise<ParsedBookMetadata> {
  const excerpt = await readHeadAsUtf8(absolutePath, 96 * 1024);
  const parsed = matter(excerpt);
  const stats = await stat(absolutePath);
  const frontmatter = normalizeObject(parsed.data);
  const content = parsed.content.trim();
  const description = firstParagraph(content);
  const authors = parseAuthorsValue(frontmatter.authors ?? frontmatter.author);

  return {
    title: asOptionalString(frontmatter.title) || fallbackTitle,
    subtitle: asOptionalString(frontmatter.subtitle),
    description,
    authors,
    language: asOptionalString(frontmatter.language),
    publisher: asOptionalString(frontmatter.publisher),
    publishedAt: asOptionalString(frontmatter.date),
    identifier: asOptionalString(frontmatter.identifier),
    isbn: asOptionalString(frontmatter.isbn),
    subject: asOptionalString(frontmatter.subject),
    series: asOptionalString(frontmatter.series),
    wordCount: stats.size <= 2 * 1024 * 1024 ? countWords(content) : undefined,
    metadataSource: Object.keys(frontmatter).length > 0 ? "markdown-frontmatter" : "markdown-head",
    metadataJson: Object.keys(frontmatter).length > 0 ? frontmatter : undefined,
  };
}

async function parseTextMetadata(
  absolutePath: string,
  fallbackTitle: string,
): Promise<ParsedBookMetadata> {
  const excerpt = await readHeadAsUtf8(absolutePath, 64 * 1024);
  const lines = excerpt
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter(Boolean);
  const firstLine = lines[0];

  return {
    title: firstLine && firstLine.length < 120 ? firstLine : fallbackTitle,
    description: lines.slice(firstLine && firstLine.length < 120 ? 1 : 0, 5).join(" "),
    authors: [],
    metadataSource: "text-head",
  };
}

async function readHeadAsUtf8(absolutePath: string, length: number): Promise<string> {
  const handle = await open(absolutePath, "r");
  const buffer = Buffer.alloc(length);

  try {
    const result = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, result.bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
}

function inferTitleFromFileName(fileName: string): string {
  const withoutExtension = basename(fileName, extname(fileName));
  const normalized = withoutExtension.replace(/[_-]+/g, " ").trim();
  return normalized.length > 0 ? normalized : "Untitled Book";
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function xmlText(value: unknown): string | undefined {
  if (typeof value === "string") {
    return cleanText(value);
  }

  if (typeof value === "object" && value !== null && "#text" in value) {
    return cleanText(String((value as Record<string, unknown>)["#text"]));
  }

  return undefined;
}

function findXmlChild(node: unknown, localName: string): unknown {
  if (typeof node !== "object" || node === null) {
    return undefined;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key.split(":").at(-1) === localName) {
      return value;
    }
  }

  return undefined;
}

function firstItem(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function firstMetaByProperty(node: unknown, property: string): unknown {
  return asArray(findXmlChild(node, "meta")).find((entry) => {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }

    const candidate = entry as Record<string, unknown>;
    return candidate.property === property || candidate.name === property;
  });
}

function parseAuthorsValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => asOptionalString(item))
          .filter((item): item is string => Boolean(item)),
      ),
    );
  }

  if (typeof value === "string") {
    return parseLooseAuthors(value);
  }

  return [];
}

function firstParagraph(content: string): string | undefined {
  const paragraph = content
    .split(/\r?\n\r?\n/)
    .map((item) => cleanText(item))
    .find(Boolean);

  return paragraph ? paragraph.slice(0, 1_500) : undefined;
}

function countWords(content: string): number {
  return content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function normalizeObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? cleanText(value) : undefined;
}

function cleanText(value: string | undefined | null): string | undefined {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned : undefined;
}

function pickDefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
