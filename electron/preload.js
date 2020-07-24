// coleta o ipcRenderer
const { ipcRenderer: ipc } = require('electron');

// define um objeto que compartilha as funções do electron
window.Bridge = {
	/**
	 * Efetua o evento para atualizar o arquivo local
	 */
	initSocket(token, path) {
		// chama o evento para baixar o arquivo
		ipc.send('init-socket', token, path);
	},
	/**
	 * Efetua o evento para atualizar o arquivo local
	 */
	getInfo() {
		// chama o evento para baixar o arquivo
		ipc.send('get-info');
	},
};


// we get this message from the main process
ipc.on('update-progress-message', (_, message) => {
	/** chama a função do site para atualizar o progresso */
	window.Bridge.updateProgressMessage && window.Bridge.updateProgressMessage(message);
});


// we get this message from the main process
ipc.on('send-info', (_, message) => {
	/** chama a função do site para atualizar o progresso */
	window.Bridge.onInfo && window.Bridge.onInfo(message);
});