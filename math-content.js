// 수학개념학습 콘텐츠 — 화면/저장 로직과 분리된 순수 데이터
window.MATH_CONTENT_VERSION='20260831-math-1';
window.MATH_CONCEPT_CONTENT={
  units:{
    'linear-equation':{
      id:'linear-equation',grade:'middle1',gradeLabel:'중1',title:'일차방정식',
      intro:'방정식을 풀기 전에 필요한 개념부터 확인해볼까요?',
      prerequisites:[
        {id:'signed-number',title:'양수와 음수 계산',summary:'양수는 0보다 큰 수, 음수는 0보다 작은 수예요.',example:'수직선에서 왼쪽으로 갈수록 수가 작아져요.',question:{id:'m1-pre-signed-01',conceptId:'signed-number',question:'5 - 8 = ?',choices:['-3','3','-13','13'],correctAnswer:'-3',acceptedAnswers:['-3'],explanation:'5에서 8을 빼면 -3이에요.'},reviewQuestion:{id:'m1-review-signed-01',conceptId:'signed-number',question:'4 - 7 = ?',choices:['-3','3','-11','11'],correctAnswer:'-3',acceptedAnswers:['-3'],explanation:'4에서 7을 빼면 -3이에요.'}},
        {id:'substitution',title:'문자의 사용',summary:'문자에 주어진 수를 대신 넣어서 계산하면 돼요.',example:'x=3이면 x+2는 3+2=5예요.',question:{id:'m1-pre-substitution-01',conceptId:'substitution',question:'x=4일 때 2x+1의 값은?',choices:['7','8','9','10'],correctAnswer:'9',acceptedAnswers:['9'],explanation:'2×4+1=9예요.'},reviewQuestion:{id:'m1-review-substitution-01',conceptId:'substitution',question:'x=5일 때 x+3의 값은?',choices:['2','5','8','15'],correctAnswer:'8',acceptedAnswers:['8'],explanation:'5+3=8이에요.'}},
        {id:'like-terms',title:'동류항 계산',summary:'문자 부분이 같은 항끼리는 앞의 수를 더하거나 뺄 수 있어요.',example:'2x+3x=(2+3)x=5x예요.',question:{id:'m1-pre-like-terms-01',conceptId:'like-terms',question:'3x + 2x = ?',choices:['5','5x','6x','x'],correctAnswer:'5x',acceptedAnswers:['5x'],explanation:'x가 같은 항이므로 3+2를 계산해 5x예요.'},reviewQuestion:{id:'m1-review-like-terms-01',conceptId:'like-terms',question:'7x - 2x = ?',choices:['5','5x','9x','-5x'],correctAnswer:'5x',acceptedAnswers:['5x'],explanation:'7-2=5이므로 5x예요.'}},
        {id:'equality',title:'등식 이해',summary:'등호 = 는 왼쪽과 오른쪽의 값이 같다는 뜻이에요.',example:'2+3=5는 양쪽 값이 모두 5인 등식이에요.',question:{id:'m1-pre-equality-01',conceptId:'equality',question:'□ + 3 = 8일 때 □에 들어갈 수는?',choices:['3','5','8','11'],correctAnswer:'5',acceptedAnswers:['5'],explanation:'5+3=8이므로 □는 5예요.'},reviewQuestion:{id:'m1-review-equality-01',conceptId:'equality',question:'□ + 4 = 10일 때 □에 들어갈 수는?',choices:['4','6','10','14'],correctAnswer:'6',acceptedAnswers:['6'],explanation:'6+4=10이므로 □는 6이에요.'}}
      ],
      coreConcepts:[
        {id:'equation-solution',title:'방정식과 해',prerequisiteLinks:['equality'],lines:['방정식은 모르는 수가 들어 있는 등식이에요.','x + 3 = 7','x=4를 넣으면 4 + 3 = 7이 되어 식이 참이 돼요.','방정식을 참이 되게 하는 값을 해라고 해요.'],checkQuestion:{id:'m1-core-solution-01',conceptId:'equation-solution',question:'x + 2 = 6의 해는?',choices:['2','3','4','8'],correctAnswer:'4',acceptedAnswers:['4','x=4'],explanation:'4+2=6이므로 해는 4예요.'}},
        {id:'equality-property',title:'등식의 성질',prerequisiteLinks:['equality'],lines:['방정식은 양쪽에 같은 계산을 해야 해요.','x + 5 = 9','양쪽에서 5 빼기','x + 5 - 5 = 9 - 5','x = 4','한쪽에서 계산했다면 다른 쪽에도 똑같이!'],checkQuestion:{id:'m1-core-property-01',conceptId:'equality-property',question:'x + 7 = 10에서 양변에서 7을 빼면 x는?',choices:['2','3','7','17'],correctAnswer:'3',acceptedAnswers:['3','x=3'],explanation:'10-7=3이므로 x=3이에요.'}},
        {id:'transposition',title:'이항',prerequisiteLinks:['equality'],lines:['먼저 등식의 양쪽에 같은 수를 빼요.','x + 3 = 8','x + 3 - 3 = 8 - 3','x = 8 - 3','x = 5','이 과정을 짧게 나타낸 것이 이항이에요.'],checkQuestion:{id:'m1-core-transposition-01',conceptId:'transposition',question:'x - 4 = 7의 해는?',choices:[],correctAnswer:'x = 11',acceptedAnswers:['11','x=11'],explanation:'양변에 4를 더하면 x=11이에요.'}},
        {id:'linear-solving',title:'일차방정식 풀이',prerequisiteLinks:['like-terms'],lines:['3x + 2 = 11','3x = 9','x = 3','검산: 3×3 + 2 = 11','풀이 순서: 이항 → 정리 → x의 계수로 나누기 → 확인'],checkQuestion:{id:'m1-core-solving-01',conceptId:'linear-solving',question:'2x + 3 = 11의 해는?',choices:[],correctAnswer:'x = 4',acceptedAnswers:['4','x=4'],explanation:'2x=8이므로 x=4예요.'}}
      ],
      finalQuestions:[
        {id:'m1-final-01',conceptId:'equation-solution',question:'방정식을 참이 되게 하는 값을 무엇이라고 하나요?',choices:['항','해','계수','이항'],correctAnswer:'해',acceptedAnswers:['해'],explanation:'방정식을 참이 되게 하는 값을 해라고 해요.'},
        {id:'m1-final-02',conceptId:'equality-property',question:'양변에 같은 수를 더하거나 빼도 등식이 성립하는 성질은?',choices:['교환법칙','분배법칙','등식의 성질','결합법칙'],correctAnswer:'등식의 성질',acceptedAnswers:['등식의성질'],explanation:'등식의 양쪽에는 같은 계산을 할 수 있어요.'},
        {id:'m1-final-03',conceptId:'transposition',question:'x + 6 = 10의 해는?',choices:[],correctAnswer:'x = 4',acceptedAnswers:['4','x=4'],explanation:'양변에서 6을 빼면 x=4예요.'},
        {id:'m1-final-04',conceptId:'linear-solving',question:'3x = 15의 해는?',choices:[],correctAnswer:'x = 5',acceptedAnswers:['5','x=5'],explanation:'양변을 3으로 나누면 x=5예요.'},
        {id:'m1-final-05',conceptId:'linear-solving',question:'2x + 4 = 14의 해는?',choices:[],correctAnswer:'x = 5',acceptedAnswers:['5','x=5'],explanation:'2x=10이고 양변을 2로 나누면 x=5예요.'}
      ]
    }
  }
};

// 모든 문제는 향후 오답연습/선생님 화면에서 단독으로 사용해도 출처를 알 수 있게 한다.
Object.values(window.MATH_CONCEPT_CONTENT.units).forEach(unit=>{
  const stamp=question=>{question.grade=unit.grade;question.unit=unit.id;};
  unit.prerequisites.forEach(item=>{stamp(item.question);stamp(item.reviewQuestion);});
  unit.coreConcepts.forEach(concept=>stamp(concept.checkQuestion));
  unit.finalQuestions.forEach(stamp);
});
