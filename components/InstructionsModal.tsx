import React from 'react';

interface InstructionsModalProps {
  onClose: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border-2 border-yellow-400 rounded-lg p-6 text-left shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="instructions-title">
        <h2 id="instructions-title" className="text-2xl font-bold mb-4 text-yellow-300 border-b pb-2">Инструкция к Игре</h2>
        
        <h3 className="text-xl font-bold mt-4 mb-2 text-yellow-200">Цель Игры</h3>
        <p className="text-sm mb-4">Основная цель - победить Лидера противника, снизив его здоровье до 0.</p>
        
        <h3 className="text-xl font-bold mt-4 mb-2 text-yellow-200">Игровое Поле</h3>
        <p className="text-sm mb-4">Поле каждого игрока разделено на 3 ряда (волны):</p>
        <ul className="list-disc list-inside text-sm ml-4 space-y-1">
          <li><strong>Авангард:</strong> Первая линия обороны и атаки.</li>
          <li><strong>Фланг:</strong> Средний ряд, подходит для юнитов поддержки и стрелков.</li>
          <li><strong>Тыл:</strong> Задний ряд для мощных, но уязвимых юнитов.</li>
        </ul>
        <p className="text-sm mt-2">Способности юнита меняются в зависимости от ряда, в котором он находится.</p>

        <h3 className="text-xl font-bold mt-4 mb-2 text-yellow-200">Ход Игры</h3>
        <p className="text-sm mb-4">В свой ход у вас есть <strong>2 очка действия</strong>. Вы можете потратить их на:</p>
        <ul className="list-disc list-inside text-sm ml-4 space-y-1">
          <li><strong>Розыгрыш карты (1 действие):</strong> Выберите карту из руки и разместите на пустой клетке поля.</li>
          <li><strong>Атака (1 действие):</strong> Выберите своего юнита, готового к атаке (с зеленой рамкой), а затем выберите цель для атаки.</li>
        </ul>
        <p className="text-sm mt-2">Юниты не могут атаковать в тот же ход, когда были разыграны ("болезнь вызова"). Лидер также может атаковать.</p>

        <h3 className="text-xl font-bold mt-4 mb-2 text-yellow-200">Завершение Хода</h3>
        <p className="text-sm mb-4">Когда вы потратили все действия или решили закончить ход, нажмите кнопку "Завершить ход". В начале своего следующего хода вы берете одну карту из колоды.</p>

        <button
          onClick={onClose}
          className="mt-6 w-full px-8 py-3 bg-red-600 text-white font-bold text-lg rounded-md hover:bg-red-500 transition-colors border-b-4 border-red-800 active:border-b-0"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
};