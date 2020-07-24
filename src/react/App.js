// importa o react
import React from 'react';
// importa os recursos de styles do material
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
// importa a tela do atualizador
import Atualizador from './Atualizador';

// define o tema pro app
const theme = createMuiTheme({
  props: {
    MuiTextField: {
      fullWidth: true,
      variant: "filled",
      margin: "normal"
    }
  }
});

/**
 * componente que executa o app
 */
function App() {
  // retorna o componente
  return (
    <ThemeProvider theme={theme}>
      <Atualizador />
    </ThemeProvider>
  );
}

// exporta o app
export default App;
