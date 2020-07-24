// importa o electron
const electron = require('electron');
// importa os recursos do electron
const { app, BrowserWindow, ipcMain, webContents } = electron;
// utilizado para controlar os caminhos
const path = require('path');
// logger de atualização
const log = require('electron-log');
// importa os recursos de url
const url = require('url');
// importa o socket io
const io = require('socket.io-client');
// coleta o AdmZip
const AdmZip = require('adm-zip');
// controlador de download
const DownloadManager = require("electron-download-manager");
// modulo para verificar a plataforma
const platform = require('os').platform()
// atualizador
const autoUpdate = require('./auto-updater');
// auto inicializadoe
const autoLaunch = require('./auto-launch');
// coleta o filesystem
const fs = require('fs');
// define a store
const Store = require('./store.js');

// Módulos para lidar da minimizaçao do tray
const Menu = electron.Menu
const Tray = electron.Tray
// informa que o app esta inicializando
log.info('App starting...');

// inicializa o auto inicializador
autoLaunch();

// Instancia inicialmente os icones
var trayIcon = null
var appIcon = null

// Determina o icone do tray
if (platform == 'darwin') {
	trayIcon = path.join(__dirname, 'assets', 'logo.png')
} else if (platform == 'win32') {
  trayIcon = path.join(__dirname, 'assets', 'logo.ico')
}

// First instantiate the class
const store = new Store({
  // arquivo de configuração
  configName: 'user-preferences',
  // padrões
  defaults: {
    // token
    token: '',
    // caminho
    path: '',
    // arquivo atual
    currentFile: {},
  },
});

// define a janela principal
let mainWindow;
// define a variável do socket
let socket;
// define a mensagem atual
let currentMessage = '';

/** registra o caminho de download */
DownloadManager.register({
	/** caminho de download */
	downloadFolder: app.getPath("temp") + "/callecg-atualizador",
});

/**
 * Envia uma mensagem para a webview
 * @param  {...any} message parametros
 */
const sendMessage = (...message) => {
  // se a mensamge for do progresso
  if(message[0] == 'update-progress-message') {
    // atualiza a mensagem atual
    currentMessage = message[1];
  }
  // informa todas as janelas sobre o progresso
  webContents.getAllWebContents().forEach(wc => wc.send(...message));
};

/**
 * Efetua a criação de uma janela
 */
function createWindow () {
  
		
	if (process.platform !== 'darwin' && process.platform !== 'linux'){
		// cria o icone para o tray
		appIcon = new Tray(trayIcon)

		// Cria contexto de menu "RightClick" para tray icon
		// Possui dois eventos - 'Restaurar' e 'Sair'
		const contextMenu = Menu.buildFromTemplate([
			{
				label: 'Abrir',
				click: () => {
					mainWindow.show();
				}
			},
			{
				label: 'Sair',
				click: () => {
					app.exit(0);
				}
			}
		])

		// Seta titulo para o tray
		appIcon.setTitle('FTalk')

		// Seta toot tip para o tray
		appIcon.setToolTip('FTalk')
	
		// Cria contexto RightClick no menu
		appIcon.setContextMenu(contextMenu)
	
		// Restaurar (abrir) após clicar no ícone
		// se já estiver aberta, minimiza ela para o tray
		appIcon.on('click', () => {
			mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
		})
	}
  // define a url inicial dessa janela
  const startUrl = process.env.ELECTRON_START_URL || url.format({
    // caminho do arquivo
    pathname: path.join(__dirname, '../index.html'),
    // protoloco da solicitação
    protocol: 'file:',
    // slashes
    slashes: true,
    // icone do tray
		icon: trayIcon,
  });
  // inicializa a janela principal
  mainWindow = new BrowserWindow({
    // define a largura
    width: 800,
    // define a altura
    height: 600,
    // define as preferencias da web
		webPreferences: {
      // arquivo do preload
			preload: path.join(__dirname, 'preload.js'),
		},
  });
  // carrega a url definida
  mainWindow.loadURL(startUrl);
  mainWindow.on('close', (event) => {
		if (process.platform !== 'darwin') {
			event.preventDefault();
			mainWindow.hide();
			return false;
		}
	});
	// quando a janela for fechada
	mainWindow.on('closed', () => {
		// efetua o fechamento do app
		mainWindow = null;
	});
	// caso solicite o foco na janela
	electron.ipcMain.on('window-focus', () => {
		// windows
		mainWindow.show();
	})
  // tenta inicializar o socket
  attemptSocketConnection();
	// inicializa o atualizador
	autoUpdate();
}

// quando o app estiver pronto
app.on('ready', createWindow);

// fecha o app quando todas as janelas forem fechadas
app.on('window-all-closed', (event) => {
  event.preventDefault();
	app.hide();
	return false;
});
// quando minimizar a aplicação apenas esconde
app.on('minimize',function(event){
	// previne que a aplicação seja minimizada
	event.preventDefault();
	// escode a aplicação
	app.hide();
});

// quando for para fechar a aplicação
app.on('close', function (event) {
	// previne que a aplicação feche
	event.preventDefault();
	// esconde a aplicação
	app.hide();
	// informa que não fechou
	return false;
});

// ao abrir o app novamente, se não tiver nenhuma janela aberta, cria ela novamente.
app.on('activate', function () {
	// se não tiver nenhuma janela
	if (mainWindow === null) {
		// cria a janela novamente
		createWindow();
	}
});

const updateFiles = path => message => {
  // efetua o download do arquivo
  DownloadManager.download({
    // url remota
    url: message.url,
    // sempre que houver progresso no download
    onProgress: ({progress}) => {
      // informa a mensagem da atualização
      sendMessage('update-progress-message', `Baixando arquivo de atualização (${Math.floor(progress)}%)`);
    },
  // quando terminar de baixar
  }, (error, info) => {
    // se houve um erro no download
    if (error) {
      // informa o erro do download
      console.log(error);
    // senão
    } else {
      // informa a mensagem da atualização
      sendMessage('update-progress-message', `Extraindo e substituindo arquivos na pasta selecionada.`);
      // instancia o atualizador
      const updateZip = new AdmZip(info.filePath);
      // efetua a extração para o caminho especificado
      updateZip.extractAllTo(path, true);
      // informa a mensagem da atualização
      sendMessage('update-progress-message', `Atualizado.`);
      // atualiza na store
      store.set('currentFile', message.currentFile);
      // remove o arquivo
      fs.unlinkSync(info.filePath);
    }
  });
};

const initSocket = (token, path) => {
  // informa a mensagem da atualização
  sendMessage('update-progress-message', `Conectando...`);
  // se já tivermos um socket
  if(socket) {
    // desconecta do socket
    socket.disconnect();
  }
  // efetua a conexão do socket
  socket = io.connect('http://localhost:8081', { query: { token } });
  // inicializa o evento de escutar o arquivo
  socket.on('UPDATE_FILES', updateFiles(path));
  // inicializa o evento de escutar o arquivo
  socket.on('CURRENT_FILE', ({ currentFile }) => {
    // informa a mensagem da atualização
    sendMessage('update-progress-message', `Conectado`);
    // coleta o arquivo atual
    const storeCurrentFile = store.get('currentFile');
    // verifica se as datas são diferentes
    if(storeCurrentFile.LastModified != currentFile.LastModified) {
      // informa a mensagem da atualização
      sendMessage('update-progress-message', `Verificando atualização...`);
      // solicita o download do arquivo
      socket.emit("REQUEST_FILE");
    } else {
      // informa a mensagem da atualização
      sendMessage('update-progress-message', `Atualizado`);
    }
  });
}

const attemptSocketConnection = () => {
  // coleta o token
  token = store.get('token');
  // coleta o token
  folderPath = store.get('path');
  // se tivermos as informações
  if(token && folderPath) {
    // tenta inicializar o socket
    initSocket(token, folderPath);
  }
}

// roda para inicializar o socket
ipcMain.on('init-socket', (_, token, path) => {
  // salva o token
  store.set('token', token);
  // se o caminho for diferente do atual
  if(path != store.get('path')) {
    // salva o caminho do arquivo
    store.set('path', path);
    // salva o caminho do arquivo
    store.set('currentFile', {});
  }
  // inicializa o socket
  initSocket(token, path);
});

// roda para inicializar o socket
ipcMain.on('get-info', () => {
  // coleta o token
  token = store.get('token');
  // coleta o token
  folderPath = store.get('path');
  // informa a mensagem da atualização
  sendMessage('send-info', { token, path: folderPath, currentMessage });
});