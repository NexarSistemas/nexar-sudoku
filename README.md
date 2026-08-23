# Nexar Sudoku

Version actual: 0.1.0

Nexar Sudoku es un juego web de Nexar Play desarrollado con HTML, CSS y JavaScript puro. Permite jugar partidas de Sudoku con tableros generados aleatoriamente, niveles de dificultad y registro local de tiempos.

## Funcionalidades

- Tres niveles: Fácil, Medio y Difícil.
- Generación aleatoria de tableros con solución única.
- Inicio manual de partida.
- Cronómetro manual por partida.
- Pausa con ocultamiento y bloqueo del tablero.
- Reinicio de tiempo sin generar un nuevo tablero.
- Validación de solución.
- Último tiempo y mejor marca por dificultad.
- Comparación automática con la partida anterior.
- Estadísticas guardadas localmente en el navegador.
- Diseño responsive adaptado a Nexar Sistemas / Nexar Play.

## Niveles de dificultad

- Fácil: 40 pistas iniciales.
- Medio: 32 pistas iniciales.
- Difícil: 26 pistas iniciales.

## Sistema de tiempos

El cronómetro inicia manualmente con el botón `Iniciar partida`. La partida puede pausarse y continuarse sin perder el tiempo acumulado. Al resolver correctamente el tablero, el juego guarda en `localStorage` el último tiempo, el mejor tiempo y la cantidad de partidas completadas por dificultad.

## Ejecución local

El juego no requiere instalación de dependencias. Puede abrirse directamente `index.html` en el navegador.

Para servirlo localmente:

```bash
python3 -m http.server 4173
```

Luego abrir:

```text
http://127.0.0.1:4173/index.html
```

## Publicación

El proyecto está preparado para publicarse directamente con GitHub Pages desde la rama `main` y la carpeta raíz `/`.
