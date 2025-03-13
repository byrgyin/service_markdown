import express from 'express';
import cookieParser from "cookie-parser";
import {MongoClient} from "mongodb";
import nunjucks from 'nunjucks';
import dotenv from "dotenv";
import router from "./routes.js";

dotenv.config();

const app = express();

// Инициализация подключения к MongoDB один раз
let client;
let clientPromise;

// const clientPromise = MongoClient.connect(process.env.DB_URI, {
//   maxPoolSize: 10,
// });

if (!clientPromise) {
  client = new MongoClient(process.env.DB_URI, {
    maxPoolSize: 10,
    tls: true,
    tlsCAFile: undefined, // Оставь как есть, если не используешь кастомные CA
    tlsInsecure: false,
    serverSelectionTimeoutMS: 15000
  });
  clientPromise = client.connect(); // Создаём промис один раз
}

// Настройка Nunjucks
nunjucks.configure("views", {
  autoescape: true,
  express: app,
});

app.use(async (req, res, next) => {
  try {
    const client = await clientPromise;
    req.db = client.db("users");
    console.timeEnd("Database Connection");
    next();
  } catch (err) {
    console.error("Database connection error:", err.message);
    console.error("Stack trace:", err.stack);
    next(err);
  }
});

app.set("view engine", "njk");
app.use(express.json());
app.use(express.static("public"));
app.use(cookieParser());
app.use('/',router)

export default app;

// const port = process.env.PORT || 3000;
// app.listen(port, () => {
//   console.log(`Listening on http://localhost:${port}`);
// });
