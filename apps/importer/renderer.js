const electron = require('electron')
const ipcRenderer = electron.ipcRenderer;

document.getElementById('open-dir').addEventListener('click', _ => {
  var key = document.getElementById("key").value;
  if (!key)
  {
    alert("Please enter your 'Upload key'");
    return;
  }

  console.log("[render] selectDirectory");
  ipcRenderer.send('postImages', key);
});

ipcRenderer.on("postedImage", (event, progress, path) => {
  console.log(progress + " " + path);
});
