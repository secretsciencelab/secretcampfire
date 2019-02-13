(function() {
  const db = require('./db');

  var _interval = null;
  var _timer = null;
  var _taskFuncs = {};

  function _runTasks() {
    var now = Date.now();

    for (var taskName in _taskFuncs)
      db.getCronTask(taskName, function(err, task) {
        if (!task)
        {
          // db entry was deleted somehow, auto-restore and retry later
          db.addCronTask(taskName);
          return;
        }

        var taskFunc = _taskFuncs[task.name];
        var timeSinceLastRun = now - task.last_run;
        if (timeSinceLastRun < taskFunc.interval)
          return;

        taskFunc.func();
        db.updateCronTaskLastRunTime(task.name);
      });
  }

  // 'interval' is in miliseconds
  module.exports.addTask = function(taskName, interval, taskFunc) {
    if (interval <= 0)
      return; // can't do that

    db.addCronTask(taskName, function() {
      _taskFuncs[taskName] = {
        'func': taskFunc,
        'interval': interval
      };

      if (_interval === null || _interval > 0 && interval < _interval)
      {
        // set timer to new interval
        if (_timer)
          clearInterval(_timer);
  
        _interval = interval;
        _timer = setInterval(_runTasks, _interval);
      }
    });
  }

  module.exports.delTask = function(taskName) {
    delete _taskFuncs[taskName];
    if (!Object.keys(_taskFuncs).length)
    {
      // deactivate timer
      if (_timer)
        clearInterval(_timer);
      _interval = null;
    }
    db.delCronTask(taskName);
  }

}());
