import {
  createSessions,
  deleteSessions,
  createUser,
  createNote,
  findUserByUserName,
  auth
} from "./database.js";
import bodyParser from 'body-parser';
import crypto from "crypto";
import {ObjectId} from "mongodb";
import PDFDocument from "pdfkit";
import {Router} from "express";

const router = Router();

const createHashPassword = (password) => {
  return crypto.createHash("sha256").update(password).digest("hex").trim().replace(/\n/g, "");
}

/*GET Q*/
router.get('/', auth({optional: true}), (req, res) => {
  if (req.user) {
    return res.redirect('/dashboard');
  }
  res.render('index', {
    user: req.user,
    authError: req.query.authError === 'true' ? 'Wrong username or password' : req.query.authError,
    duplicateError: req.query.duplicateError === 'true' ? 'A user with that name already exists' : req.query.duplicateError,
  });
});
router.get('/dashboard', auth(), (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/');
    }
    res.render('dashboard', {user: req.user});
  } catch (error) {
    // eslint-disable-next-line no-undef
    next(error); // Передаем ошибку в обработчик ошибок
  }
});

router.get('/logout', auth(), async (req, res, next) => {
  try {
    if (!req.user) {
      return res.redirect('/');
    }
    await deleteSessions(req.db, req.sessionsId);
    res.clearCookie("sessionsId").redirect("/");
  } catch (error) {
    next(error);
  }
});
router.get('/note', auth(), async (req, res) => {
  const userId = req.user._id.toString();
  const {age, search, page, id} = req.query;
  let notes = [];
  if (search) {
    notes = await req.db.collection('notes').find(
      {
        user_id: userId,
        title: {$regex: search.toLowerCase(), $options: 'i'}
      }
    ).toArray();
    notes = notes.map(note => {
      const regex = new RegExp(`(${search})`, 'gi');
      const highlights = note.title.replace(regex, '<mark>$1</mark>');
      return {...note, highlights};
    });
  } else if (age) {
    let query = {user_id: userId};
    switch (age) {
      case '1month':
        query.created = {$gte: Date.now() - 30 * 24 * 60 * 60 * 1000};
        query.isArchived = false;
        break;
      case '3months':
        query.created = {$gte: Date.now() - 90 * 24 * 60 * 60 * 1000};
        query.isArchived = false;
        break;
      case 'alltime':
        query.isArchived = false;
        break;
      case 'archive':
        query.isArchived = true;
        break;
      default:
        break;
    }
    notes = await req.db.collection('notes').find(query).toArray();
  } else if (page) {
    const pageNumber = parseInt(page);
    const itemsPerPage = 10;
    notes = await req.db.collection('notes').find({user_id: userId})
      .skip((pageNumber - 1) * itemsPerPage)
      .limit(itemsPerPage)
      .toArray();
  } else if (id) {
    notes = await req.db.collection('notes').findOne(
      {user_id: userId, _id: new ObjectId(id)}
    );
  } else {
    notes = await req.db.collection('notes').find({user_id: userId, isArchived: false}).toArray();
  }
  if (notes && notes.length > 0) {
    res.json(notes);
  } else if (notes) {
    res.json(notes);
  } else {
    res.json({'response': 'Not Found'});
  }
});
router.get('/note/:id', auth(), async (req, res) => {
  const userId = req.user._id.toString();
  const id = req.params.id;
  if (userId !== id) {
    const notes = await req.db.collection('notes').findOne({user_id: userId, _id: new ObjectId(id)});
    res.json(notes);
  } else {
    const notes = await req.db.collection('notes')
      .find({user_id: userId})
      .sort({created: -1})
      .limit(1)
      .toArray();
    res.json(notes[0]);
  }
});

router.get('/note/:id/pdf', auth(), async (req, res) => {
  const userId = req.user._id.toString();
  const id = req.params.id;
  const note = await req.db.collection('notes').findOne({user_id: userId, _id: new ObjectId(id)});

  if (!note) {
    return res.status(404).json({error: 'Not Found'});
  }

  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="note-${id}.pdf"`);

  doc.pipe(res);
  doc.fontSize(16).text(note.title, {align: 'center'});
  doc.moveDown();
  doc.fontSize(12).text(note.text);
  doc.end();
})
/*end GET Q*/

/* POST */
router.post('/login', bodyParser.urlencoded({extended: false}), async (req, res) => {
  const {username, password} = req.body;
  const hashPW = createHashPassword(password);
  const user = await findUserByUserName(req.db, username);

  if (!user || user.password !== hashPW) {
    return res.redirect('/?authError=true');
  }

  const userIdString = user._id.toString();
  const sessionsId = await createSessions(req.db, userIdString);
  res.cookie("sessionsId", sessionsId, {httpOnly: true}).redirect('/dashboard');
});

router.post('/signup', bodyParser.urlencoded({extended: false}), async (req, res) => {
  const {username, password} = req.body;
  const user = await findUserByUserName(req.db, username);

  if (user && user.username === username) {
    return res.redirect("/?duplicateError=true");
  } else {
    const hashPW = createHashPassword(password);
    const newUser = {
      username: username,
      password: hashPW,
    };
    const {insertedId} = await createUser(req.db, newUser);
    const sessionsId = await createSessions(req.db, insertedId.toString());
    const demoMark = {
      user_id: insertedId.toString(),
      title: 'Demo',
      text: '**Bold**\n' +
        '*Italic*\n' +
        '# Header\n' +
        '> Quote',
      created: Date.now(),
      isActive: true,
      isArchived: false,
    }
    await createNote(req.db, demoMark);
    res.cookie("sessionsId", sessionsId, {httpOnly: true}).redirect("/");
  }
});

router.post('/new', auth(), async (req, res) => {
  const bodyText = req.body;
  const newTitle = {
    user_id: req.user._id.toString(),
    title: bodyText.title,
    text: bodyText.text,
    created: Date.now(),
    isActive: true,
    isArchived: false,
  }
  await createNote(req.db, newTitle);
  res.json(newTitle);
});
/*end POST */
/* PATCH */
router.patch('/note/:id', auth(), async (req, res) => {
  const userId = req.user._id.toString();
  const id = req.params.id;
  const {isArchived} = req.body;
  let note;
  if (isArchived) {
    // note = await req.db.collection('notes').findOne({ user_id: userId, _id: new ObjectId(id)}); isActive: true,
    note = await req.db.collection('notes').findOneAndUpdate(
      {user_id: userId, _id: new ObjectId(id)},
      {$set: {isArchived: isArchived, isActive: false}},
      {returnOriginal: false}
    );
    res.json(note);
  } else if (!isArchived) {
    note = await req.db.collection('notes').findOneAndUpdate(
      {user_id: userId, _id: new ObjectId(id)},
      {$set: {isArchived: isArchived, isActive: true}},
      {returnOriginal: false}
    );
    res.json(note);
  }
});
/* end PATCH */

/* PUT */
router.put('/note/:id/edit', auth(), async (req, res) => {
  const userId = req.user._id.toString();
  const id = req.params.id;
  const {title, text} = req.body;
  let note;
  if (title && text) {
    note = await req.db.collection('notes').findOneAndUpdate(
      {user_id: userId, _id: new ObjectId(id)},
      {$set: {title: title, text: text}},
      {returnOriginal: false}
    );
    res.status(200).json(note);
  }
})
/* end PUT */
/* DELETE */
router.delete('/note/:id', auth(), async (req, res) => {
  const userId = req.user._id.toString();
  const id = req.params.id;

  if (id) {
    const result = await req.db.collection('notes').deleteOne({user_id: userId, _id: new ObjectId(id)});
    if (result.deletedCount === 0) {
      return res.status(404).json({error: 'Заметка не найдена или у вас нет к ней доступа'});
    }
    res.status(200).json({message: 'Заметка успешно удалена'});
  }
});
router.delete('/note', auth(), async (req, res) => {
  const userId = req.user._id.toString();
  const result = await req.db.collection('notes').deleteMany({user_id: userId, isArchived: true});
  if (result.deletedCount === 0) {
    return res.status(404).json({error: 'Заметка не найдена или у вас нет к ней доступа'});
  }
  res.status(200).json({message: 'Заметки успешно удалена'});
});
/*end DELETE*/
/*SYSTEM CODE*/
router.use((req, res, next) => {
  res.status(404).render('404', {user: req.user || null});
});
/* end SYSTEM CODE*/
export default router;
