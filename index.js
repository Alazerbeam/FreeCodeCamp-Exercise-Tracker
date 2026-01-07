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

    user.log.push(exercise);
    user = await user.save();
    
    done(null, user);
  } catch (err) {
    done(err);
  }
}

const findAllUsers = async (done) => {
  try {
    const users = await User.find({});
    done(null, users);
  } catch (err) {
    done(err);
  }
}

const findUserById = async (userId, done) => {
  try {
    const user = await User.findById(userId);
    done(null, user);
  } catch (err) {
    done(err);
  }
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/api/reset', async (req, res) => {
  await User.deleteMany({});
  res.send('Database cleared!');
})

app.get('/api/users', (req, res) => {
  findAllUsers((err, data) => {
    if (err) return res.json({error: 'Database error'});
    const users = data.map(user => ({username: user.username, _id: user._id}));
    res.json(users);
  });
});

app.post('/api/users', (req, res) => {
  findOrCreateUser(req.body.username, (err, data) => {
    if (err) return res.json({error: 'Database error'});
    res.json({username: data.username, _id: data._id});
  });
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

app.get('/api/users/:_id/logs', (req, res) => {
  // req.query could contain from, to, limit
  findUserById(req.params._id, (err, data) => {
    if (err) return res.json({error: 'Database error'});

    const filteredLogWithoutId = data.log
      .map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date
      }))
      .filter(exercise => {
        return !req.query.from || new Date(req.query.from) <= new Date(exercise.date)
      })
      .filter(exercise => {
        return !req.query.to || new Date(req.query.to) >= new Date(exercise.date)
      })
      .slice(0, req.query.limit || data.log.length);

    res.json({
      _id: data._id,
      username: data.username,
      count: filteredLogWithoutId.length,
      log: filteredLogWithoutId
    });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
