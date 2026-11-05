import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | undefined;

// One in-memory MongoDB for the whole run; each test file uses its own database.
export async function setup() {
  mongod = await MongoMemoryServer.create();
  process.env.TEST_MONGO_URI = mongod.getUri();
}

export async function teardown() {
  await mongod?.stop();
}
