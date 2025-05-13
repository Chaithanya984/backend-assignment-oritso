const express = require("express");
const cors = require("cors");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const dbpath = path.join(__dirname, "usertask.db");

let db = null;

const initializingServer = async (request, response) => {
  try {
    db = await open({ filename: dbpath, driver: sqlite3.Database });
    app.listen(4000, () => {
      console.log("server is started");
    });
  } catch (e) {
    process.exit(1);
  }
};

initializingServer();

const loginverify = (request, response, next) => {
  console.log(request.headers["authorization"]);

  const authheader = request.headers["authorization"];
  let jwtok;
  if (authheader !== undefined) {
    jwtok = authheader.split(" ")[1];
  }
  if (jwtok === undefined) {
    response.status(401);
    response.send("invalid");
  } else {
    jwt.verify(jwtok, "mysecretdgpredtoken", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("invalid tok");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};
app.post("/register", async (request, response) => {
  const { username, email } = request.body;
  try {
    const selectedqueryuser = `SELECT * FROM userdetails WHERE username = "${username}";`;
    const checkuserdbdetails = await db.get(selectedqueryuser);
    if (checkuserdbdetails === undefined) {
      const checkingemail = `SELECT * FROM userdetails WHERE email = "${email}";`;
      const runemailcheck = await db.get(checkingemail);

      if (runemailcheck !== undefined) {
        response.status(400);
        response.send("this email is already existed in our db");
      } else {
        const protectpass = await bcrypt.hash(request.body.password, 10);

        const insertdata = `INSERT INTO userdetails (username,email,password)
      VALUES ("${username}","${email}","${protectpass}")`;
        const creatingQuery = await db.run(insertdata);
        response.status(200);
        response.send({ message: "user created successfully" });
      }
    } else {
      response.status(409);
      response.send({ message: "User already exist" });
    }
  } catch (e) {
    response.status(404);
    response.send(`error message from server${e.message}`);
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  try {
    const writingquery = `SELECT * FROM userdetails WHERE username = "${username}"`;
    const checkinguser = await db.get(writingquery);

    if (checkinguser === undefined) {
      response.status(401);
      response.send({
        message: "Your data is not available in our database please register",
      });
    } else {
      const comparepass = await bcrypt.compare(password, checkinguser.password);

      if (comparepass === true) {
        const payload = { username: username };
        const jwtToken = await jwt.sign(payload, "mysecretdgpredtoken");

        response.status(200);
        response.send({
          jwtToken,
          message:
            "Logined Successfuly Happy to hear that your logined in our website please track your schedulers",
        });
      } else {
        response.status(400);
        response.send({ message: "Invalid password" });
      }
    }
  } catch (e) {
    response.status(404);
    response.send({ message: `server main error ${e.message}` });
  }
});

app.post("/addtask", loginverify, async (request, response) => {
  const { username } = request;

  const {
    tasktitle,
    taskdescription,
    taskduedate,
    taskstatus,
    taskremarks,
    taskcreatedtimestamp,
    taskupdatedtimestamp,
    userid,
  } = request.body;
  try {
    const getuserid = `SELECT * FROM userdetails WHERE username = "${username}"`;
    const gettingid = await db.get(getuserid);
    const addingTask = `INSERT INTO taskmanager (tasktitle, taskdescription,taskduedate,taskstatus,taskremarks,taskcreatedtimestamp,taskupdatedtimestamp, userid) 
    VALUES
      ("${tasktitle}","${taskdescription}","${taskduedate}","${taskstatus}","${taskremarks}","${taskcreatedtimestamp}","${taskupdatedtimestamp}","${gettingid.id}")`;
    const runaddingtask = await db.run(addingTask);

    response.status(200);
    response.send({ message: "Scheduler task added into database" });
  } catch (e) {
    response.send(`Server side error ${e.message}`);
  }
});

app.get("/alltask", loginverify, async (request, response) => {
  const { username } = request;

  const getques = `SELECT * FROM userdetails WHERE username = "${username}"`;
  const getreas = await db.get(getques);

  const getquer = `SELECT * FROM taskmanager 
  WHERE 
    userid = ${getreas.id}`;

  const getsched = await db.all(getquer);
  response.status(200);
  response.send({ alldatas: getsched });
});

app.put("/updatetask", loginverify, async (request, response) => {
  const { username } = request;

  const updfind = `SELECT * FROM userdetails WHERE username = "${username}"`;
  const findedup = await db.get(updfind);

  const {
    tasktitle,
    taskdescription,
    taskstatus,
    taskremarks,
    taskupdatedtimestamp,
    id,
  } = request.body;

  const updateque = `UPDATE taskmanager SET tasktitle="${tasktitle}", taskdescription ="${taskdescription}", taskstatus ="${taskstatus}",  taskremarks ="${taskremarks}", taskupdatedtimestamp="${taskupdatedtimestamp}" WHERE id = ${id};}`;
  const runsupdate = await db.run(updateque);
  response.status(200);
  response.send({ runsupdate: runsupdate, messages: "updated task" });
});

app.get("/profile", loginverify, async (request, response) => {
  const { username } = request;

  const getque = `SELECT * FROM userdetails WHERE username = "${username}"`;
  const getrea = await db.get(getque);

  response.send(getrea);
});

app.post("/deletetask", loginverify, async (request, response) => {
  const { id } = request.body;
  const deletqu = `DELETE FROM taskmanager WHERE id = ${id};`;
  const runsdel = await db.run(deletqu);
  response.status(200);
  response.send({
    datas: runsdel,
    message: "Successfully removed the row from the table",
  });
});
