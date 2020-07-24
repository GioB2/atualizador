// importa o react
import React, { useEffect, useState } from 'react';
// importa os recursos de styles do material
import { makeStyles } from '@material-ui/core/styles';
// importa os recursos do material-ui
import { Button, Paper, Grid, Typography, TextField, CircularProgress } from '@material-ui/core';


// importa o ipc do electron
const { Bridge } = window;

// define as classes do componente
const useStyles = makeStyles({
	// styles da root do componente
	root: {
		width: '100vw',
		height: '100vh',
		background: 'linear-gradient(135deg, rgba(255,11,23,1) 0%, rgba(107,7,12,1) 100%)',
	},
	// styles do paper
	paper: {
		width: '100%',
		padding: 10,
	},
	// styles da mensagem de atualização
	updateMessage: {
		color: "#fff",
		fontWeight: "500",
	},
	// styles do botão
	button: {
		marginTop: 10,
	},
	// styles do container do loader
	loaderContainer: {
		width: '100vw',
		height: '100vh',
	},
});

/**
 * componente que executa o app
 */
export default function Atualizador() {
	// coleta as classes
	const classes = useStyles();
  // define o state
	const [ updateMessage, setUpdateMessage ] = useState("Aguardando configurações");
  // define o state
	const [ chave, setChave ] = useState("");
  // define o state
	const [ folderPath, setFolderPath ] = useState("");
  // define o state
	const [ ready, setReady ] = useState(false);
  // roda ao montar o componente
  useEffect(() => {
		// roda toda vez que a mensagem de atualização muda
    Bridge.updateProgressMessage = message => setUpdateMessage(message);
		// roda toda vez que a mensagem de atualização muda
		Bridge.getInfo();
		// roda quando há uma resposta para as infos
    Bridge.onInfo = ({ token, path, currentMessage }) => {
			// atualiza a chave
			setChave(token);
			// atualiza o caminho
			setFolderPath(path);
			// atualiza o caminho
			setUpdateMessage(currentMessage);
			// atualiza que está pronto
			setReady(true);
		};
  // ao montar o componente
	}, []);
	/**
	 * Inicializa o socket pela primeira vez
	 */
	const handleInit = () => {
    // inicializa o socket
		Bridge.initSocket(chave, folderPath);
	};
	// se não estiver pronto
	if(!ready) {
		// retorna um loader
		return (
			<Grid container alignItems="center" justify="center" className={classes.loaderContainer}>
				<Grid item>
					<CircularProgress variant="indeterminate" />
				</Grid>
			</Grid>
		);
	}
  // retorna o componente
  return (
		<Grid container alignItems="center" justify="center" className={classes.root}>
			<Grid item xs={8}>
				<Paper square className={classes.paper}>
					<Grid container>
						<Grid item xs={12}>
							<TextField
								label="Chave da Licença *"
								type="password"
								value={chave}
								onChange={({target:{ value }}) => setChave(value)}
								helperText="A chave de lincença informada pela Finer"
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								label="Caminho da pasta *"
								value={folderPath}
								onChange={({target:{ value }}) => setFolderPath(value)}
								helperText="O caminho absoluto para a pasta que você deseja sincronizar"
							/>
						</Grid>
						<Grid item xs={12}>
							<Button className={classes.button} onClick={handleInit} fullWidth variant="contained" color="primary" disabled={ !folderPath || !chave }>
								Aplicar Configuração
							</Button>
						</Grid>
					</Grid>
				</Paper>
			</Grid>
			<Grid xs={12} item>
				<Typography align="center" className={classes.updateMessage}>{updateMessage || 'Aguardando configurações'}</Typography>
			</Grid>
		</Grid>
  );
}
