import { relative, resolve } from "node:path";
import { cwd } from "node:process";
import { parseArgs } from "node:util";
import { argv } from "bun";
import { type Item, createDatabase, getItems } from "./stylx";

const parsedArgs = parseArgs({
	args: argv,
	allowPositionals: true,
});

const stylxFiles = parsedArgs.positionals
	.slice(2)
	.filter((path) => path.toLowerCase().endsWith(".stylx"))
	.map((path) => resolve(cwd(), path));

console.debug("stylx files", stylxFiles);

const output: Record<string, unknown> = {};
for (const stylxFilePath of stylxFiles) {
	const db = createDatabase(stylxFilePath);

	let items: Item[];
	try {
		items = [...getItems(db)];
		const relPath = relative(cwd(), stylxFilePath);
		output[relPath] = items;
	} catch (error) {
		console.error(error);
	} finally {
		db.close();
	}
}

console.log(JSON.stringify(output, null, 2));
