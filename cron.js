(function() {
  const CronJob = require('cron').CronJob;

  var _taskFuncs = {};

  // 'interval' is in minutes
  module.exports.addTask = function(taskName, interval, taskFunc, runNow) {
    if (interval <= 0)
      return; // can't do that

    if (taskName in _taskFuncs) 
      _taskFuncs[taskName].cron.stop();

    _taskFuncs[taskName] = {
      'func': taskFunc,
      'interval': interval,
      'cron': new CronJob("0 */" + interval + " * * * *", taskFunc)
    };
    _taskFuncs[taskName].cron.start();

    if (runNow)
      taskFunc();
  }

  module.exports.delTask = function(taskName) {
    if (taskName in _taskFuncs) 
      _taskFuncs[taskName].cron.stop();

    delete _taskFuncs[taskName];
  }
}());
