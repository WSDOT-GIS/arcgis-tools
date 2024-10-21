#!/usr/bin/env bun

/**
 * Reads the contents of the .stylx file, which is actually a SQLite
 * database.
 */
import { Database, type SQLQueryBindings } from "bun:sqlite";
import { dirname, join } from "node:path";

const dir = dirname(import.meta.dirname);

const stylxPath = join(dir, "samples", "LocateMP.stylx");

console.log("stylx path", stylxPath);

export interface Item {
	id: string;
	class: string;
	category: string;
	name: string;
	tags: string[] | null;
	content: Record<string, unknown>;
}

interface RawItem
	extends Record<string, string>,
		Omit<Item, "content" | "tags"> {
	tags: string;
	content: string;
}

export class StylxItem implements RawItem {
	[key: string]: string;
	id: string;
	class: string;
	category: string;
	name: string;
	tags: string;
	content: string;

	// Note: bun SQL doesn't call the constructor.
	// constructor provided so that typescript
	// doesn't complain about values not being
	// initialized.
	constructor(item: RawItem) {
		this.id = item.id;
		this.class = item.class;
		this.category = item.category;
		this.name = item.name;
		this.tags = item.tags;
		this.content = item.content;
	}
}

export function createDatabase(stylxPath: string) {
	const db = new Database(`${stylxPath}`, {
		readonly: true,
		strict: true,
	});
	return db;
}

export function getTableInfo(db: Database) {
	const tableNames = db
		.query(
			String.raw`SELECT 
				name,
				type
			FROM sqlite_schema 
			WHERE
				type IN ('table', 'view')
				AND
				name NOT LIKE 'sqlite_%'
				ORDER BY 1;`,
		)
		.all() as { name: string; type: "table" | "view" }[];
	return tableNames;
}

export function* getItems(db: Database) {
	const query = db
		.query(
			String.raw`SELECT
			ID id,
			CLASS class,
			CATEGORY category,
			NAME name,
			TAGS tags,
			CONTENT content
		FROM Items`,
		)
		.as(StylxItem);
	for (const item of query.iterate()) {
		yield {
			...(item as RawItem),
			tags: item.tags ? item.tags.split(";") : null,
			content: JSON.parse(item.content),
		};
	}
}
