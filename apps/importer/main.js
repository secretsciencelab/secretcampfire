// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const electron = require('electron');
const ipcMain = electron.ipcMain;
const dialog = electron.dialog;
const request = require('request');
const fs = require('fs');

function uploadImage(key, filepath, cb) {
  const url = "https://secretcampfire.com/upload/upload.php";
  request.post({
    url: url,
    formData: {
        'image': fs.createReadStream(filepath),
        'key': key
    },
  }, 
  function(error, response, body) {
    var ret = {};
    if (!error)
      ret = JSON.parse(body);

    if (cb)
      cb(ret);
  });
}

function uploadImages(key, dir, images, idx, sender) {
  if (idx >= images.length)
    return;

  var path = images[idx];
  var ext = path.split('.').pop().toLowerCase();
  if (ext != "png" && ext != "gif" && ext != "jpg" && ext != "jpeg")
    return uploadImages(key, dir, images, idx+1, sender);

  console.log("uploading... " + path);
  uploadImage(key, dir + "/" + path, function(ret) {
    console.log("success: " + path);
    console.log(ret);
    sender.send("postedImage", (idx+1)+"/"+images.length, path);

    //return uploadImages(key, dir, images, idx+1, sender);
  });
}

//hold the array of directory paths selected by user
let imageUploadDir;
ipcMain.on('postImages', (event, key) => {
  imageUploadDir = dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  console.log("postImages: " + imageUploadDir[0]);
  fs.readdir(imageUploadDir[0], function(err, files) {
    uploadImages(key, imageUploadDir[0], files, 0, event.sender);
  });
});
