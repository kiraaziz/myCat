const { app, BrowserWindow } = require('electron')
const path = require('path')
const serve = require('electron-serve')
const loadURL = serve({ directory: 'public' })

let mainWindow

const isDev=()=> {
    return !app.isPackaged;
}

const createWindow=()=> {    
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, './public/assets/ico/cat.ico'),
        show: false
    })

    if (isDev()) {
        mainWindow.loadURL('http://localhost:8080/')
    } else {
        loadURL(mainWindow)
    }

    mainWindow.on('closed', function () {
        mainWindow = null
    })
    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })
    
}

app.on('ready', createWindow)