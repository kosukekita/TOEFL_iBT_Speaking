export const INDEPENDENT_QUESTIONS = [
  "Some people prefer to live in a big city. Others prefer to live in a small town or in the countryside. Which do you prefer and why? Use specific reasons and examples to support your opinion.",
  "Do you agree or disagree with the following statement? Parents are the best teachers. Use specific reasons and examples to support your answer.",
  "Some people like to travel with a companion. Others prefer to travel alone. Which do you prefer and why?",
  "Some people think that it is better to have a broad knowledge of many academic subjects. Others think that it is better to specialize in one specific subject. Which do you prefer and why?",
  "Do you agree or disagree with the following statement? It is better to make mistakes when learning a new skill than to try to be perfect. Use specific examples and details to support your opinion.",
  "Some students prefer to study alone. Others prefer to study with a group of students. Which do you prefer and why?",
  "Some people think that the government should spend more money on space exploration. Others think that the government should spend more money on basic needs on Earth. Which do you agree with and why?",
  "Do you agree or disagree with the following statement? Technology has made people less social. Use specific reasons and examples to support your opinion.",
  "Some people prefer to watch movies in a theater. Others prefer to watch movies at home. Which do you prefer and why?",
  "If you could learn a new skill, what would it be? Use specific reasons and examples to explain your choice."
];

export function getRandomQuestion(): string {
  const randomIndex = Math.floor(Math.random() * INDEPENDENT_QUESTIONS.length);
  return INDEPENDENT_QUESTIONS[randomIndex];
}

