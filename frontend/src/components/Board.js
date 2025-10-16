import React from 'react';
import './Board.css';

const BOARD_SIZE = 15;

function Board({ board, onCellClick, currentPlayer, gameOver, winningLine }) {
  const isWinningCell = (row, col) => {
    if (!winningLine) return false;
    return winningLine.some(([r, c]) => r === row && c === col);
  };

  return (
    <div className="board-container">
      <div className="board">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`board-cell ${cell ? 'occupied' : ''} ${
                  isWinningCell(rowIndex, colIndex) ? 'winning' : ''
                } ${!gameOver && !cell ? 'hover' : ''}`}
                onClick={() => !gameOver && !cell && onCellClick(rowIndex, colIndex)}
              >
                {cell === 'X' && <div className="stone stone-black">⚫</div>}
                {cell === 'O' && <div className="stone stone-white">⚪</div>}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      {!gameOver && (
        <div className="game-info">
          <p>Current Player: 
            <span className={`player-indicator ${currentPlayer === 'X' ? 'black' : 'white'}`}>
              {currentPlayer === 'X' ? ' ⚫ Black' : ' ⚪ White'}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

export default Board;
