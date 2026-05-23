export interface Agent {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  age: number;
  ageGroup: '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
  education: 'High School or less' | 'Some College / Associate' | 'Bachelor\'s Degree' | 'Postgraduate / Advanced';
  occupation: string;
  state: string;
  region: 'Northeast' | 'Midwest' | 'South' | 'West';
  city: string;
  maritalStatus: 'Single' | 'Married' | 'Divorced' | 'Widowed' | 'Separated';
  persona: string; // Nemotron persona narrative
  culturalBackground: string; // Nemotron cultural_background narrative
  professionalPersona: string; // Nemotron professional_persona narrative
  statement: string; // Brief bio statement
}

export interface DimensionEvaluation {
  score: number; // Stance score from -100 (Strongly Oppose / Hate) to +100 (Strongly Favor / Love)
  concerns: string[];
  benefits: string[];
}

export interface VerbatimQuote {
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  maritalStatus: string;
  occupation: string;
  state: string;
  sentiment: number; // -100 to 100
  quote: string;
}

export interface EvaluationResult {
  pitch: string;
  tagline: string;
  category: string;
  synthesis: {
    overallScore: number; // -100 to 100
    summary: string;
    keyTakeaway: string;
    winners: string; // segments that love it
    losers: string;  // segments that hate it
  };
  // Segment-level evaluations — Nemotron-native dimensions only
  ageGroup: {
    '18-34': DimensionEvaluation;
    '35-54': DimensionEvaluation;
    '55+': DimensionEvaluation;
  };
  education: {
    'High School or less': DimensionEvaluation;
    'Some College / Associate': DimensionEvaluation;
    'Bachelor\'s Degree': DimensionEvaluation;
    'Postgraduate / Advanced': DimensionEvaluation;
  };
  region: {
    'Northeast': DimensionEvaluation;
    'Midwest': DimensionEvaluation;
    'South': DimensionEvaluation;
    'West': DimensionEvaluation;
  };
  gender: {
    'Male': DimensionEvaluation;
    'Female': DimensionEvaluation;
  };
  maritalStatus: {
    'Single': DimensionEvaluation;
    'Married': DimensionEvaluation;
    'Divorced': DimensionEvaluation;
    'Widowed': DimensionEvaluation;
  };
  verbatims: VerbatimQuote[];
}
