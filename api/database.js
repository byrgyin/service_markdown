import {nanoid} from 'nanoid';
import {ObjectId} from "mongodb";

/** FUNCTIONS work with DB **/
const createSessions = async (db, userId) => {
  if (!userId) {
    throw  new Error('userId not be found');
  }
  const sessionsId = nanoid();
  await db.collection('sessions').insertOne({
    userId: userId,
    sessionsId: sessionsId,
  });
  return sessionsId;
};

const deleteSessions = async (db, sessionsId) => {
  await db.collection('sessions').deleteOne({sessionsId});
}

const createUser = async (db, user) => {
  return await db.collection('users').insertOne(user);
}
const createNote = async (db, newNote) => {
  const id = await db.collection('notes').insertOne(newNote);
  return {...newNote, id}
}

const findUserByUserName = (db, username) => db.collection("users").findOne({username});

const findUserSessionsId = async (db, sessionsId) => {
  const sessions = await db.collection('sessions').findOne({sessionsId}, {projection: {userId: 1}});
  if (!sessions) {
    return null;
  }
  return db.collection('users').findOne({_id: new ObjectId(sessions.userId)});
}

const auth = () => async (req, res, next) => {
  if (!req.cookies["sessionsId"]) {
    return next();
  }
  try {
    const user = await findUserSessionsId(req.db, req.cookies['sessionsId']);
    if (!user) {
      return next();
    }
    req.user = user;
    req.sessionsId = req.cookies['sessionsId'];
    next();
  } catch (error) {
    next(error);
  }
}
export {
  createSessions,
  deleteSessions,
  createUser,
  createNote,
  findUserByUserName,
  findUserSessionsId,
  auth,
};

/** END FUNCTIONS work with DBB **/
