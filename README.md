# Logitrix 🧩

A modern browser-based logic puzzle game where you place letters in a grid following a set of rules.

## Screenshots

### Main Menu
![Logitrix Main Menu](https://github.com/user-attachments/assets/24db1ae3-4fb7-4175-a175-3ebff303a987)

### Game Screen (Hard - 4×4)
![Logitrix Game Screen](https://github.com/user-attachments/assets/0128e89d-b74c-41b2-884e-c5137ab20eb0)

### Legendary Mode (6×6)
![Logitrix Legendary](https://github.com/user-attachments/assets/da45a05f-2333-4990-bb89-049bb2fa7ae7)

## How to Play

1. Choose a difficulty level from the main menu
2. A grid will appear with a set of rules on the right
3. Select a letter from the bottom panel
4. Click on grid cells to place letters
5. All rules must be satisfied to win
6. Click a placed letter again to remove it

## Difficulty Levels

| Level     | Grid | Letters           |
|-----------|------|-------------------|
| Easy      | 3×3  | A, B, C           |
| Hard      | 4×4  | A, B, C, D        |
| Insane    | 5×5  | A, B, C, D, E     |
| Legendary | 6×6  | A, B, C, D, E, F  |

## Features

- 🎯 Dynamic rule generation from a solved grid
- ⏱️ Timer with personal best records (localStorage)
- 💡 Hint system — highlights a wrong or empty cell
- 📱 Responsive design
- 🎨 Modern neon/glassmorphism UI with particle confetti on win
- ⌨️ Keyboard shortcuts: `1–6` select letters, `Esc` deselects, `H` triggers hint

## File Structure

```
index.html              Main menu
game.html               Game screen
css/styles.css          Menu + global styles
css/game.css            Game-specific styles
js/menu.js              Menu logic
js/game.js              Core game logic
js/rules-engine.js      Rule generation & validation
js/puzzle-generator.js  Puzzle generation
```

## Running the Game

Simply open `index.html` in any modern browser. No server or build step required!