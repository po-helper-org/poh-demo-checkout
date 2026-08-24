/**
 * Модуль метрик посещений и успешных транзакций.
 * Экспортирует замыкание с счётчиками и функциями управления.
 */
export const counters = (() => {
  let visits = 0;
  let successes = 0;

  return {
    /**
     * Инкремент счётчика посещений.
     * Вызывается при каждом POST /quote.
     * @returns {void}
     */
    incVisit: () => {
      visits += 1;
    },

    /**
     * Инкремент счётчика успешных транзакций.
     * Вызывается при каждом успешном quote() (HTTP 200).
     * @returns {void}
     */
    incSuccess: () => {
      successes += 1;
    },

    /**
     * Получение текущих значений счётчиков.
     * @returns {{visits: number, successes: number}}
     */
    getStats: () => ({
      visits,
      successes
    })
  };
})();
