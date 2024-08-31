const {
    app,
    BrowserWindow,
    Menu,
    Tray,
    ipcMain,
    globalShortcut,
} = require("electron");
const path = require("path");

let mainWindow;
let tray;
let isQuitting = false; 

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on("second-instance", (event, argv, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
        if (tray) {
            mainWindow.show();
        }
    });

    app.on("ready", () => {
        createWindow();
    });

    app.on("window-all-closed", () => {
        if (!isQuitting && process.platform !== "darwin") {
            mainWindow.hide(); 
        }
    });

    app.on("before-quit", () => {
        isQuitting = true; 
    });

    function createWindow() {
        Menu.setApplicationMenu(null);

        mainWindow = new BrowserWindow({
            width: 1000,
            height: 600,
            icon: path.join(__dirname, "app-icon.png"),
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                webSecurity: false,
                backgroundThrottling: false,
                plugins: true,
                partition: "persist:youtube-music",
            },
        });

        mainWindow.loadURL("https://music.youtube.com");

        mainWindow.on("close", (event) => {
            if (!isQuitting) {
                event.preventDefault();
                mainWindow.hide();
            }
        });

        tray = new Tray(path.join(__dirname, "tray-icon.png"));
        const contextMenu = Menu.buildFromTemplate([
            { label: "Show App", click: () => mainWindow.show() },
            {
                label: "Quit",
                click: () => {
                    isQuitting = true;
                    tray.destroy();
                    app.quit();
                },
            },
        ]);
        tray.setToolTip("YouTube Music");
        tray.setContextMenu(contextMenu);

        tray.on("double-click", () => {
            mainWindow.show();
        });

        setInterval(() => {
            mainWindow.webContents
                .executeJavaScript(
                    `
                (function() {
                    var playPauseButton = document.querySelector('.play-pause-button');
                    if (!playPauseButton) {
                        return { isPlaying: null, info: "No track playing or unable to detect" };
                    }

                    var isPlaying = playPauseButton.getAttribute('aria-label') === '일시중지' || playPauseButton.getAttribute('aria-label') === 'pause';

                    var titleElement = document.querySelector('.title.ytmusic-player-bar');
                    var artistElement = document.querySelector('.byline.ytmusic-player-bar');

                    var title = titleElement ? titleElement.innerText : "Unknown Title";
                    var artist = artistElement ? artistElement.innerText : "Unknown Artist";

                    return { isPlaying: isPlaying, info: title + " - " + artist };
                })();
            `
                )
                .then((result) => {
                    console.log(result);
                    if (result.isPlaying === null) {
                        console.log("Unable to detect playback status.");
                    } else if (result.isPlaying) {
                        tray.setToolTip("Now Playing: " + result.info);
                    } else {
                        tray.setToolTip("Not Playing");
                    }
                });
        }, 5000);
    }

    app.on("will-quit", () => {
        globalShortcut.unregisterAll();
    });
}
