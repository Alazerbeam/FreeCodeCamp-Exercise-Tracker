const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI);

const exerciseSchema = mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    default: (new Date()).toDateString(),
  },
});
const Exercise = mongoose.model("Exercise", exerciseSchema);

const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  log: [exerciseSchema],
});
const User = mongoose.model("User", userSchema);

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

const findOrCreateUser = async (username, done) => {
  try {
    let user = await User.findOne({username: username});

    if (!user) {
      user = new User({username: username, log: []});
      user = await user.save();
    }

    done(null, user);
  } catch (err) {
    done(err);
  }
}

const addExerciseToUser = async (userId, description, duration, date, done) => {
  try {
    let user = await User.findById(userId);
    const exercise = new Exercise({
      description: description,
      duration: duration,
      date: date,
    });
    console.log("date:", date);
    console.log("exercise.date:", exercise.date);
    user.log.push(exercise);
    user = await user.save();
    done(null, user);
  } catch (err) {
    done(err);
  }
}

const findAllUsers = async (done) => {
  try {
    let users = await User.find({});
    done(null, users);
  } catch (err) {
    done(err);
  }
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/api/users', (req, res) => {
  findAllUsers((err, data) => {
    if (err) return res.json({error: 'Database error'});
    const users = [];
    for (const user of data) {
      users.push({username: user.username, _id: user._id});
    }
    res.json(users);
  });
});

app.post('/api/users', (req, res) => {
  findOrCreateUser(req.body.username, (err, data) => {
    if (err) return res.json({error: 'Database error'});
    res.json({username: data.username, _id: data._id});
  });
});

app.get('/api/users/:_id/exercises', (req, res) => {
  
});

app.post('/api/users/:_id/exercises', (req, res) => {
  let date;
  if (!req.body.date) {
    date = (new Date()).toDateString();
  } else {
    date = (new Date(req.body.date)).toDateString();
  }

  addExerciseToUser(
    req.body[':_id'], 
    req.body.description, 
    req.body.duration, 
    date,
    (err, data) => {
      if (err) return res.json({error: 'Database error'});
      const lastIdx = data.log.length - 1;
      res.json({
        _id: data._id, 
        username: data.username, 
        date: data.log[lastIdx].date,
        duration: data.log[lastIdx].duration,
        description: data.log[lastIdx].description
      });
    }
  );
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
