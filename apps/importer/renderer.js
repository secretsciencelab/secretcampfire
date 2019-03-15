const electron = require('electron')
const ipcRenderer = electron.ipcRenderer;

document.getElementById('open-dir').addEventListener('click', _ => {
  var scampyUrl = document.getElementById("url").value;
  if (!scampyUrl)
  {
    alert("Please enter your 'Secret Campfire URL'");
    return;
  }

  var scampyPass = document.getElementById("password").value;
  if (!scampyPass)
  {
    alert("Please enter your 'Secret Campfire password'");
    return;
  }

  var key = document.getElementById("key").value;
  if (!key)
  {
    alert("Please enter your 'Upload key'");
    return;
  }

  console.log("[render] selectDirectory");
  ipcRenderer.send('postImages', scampyUrl, scampyPass, key);
});

ipcRenderer.on("loginFailed", (event, scampyUrl) => {
    alert('Login failed for ' + scampyUrl + '. Please check your password.');
});

ipcRenderer.on("postImageUploading", (event, progress, path) => {
  document.getElementById("post-image-status").innerHTML
    += "<div>Uploading... " + progress + " " + path + "</div>";
});
ipcRenderer.on("postImageSuccess", (event, progress, path) => {
  //console.log(progress + " " + path);
  document.getElementById("post-image-status").innerHTML
    += "<div>Posted to Queue: " + progress + " " + path + "</div>";
});
ipcRenderer.on("postImageFailed", (event, progress, path) => {
  //console.log(progress + " " + path + " failed");
  document.getElementById("post-image-status").innerHTML
    += "<div>Could not post: " + progress + " " + path + "</div>";
});
ipcRenderer.on("postImagesDone", (event) => {
  document.getElementById("post-image-status").innerHTML
    += "<div>Done!</div>";
});
