#!/usr/bin/env bun

/**
 * Reads the contents of the .stylx file, which is actually a SQLite
 * database.
 */
import { Database } from "bun:sqlite";
import { join, dirname } from "node:path";

const dir = dirname(import.meta.dirname);

const stylxPath = join(dir, "samples", "LocateMP.stylx");

console.log("stylx path", stylxPath);

interface Item {
	id: string;
	class: string;
	category: string;
	name: string;
	tags: string[];
	content: Record<string, unknown>;
}

interface RawItem extends Omit<Item, "content" | "tags"> {
	tags: string;
	content: string;
}

function createDatabase(stylx: string) {
	const db = new Database(`${stylx}`, {
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

function* getItems(db: Database) {
	const query = db.query(
		String.raw`SELECT
			ID id,
			CLASS class,
			CATEGORY category,
			NAME name,
			TAGS tags,
			CONTENT content
		FROM Items`,
	);
	// @ts-expect-error
	for (const item of query.iterate()) {
		yield {
			...(item as RawItem),
			tags: item.tags ? item.tags.split(";") : null,
			content: JSON.parse(item.content),
		};
	}
	// const items = query.all() as Item[];
	// query.finalize();
	// return items;
}

let items: Item[];
const db = createDatabase(stylxPath);
try {
	items = [...getItems(db)];
} finally {
	db.close();
}

for (const item of items) {
	console.log(
		`id: ${item.id}, class: ${item.class}, category: ${item.category ?? "null"}, name: ${item.name}, tags: ${item.tags}
    `,
	);

	console.log(item.content);
}
