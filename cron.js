const Agenda = require('agenda');
const agenda = new Agenda({db: {address: process.env.MONGODB_URI}});

(async function() {
  await agenda.start();

  // 'interval' is in minutes
  module.exports.addTask = function(taskName, interval, taskFunc, runNow) {
    if (interval <= 0)
      return; // can't do that

    agenda.define(taskName, job => {
      taskFunc();
    });

    agenda.every("0 */" + interval + " * * * *", taskName);

    if (runNow)
      taskFunc();
  }

  module.exports.delTask = function(taskName) {
    agenda.cancel({name: taskName});
  }
})();
