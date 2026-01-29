import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'thriven';

let client = null;
let db = null;

async function getDb() {
  if (db) return db;
  
  client = new MongoClient(MONGO_URL);
  await client.connect();
  db = client.db(DB_NAME);
  
  // Create indexes for better performance
  await db.collection('uploads').createIndex({ created_at: -1 });
  await db.collection('analysis_results').createIndex({ upload_id: 1 });
  await db.collection('stemmaps').createIndex({ upload_id: 1 });
  await db.collection('exports').createIndex({ upload_id: 1, created_at: -1 });
  
  return db;
}

export async function createUpload(data) {
  const database = await getDb();
  const collection = database.collection('uploads');
  
  const doc = {
    _id: data.id,
    folder_path: data.folder_path,
    folder_name: data.folder_name,
    file_count: data.file_count || 0,
    total_size_bytes: data.total_size_bytes || 0,
    status: data.status || 'pending',
    created_at: new Date(),
  };
  
  await collection.insertOne(doc);
  return { ...doc, id: doc._id };
}

export async function getUpload(id) {
  const database = await getDb();
  const collection = database.collection('uploads');
  const doc = await collection.findOne({ _id: id });
  if (doc) {
    return { ...doc, id: doc._id };
  }
  return null;
}

export async function getAllUploads() {
  const database = await getDb();
  const collection = database.collection('uploads');
  const docs = await collection.find({}).sort({ created_at: -1 }).toArray();
  return docs.map(doc => ({ ...doc, id: doc._id }));
}

export async function updateUploadStatus(id, status) {
  const database = await getDb();
  const collection = database.collection('uploads');
  await collection.updateOne({ _id: id }, { $set: { status } });
}

export async function saveAnalysisResult(data) {
  const database = await getDb();
  const collection = database.collection('analysis_results');
  
  const doc = {
    _id: data.id,
    upload_id: data.upload_id,
    raw_index_json: data.raw_index_json,
    analysis_index_json: data.analysis_index_json,
    duplicates_json: data.duplicates_json,
    created_at: new Date(),
  };
  
  await collection.replaceOne(
    { upload_id: data.upload_id },
    doc,
    { upsert: true }
  );
  return { ...doc, id: doc._id };
}

export async function getAnalysisResult(uploadId) {
  const database = await getDb();
  const collection = database.collection('analysis_results');
  const doc = await collection.findOne({ upload_id: uploadId });
  if (doc) {
    return { ...doc, id: doc._id };
  }
  return null;
}

export async function saveStemmap(data) {
  const database = await getDb();
  const collection = database.collection('stemmaps');
  
  const doc = {
    _id: data.id,
    upload_id: data.upload_id,
    stemmap_yaml: data.stemmap_yaml,
    pack_title: data.pack_title,
    bpm: data.bpm,
    key_signature: data.key_signature,
    created_at: new Date(),
  };
  
  await collection.replaceOne(
    { upload_id: data.upload_id },
    doc,
    { upsert: true }
  );
  return { ...doc, id: doc._id };
}

export async function getStemmap(uploadId) {
  const database = await getDb();
  const collection = database.collection('stemmaps');
  const doc = await collection.findOne({ upload_id: uploadId });
  if (doc) {
    return { ...doc, id: doc._id };
  }
  return null;
}

export async function saveExport(data) {
  const database = await getDb();
  const collection = database.collection('exports');
  
  const doc = {
    _id: data.id,
    upload_id: data.upload_id,
    export_type: data.export_type,
    output_path: data.output_path,
    manifest_json: data.manifest_json,
    created_at: new Date(),
  };
  
  await collection.insertOne(doc);
  return { ...doc, id: doc._id };
}

export async function getExports(uploadId) {
  const database = await getDb();
  const collection = database.collection('exports');
  const docs = await collection
    .find({ upload_id: uploadId })
    .sort({ created_at: -1 })
    .toArray();
  return docs.map(doc => ({ ...doc, id: doc._id }));
}

export default { getDb };
