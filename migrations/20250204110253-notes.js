const up = async (db) => {
  await db.createCollection("notes");
};
const down = async (db) => {
  await db.dropCollection("notes");
};

export {up,down}
