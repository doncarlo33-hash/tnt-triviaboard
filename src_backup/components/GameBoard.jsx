import { getQuestionLabel } from '../utils/helpers.js';
import { audioEngine } from '../utils/audio.js';
import Tilt from 'react-parallax-tilt';

export default function GameBoard({
  categories,
  displayCategoryIndex,
  updateState,
  importQuestionsSpreadsheet,
  importQuestionMediaFiles,
  showDisplayCategory,
  openQuestionModal,
}) {
  return (
    <section className="panel panel-wide admin-workspace-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Board Setup</p>
          <h2>Categories and Questions</h2>
        </div>
        <div className="hero-actions">
          <label className="secondary-button file-label" htmlFor="questionSpreadsheet">Import Question Spreadsheet</label>
          <input
            id="questionSpreadsheet"
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={importQuestionsSpreadsheet}
          />
          <label className="secondary-button file-label" htmlFor="questionMediaFiles">Import Question Media</label>
          <input
            id="questionMediaFiles"
            type="file"
            accept="image/*,audio/*,video/*"
            multiple
            hidden
            onChange={importQuestionMediaFiles}
          />
        </div>
      </div>

      <div className="board-editor">
        {categories.map((category, categoryIndex) => (
          <div className="board-card" key={category.id}>
            <h3>Category {categoryIndex + 1}</h3>
            <button
              type="button"
              className="tiny-button"
              onClick={() => {
                if (!category.titleRevealed) {
                  audioEngine.play('categoryReveal');
                }
                updateState((draft) => {
                  draft.categories[categoryIndex].titleRevealed = !draft.categories[categoryIndex].titleRevealed;
                  return draft;
                });
              }}
            >
              {category.titleRevealed ? "Hide On Display" : "Show On Display"}
            </button>
            <button
              type="button"
              className={displayCategoryIndex === categoryIndex ? "primary-button" : "tiny-button"}
              onClick={() => showDisplayCategory(categoryIndex)}
            >
              Display Category
            </button>
          </div>
        ))}
      </div>

      <div className="game-board">
        {categories.map((category, categoryIndex) => (
          <div className="board-column" key={category.id}>
            <div className="board-column-title">{category.title}</div>
            {category.questions.map((question, questionIndex) => (
              <Tilt
                key={question.id}
                tiltMaxAngleX={15}
                tiltMaxAngleY={15}
                scale={1.05}
                transitionSpeed={2000}
                glareEnable={true}
                glareMaxOpacity={0.2}
                glareColor="#ffffff"
                glarePosition="all"
                style={{ display: 'flex', width: '100%', height: '100%' }}
              >
                <button
                  type="button"
                  className={`question-cell${question.answered ? " answered" : ""}${question.kind === "booster" ? " booster-cell" : ""}`}
                  style={{ width: '100%', height: '100%' }}
                  onClick={() => openQuestionModal(categoryIndex, questionIndex)}
                >
                  {getQuestionLabel(question)}
                </button>
              </Tilt>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
