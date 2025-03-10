import express from 'express';
import cookieParser from "cookie-parser";
import {MongoClient} from "mongodb";
import nunjucks from 'nunjucks';
import dotenv from "dotenv";
import mainRoutes from "./routes/routes.js";

dotenv.config();

const app = express();
const clientPromise = MongoClient.connect(process.env.DB_URI, {
  maxPoolSize: 10,
});

nunjucks.configure("views", {
  autoescape: true,
  express: app,
});

app.use(async (req, res, next) => {
  try {
    const client = await clientPromise;
    req.db = client.db("users");
    next();
  } catch (err) {
    console.error("Database connection error:", err);
    next(err);
  }
});

app.set("view engine", "njk");
app.use(express.json());
app.use(express.static("public"));
app.use(cookieParser());
mainRoutes(app);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
