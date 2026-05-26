# Trivia Scoreboard React App

This React version keeps the same game flow as the first prototype and now supports a dedicated host screen plus a separate audience display screen:

- 6 categories
- 10, 20, 30, 40, 50, and 60 point questions
- 50-point booster support
- scoreboard columns for `TB`, `DBL`, rounds `1-6`, `F1`, `F2`, `Boost`, and `Total`
- 2 final-round jeopardy-style questions with wagers
- editable scores at any time
- question prompts with optional image, audio, and video media
- second-screen display mode for the board or current live question

## Host Notes

- Manage categories, import spreadsheets, run media, score teams, and drive the audience display from the admin console.
- Spreadsheet import supports columns like `Category`, `Category Title`, `Value`, `Prompt`, `Answer`, `Final`, and `Title`.
- `TB` is the tie breaker column.
- `DBL` doubles all standard questions in the current category, not `BOOST`.
- Closing a question prompt marks the question as asked.
- Selecting teams in the question controls awards the correct answer once.

## Project Files

- [package.json](C:\Users\charlesp\Downloads\trivia-scoreboard-react\package.json)
- [src/App.jsx](C:\Users\charlesp\Downloads\trivia-scoreboard-react\src\App.jsx)
- [src/styles.css](C:\Users\charlesp\Downloads\trivia-scoreboard-react\src\styles.css)

## Run It

From `C:\Users\charlesp\Downloads\trivia-scoreboard-react`:

```powershell
npm install
npm run dev
```

Then:

- Open the normal app URL for the host control screen.
- Use the `Open Display Screen` button to launch the presentation view in a second window.
- The display window reads from the same saved game state and updates as the host changes the board, live question, and scores.

If you prefer, you can also use:

```powershell
npm run build
```

to create a production build after installing dependencies.
