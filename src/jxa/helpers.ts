/**
 * helpers.ts — Reusable JXA code fragments injected into tool scripts.
 *
 * These are JavaScript strings that get embedded into osascript calls.
 * They handle common operations like finding records by various identifiers,
 * looking up databases, and detecting the DEVONthink version.
 */

/**
 * JXA helper: Get a reference to the DEVONthink application.
 * Tries "DEVONthink 3" first (v3.x), falls back to "DEVONthink" (v4.x).
 */
export const JXA_APP = `
var app;
try { app = Application("DEVONthink 3"); app.name(); }
catch(e) { app = Application("DEVONthink"); }
`.trim();

/**
 * JXA helper: Find a record by UUID.
 * Expects `uuid` variable to be defined. Sets `record` variable.
 */
export const JXA_FIND_BY_UUID = `
var record = app.getRecordWithUuid(uuid);
if (!record || !record.uuid()) throw new Error("Record not found for UUID: " + uuid);
`;

/**
 * JXA helper: Find a record by ID within a database.
 * Expects `recordId` (number) and `db` (database ref) variables. Sets `record` variable.
 */
export const JXA_FIND_BY_ID = `
var record = db.getRecordAt(recordId);
if (!record || !record.uuid()) throw new Error("Record not found for ID: " + recordId);
`;

/**
 * JXA helper: Find a record by path within a database.
 * Expects `recordPath` (string) and `db` (database ref) variables. Sets `record` variable.
 */
export const JXA_FIND_BY_PATH = `
var record = app.getRecordAt(recordPath, {in: db});
if (!record || !record.uuid()) throw new Error("Record not found at path: " + recordPath);
`;

/**
 * JXA helper: Resolve a database by name.
 * Expects `dbName` variable (string). Sets `db` variable.
 * If dbName is falsy, uses the current database.
 */
export const JXA_RESOLVE_DB = `
var db;
if (dbName) {
  var dbs = app.databases();
  db = null;
  for (var i = 0; i < dbs.length; i++) {
    if (dbs[i].name() === dbName) { db = dbs[i]; break; }
  }
  if (!db) throw new Error("Database not found: " + dbName);
} else {
  db = app.currentDatabase();
}
`;

/**
 * JXA helper: Resolve a record from uuid, recordId, recordPath, or recordName.
 * Expects the identifying variables to be defined (set to null if not provided).
 * Uses `db` if available for ID/path lookups.
 * Sets `record` variable.
 */
export const JXA_RESOLVE_RECORD = `
var record;
if (uuid) {
  record = app.getRecordWithUuid(uuid);
  if (!record || !record.uuid()) throw new Error("Record not found for UUID: " + uuid);
} else if (typeof recordId === "number" && recordId >= 0) {
  if (!db) throw new Error("databaseName is required when using recordId");
  record = db.getRecordAt(recordId);
  if (!record || !record.uuid()) throw new Error("Record not found for ID: " + recordId);
} else if (recordPath) {
  if (!db) throw new Error("databaseName is required when using recordPath");
  record = app.getRecordAt(recordPath, {in: db});
  if (!record || !record.uuid()) throw new Error("Record not found at path: " + recordPath);
} else if (recordName) {
  throw new Error("recordName lookup requires using the search tool instead");
} else {
  throw new Error("One of uuid, recordId, or recordPath must be provided");
}
`;

/**
 * JXA helper: Extract standard record properties into a plain object.
 * Expects `record` variable to be defined.
 * Returns a string expression that evaluates to the properties object.
 */
export const JXA_RECORD_PROPS = `(function() {
  var mimeType = null;
  try { mimeType = record.mime(); } catch(e) {}
  return {
    uuid: record.uuid(),
    name: record.name(),
    type: record.type(),
    path: record.path(),
    location: record.location(),
    database: record.database().name(),
    size: record.size(),
    creationDate: record.creationDate() ? record.creationDate().toISOString() : null,
    modificationDate: record.modificationDate() ? record.modificationDate().toISOString() : null,
    additionDate: record.additionDate() ? record.additionDate().toISOString() : null,
    score: record.score(),
    tags: record.tags(),
    comment: record.comment(),
    url: record.url(),
    referenceUrl: record.referenceURL(),
    kind: record.kind(),
    mimeType: mimeType,
    flagged: record.flag(),
    locking: record.locking(),
    wordCount: record.wordCount(),
    characterCount: record.characterCount(),
    numberOfDuplicates: record.numberOfDuplicates(),
    numberOfReplicants: record.numberOfReplicants(),
    label: record.label(),
    rating: record.rating()
  };
})()`;

/**
 * JXA helper: Extract basic record properties (for lists/search results).
 * Lighter than full props — used when returning arrays of records.
 */
export const JXA_RECORD_SUMMARY = `({
  uuid: record.uuid(),
  name: record.name(),
  type: record.type(),
  location: record.location(),
  database: record.database().name(),
  tags: record.tags(),
  score: record.score(),
  flagged: record.flag(),
  label: record.label(),
  modificationDate: record.modificationDate() ? record.modificationDate().toISOString() : null
})`;
