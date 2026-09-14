import { useState, useRef } from 'react';
import { ArrowRight, Download, FileText, Plus, Search, Sparkles, Trash2, Upload, Check, AlertCircle, Target, BriefcaseBusiness, X, Pencil } from 'lucide-react';
import './App.css';
import jsPDF from 'jspdf';

type View = 'scan' | 'results' | 'updated';

interface CategoryScore {
  key: KeywordResult['category'];
  name: string;
  score: number;
  found: number;
  total: number;
  icon: React.ReactNode;
  color: string;
}

interface KeywordResult {
  word: string;
  inResume: boolean;
  frequency: number;
  jdFrequency: number;
  category: 'hard' | 'soft' | 'other' | 'degree' | 'jd';
  excluded: boolean;
}

interface JDCoverage {
  coveragePercent: number;
  totalWords: number;
  matchedWords: number;
  totalPhrases: number;
  matchedPhrases: number;
  uncoveredWords: { word: string; count: number }[];
  uncoveredPhrases: { word: string; count: number }[];
}

interface AnalysisResult {
  keywords: KeywordResult[];
  matchScore: number;
  categoryScores: CategoryScore[];
  suggestions: string[];
  missingKeywords: KeywordResult[];
  jdAnalysis: {
    responsibilities: string[];
    requirements: string[];
    skills: string[];
    topKeywords: { word: string; frequency: number }[];
  };
  jdCoverage: JDCoverage;
}

function App() {
  const [view, setView] = useState<View>('scan');
  const [resumeText, setResumeText] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [excludedKeywords, setExcludedKeywords] = useState<string[]>([]);
  const [updatedResume, setUpdatedResume] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadProgress(0);
    try {
      const text = await extractText(file);
      setResumeFileName(file.name);
      setResumeText(text);
      setIsEditingResume(false);
    } catch {
      setError('Failed to read file. Please try another file.');
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) return;
    setIsAnalyzing(true);
    setError('');
    setUploadProgress(0);
    
    const steps = [
      { progress: 20, delay: 200 },
      { progress: 40, delay: 400 },
      { progress: 60, delay: 300 },
      { progress: 80, delay: 200 },
      { progress: 100, delay: 300 },
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, step.delay));
      setUploadProgress(step.progress);
    }

    const result = performDeepAnalysis(resumeText, jobDescription);
    setAnalysis(result);
    setSelectedKeywords([]);
    setExcludedKeywords([]);
    setIsAnalyzing(false);
    setView('results');
  };

  const handleExcludeKeyword = (word: string) => {
    setExcludedKeywords(prev => [...prev, word]);
    setSelectedKeywords(prev => prev.filter(k => k !== word));
  };

  const handleAcceptKeywords = () => {
    if (!analysis || selectedKeywords.length === 0) return;
    const updated = insertKeywordsIntoSections(resumeText, selectedKeywords);
    setUpdatedResume(updated);
    setView('updated');
  };

  const reset = () => {
    setView('scan');
    setAnalysis(null);
    setSelectedKeywords([]);
    setExcludedKeywords([]);
    setUpdatedResume('');
    setError('');
    setUploadProgress(0);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="brand" onClick={reset} role="button" tabIndex={0}>
          <Sparkles size={24} />
          <span>JobScan</span>
        </div>
        <div className="header-actions">
          <span className="tagline">Deep Resume Matching</span>
        </div>
      </header>

      {view === 'scan' && (
        <main className="main">
          <div className="hero">
            <h1>
              <span className="gradient-text">Optimize your resume</span>
              <br />
              <span className="subtitle">for any job with AI-powered analysis</span>
            </h1>
            <p>Upload your resume, paste a job description, and get detailed keyword analysis with actionable suggestions.</p>
          </div>
          {error && <div className="error-banner">{error}</div>}
          <div className="scan-grid">
            <div className="card upload-card">
              <div className="card-header">
                <FileText size={22} />
                <div>
                  <h2>Your Resume</h2>
                  <p>Upload PDF, DOCX, or TXT files</p>
                </div>
              </div>
              <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                <div className="upload-icon">
                  <Upload size={36} />
                </div>
                <p className="upload-text">{resumeFileName ? resumeFileName : 'Drop your resume here or click to browse'}</p>
                <span className="upload-hint">PDF, DOCX, or TXT · up to 10MB</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
                hidden
              />
              {resumeText && (
                <div className="preview-box">
                  <div className="preview-header">
                    <span>Extracted Resume Text</span>
                    <div className="preview-actions">
                      <button
                        className="preview-edit-btn"
                        onClick={() => setIsEditingResume(prev => !prev)}
                      >
                        <Pencil size={14} />
                        {isEditingResume ? 'Done editing' : 'Edit / paste'}
                      </button>
                      <button className="icon-btn" onClick={() => { setResumeText(''); setResumeFileName(''); setIsEditingResume(false); }} aria-label="Remove resume">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {isEditingResume ? (
                    <textarea
                      className="resume-editor"
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      placeholder="Paste or edit your complete resume here..."
                      aria-label="Edit extracted resume text"
                    />
                  ) : (
                    <pre>{resumeText}</pre>
                  )}
                </div>
              )}
            </div>

            <div className="card jd-card">
              <div className="card-header">
                <Search size={22} />
                <div>
                  <h2>Job Description</h2>
                  <p>Paste the full job description for deep analysis</p>
                </div>
              </div>
              <textarea
                placeholder="Paste the complete job description here... Include responsibilities, requirements, qualifications, and any specific skills mentioned..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
              <button
                className="btn-primary"
                onClick={handleAnalyze}
                disabled={!resumeText.trim() || !jobDescription.trim() || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <div className="spinner" />
                    Analyzing...
                  </>
                ) : (
                  <>Analyze Match <ArrowRight size={18} /></>
                )}
              </button>
              {isAnalyzing && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {view === 'results' && analysis && (
        <main className="main">
          <div className="results-header">
            <button className="back-btn" onClick={reset}>
              <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} /> New Scan
            </button>
            <div className="score-badge">
              <div className="score-ring">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="circle" strokeDasharray={`${analysis.matchScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="score-text">{analysis.matchScore}%</span>
              </div>
              <div className="score-label">
                <strong>Overall Match Score</strong>
                <span>Job-specific compatibility</span>
              </div>
            </div>
          </div>

          <div className="category-scores">
            {analysis.categoryScores.map(cat => (
              <div key={cat.name} className={`category-card ${cat.color}`}>
                <div className="category-header">
                  <div className="category-icon">{cat.icon}</div>
                  <div>
                    <h4>{cat.name}</h4>
                    <span>{cat.found}/{cat.total} matched</span>
                  </div>
                </div>
                <div className="category-score">{cat.score}%</div>
              </div>
            ))}
          </div>

          <div className="card coverage-card">
            <div className="coverage-top">
              <div className="coverage-title">
                <h3>Word-by-Word JD Coverage</h3>
                <p className="hint">
                  Every meaningful word &amp; phrase from the job description is checked against your resume using
                  smart stem matching (e.g. &quot;managing&quot; matches &quot;manage&quot;).
                </p>
              </div>
              <div className="coverage-score">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="circle" strokeDasharray={`${analysis.jdCoverage.coveragePercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="score-text">{analysis.jdCoverage.coveragePercent}%</span>
              </div>
            </div>
            <div className="coverage-stats">
              <div className="coverage-stat">
                <strong>{analysis.jdCoverage.matchedWords}<span className="coverage-total">/{analysis.jdCoverage.totalWords}</span></strong>
                <span>JD words found</span>
              </div>
              <div className="coverage-stat">
                <strong>{analysis.jdCoverage.matchedPhrases}<span className="coverage-total">/{analysis.jdCoverage.totalPhrases}</span></strong>
                <span>JD phrases found</span>
              </div>
              <div className="coverage-stat">
                <strong>{analysis.keywords.filter(k => k.inResume && !k.excluded).length}</strong>
                <span>keywords found</span>
              </div>
            </div>
          </div>

          <div className="results-grid">
            <div className="card keywords-card">
              <h3>Missing Keywords</h3>
              <p className="hint">Select keywords you actually have to add to your resume. Exclude keywords you don't possess.</p>
              <div className="keyword-categories">
                <div className="keyword-category">
                  <h4>Hard Skills</h4>
                  <div className="keyword-list">
                    {analysis.keywords.filter(k => k.category === 'hard' && !k.inResume && !k.excluded && !excludedKeywords.includes(k.word)).map(k => (
                      <button
                        key={k.word}
                        className={`keyword-chip missing ${selectedKeywords.includes(k.word) ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedKeywords(prev =>
                            prev.includes(k.word) ? prev.filter(w => w !== k.word) : [...prev, k.word]
                          );
                        }}
                      >
                        {selectedKeywords.includes(k.word) ? <Check size={14} /> : <Plus size={14} />}
                        {k.word}
                        <span className="freq">{k.jdFrequency}x</span>
                      </button>
                    ))}
                    {analysis.keywords.filter(k => k.category === 'hard' && !k.inResume && k.excluded).map(k => (
                      <button key={k.word} className="keyword-chip excluded">
                        <X size={14} /> {k.word}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="keyword-category">
                  <h4>Soft Skills</h4>
                  <div className="keyword-list">
                    {analysis.keywords.filter(k => k.category === 'soft' && !k.inResume && !k.excluded && !excludedKeywords.includes(k.word)).map(k => (
                      <button
                        key={k.word}
                        className={`keyword-chip missing ${selectedKeywords.includes(k.word) ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedKeywords(prev =>
                            prev.includes(k.word) ? prev.filter(w => w !== k.word) : [...prev, k.word]
                          );
                        }}
                      >
                        {selectedKeywords.includes(k.word) ? <Check size={14} /> : <Plus size={14} />}
                        {k.word}
                        <span className="freq">{k.jdFrequency}x</span>
                      </button>
                    ))}
                    {analysis.keywords.filter(k => k.category === 'soft' && !k.inResume && k.excluded).map(k => (
                      <button key={k.word} className="keyword-chip excluded">
                        <X size={14} /> {k.word}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="keyword-category">
                  <h4>Other Keywords</h4>
                  <div className="keyword-list">
                    {analysis.keywords.filter(k => k.category === 'other' && !k.inResume && !k.excluded && !excludedKeywords.includes(k.word)).map(k => (
                      <button
                        key={k.word}
                        className={`keyword-chip missing ${selectedKeywords.includes(k.word) ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedKeywords(prev =>
                            prev.includes(k.word) ? prev.filter(w => w !== k.word) : [...prev, k.word]
                          );
                        }}
                      >
                        {selectedKeywords.includes(k.word) ? <Check size={14} /> : <Plus size={14} />}
                        {k.word}
                        <span className="freq">{k.jdFrequency}x</span>
                      </button>
                    ))}
                    {analysis.keywords.filter(k => k.category === 'other' && !k.inResume && k.excluded).map(k => (
                      <button key={k.word} className="keyword-chip excluded">
                        <X size={14} /> {k.word}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="keyword-category">
                  <h4>JD Terms (word-by-word)</h4>
                  <div className="keyword-list">
                    {analysis.keywords.filter(k => k.category === 'jd' && !k.inResume && !k.excluded && !excludedKeywords.includes(k.word)).map(k => (
                      <button
                        key={k.word}
                        className={`keyword-chip missing ${selectedKeywords.includes(k.word) ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedKeywords(prev =>
                            prev.includes(k.word) ? prev.filter(w => w !== k.word) : [...prev, k.word]
                          );
                        }}
                      >
                        {selectedKeywords.includes(k.word) ? <Check size={14} /> : <Plus size={14} />}
                        {k.word}
                        <span className="freq">{k.jdFrequency}x</span>
                      </button>
                    ))}
                    {analysis.keywords.filter(k => k.category === 'jd' && k.excluded).map(k => (
                      <button key={k.word} className="keyword-chip excluded">
                        <X size={14} /> {k.word}
                      </button>
                    ))}
                    {analysis.keywords.filter(k => k.category === 'jd' && !k.inResume && !k.excluded).length === 0 && (
                      <span className="no-more">All job description terms are covered by your resume</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card actions-card">
              <h3>Missing Keywords</h3>
              <div className="missing-table">
                <div className="missing-table-header">
                  <span>Keyword</span>
                  <span>Category</span>
                  <span>JD Freq</span>
                  <span>Action</span>
                </div>
                {analysis.missingKeywords.filter(k => !k.excluded && !excludedKeywords.includes(k.word)).map(k => (
                  <div key={k.word} className="missing-table-row">
                    <span className="missing-keyword">{k.word}</span>
                    <span className={`missing-cat ${k.category}`}>{k.category}</span>
                    <span className="missing-freq">{k.jdFrequency}x</span>
                    <div className="missing-actions">
                      <button
                        className="action-btn add"
                        onClick={() => setSelectedKeywords(prev => prev.includes(k.word) ? prev.filter(w => w !== k.word) : [...prev, k.word])}
                        title={selectedKeywords.includes(k.word) ? 'Remove from selection' : 'Add to resume'}
                      >
                        {selectedKeywords.includes(k.word) ? <Check size={14} /> : <Plus size={14} />}
                      </button>
                      <button
                        className="action-btn exclude"
                        onClick={() => handleExcludeKeyword(k.word)}
                        title="Exclude keyword"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-icon found">
                    <Check size={18} />
                  </div>
                  <div>
                    <strong>{analysis.keywords.filter(k => k.inResume).length}</strong>
                    <span>Found</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon missing">
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <strong>{analysis.missingKeywords.filter(k => !k.excluded && !excludedKeywords.includes(k.word)).length}</strong>
                    <span>Missing</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon selected">
                    <Target size={18} />
                  </div>
                  <div>
                    <strong>{selectedKeywords.length}</strong>
                    <span>Selected</span>
                  </div>
                </div>
              </div>

              <div className="suggestions">
                <h4>💡 Suggestions</h4>
                <ul>
                  {analysis.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <button
                className="btn-primary"
                disabled={selectedKeywords.length === 0}
                onClick={handleAcceptKeywords}
              >
                Accept & Update Resume <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </main>
      )}

      {view === 'updated' && (
        <main className="main">
          <div className="updated-header">
            <div className="success-icon">
              <Check size={48} />
            </div>
            <h1>Resume Updated Successfully!</h1>
            <p>Added {selectedKeywords.length} keywords to optimize your resume.</p>
          </div>
          <div className="updated-layout">
            <div className="card resume-preview-card">
              <div className="preview-header">
                <h3>Updated Resume</h3>
                <button className="btn-download" onClick={() => generatePDF(updatedResume, analysis!, selectedKeywords, resumeFileName)}>
                  <Download size={16} /> Download PDF
                </button>
              </div>
              <pre className="resume-text">{updatedResume}</pre>
            </div>
            <div className="card sidebar-card">
              <h3>Summary</h3>
              <div className="summary-list">
                <div className="summary-item">
                  <span>Original Match Score</span>
                  <strong>{analysis?.matchScore || 0}%</strong>
                </div>
                <div className="summary-item">
                  <span>Keywords Added</span>
                  <strong>{selectedKeywords.length}</strong>
                </div>
                <div className="summary-item">
                  <span>Estimated New Score</span>
                  <strong className="success">
                    {Math.min(100, Math.round(((analysis?.keywords.filter(k => k.inResume).length || 0) + selectedKeywords.length) / Math.max((analysis?.keywords.filter(k => !k.excluded).length || 1), 1) * 100))}%
                  </strong>
                </div>
                <div className="summary-item">
                  <span>Status</span>
                  <strong className="success">Optimized</strong>
                </div>
              </div>
              <button className="btn-secondary" onClick={reset}>
                <Plus size={18} /> New Scan
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

function insertKeywordsIntoSections(resumeText: string, keywords: string[]): string {
  const lines = resumeText.split('\n');
  const skillsKeywords = keywords.filter(k => ['skills', 'experience', 'knowledge', 'proficient', 'expertise', 'technical'].some(cat => k.toLowerCase().includes(cat)));
  const expKeywords = keywords.filter(k => !skillsKeywords.includes(k));
  
  let result = resumeText;
  
  if (skillsKeywords.length > 0) {
    const skillsSection = formatSkillsSection(skillsKeywords);
    const existingSkillsIndex = lines.findIndex(l => /^(skills|technical skills|key skills|core competencies)\b/i.test(l.trim()));
    
    if (existingSkillsIndex >= 0) {
      lines.splice(existingSkillsIndex + 1, 0, skillsSection);
      result = lines.join('\n');
    } else {
      const headerIndex = lines.findIndex(l => /^(summary|profile|objective|professional summary)\b/i.test(l.trim()));
      if (headerIndex >= 0) {
        lines.splice(headerIndex + 1, 0, '\n' + skillsSection);
        result = lines.join('\n');
      } else {
        result = resumeText + '\n\n' + skillsSection;
      }
    }
  }
  
  if (expKeywords.length > 0) {
    const expSection = formatExperienceSection(expKeywords);
    const expIndex = lines.findIndex(l => /^(experience|work experience|professional experience|employment history)\b/i.test(l.trim()));
    if (expIndex >= 0) {
      lines.splice(expIndex + 1, 0, expSection);
      result = lines.join('\n');
    } else {
      result += '\n\n' + expSection;
    }
  }
  
  return result;
}

function formatSkillsSection(keywords: string[]): string {
  return `\n\nKey Skills\n${'='.repeat(20)}\n${keywords.map(k => `• ${k}`).join('\n')}`;
}

function formatExperienceSection(keywords: string[]): string {
  return `\n\nAdditional Experience Highlights\n${'='.repeat(35)}\n${keywords.map(k => `• Demonstrated ${k.toLowerCase()} in professional settings`).join('\n')}`;
}

async function extractText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'txt') {
    return file.text();
  }
  if (ext === 'docx') {
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }
  if (ext === 'pdf') {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text;
  }
  return '';
}

function stem(word: string): string {
  if (word.length <= 3) return word;
  let w = word;
  if (w.endsWith('ies') && w.length > 4) w = w.slice(0, -3) + 'y';
  else if (w.endsWith('ing') && w.length > 5 && /[aeiou]/.test(w.slice(0, -3))) w = w.slice(0, -3);
  else if (w.endsWith('ings') && w.length > 6) w = w.slice(0, -4);
  else if (w.endsWith('ed') && w.length > 4 && /[aeiou]/.test(w.slice(0, -2))) w = w.slice(0, -2);
  else if (w.endsWith('es') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('s') && !w.endsWith('ss') && w.length > 4) w = w.slice(0, -1);
  return w;
}

const JD_PHRASES = [
  'project management', 'product management', 'data analysis', 'data analytics', 'data science', 'data modeling',
  'data visualization', 'data engineering', 'data pipeline', 'machine learning', 'deep learning', 'user experience',
  'user interface', 'ui design', 'ux research', 'business intelligence', 'business analysis', 'risk management',
  'quality assurance', 'stakeholder management', 'time management', 'team leadership', 'software engineering',
  'software development', 'web development', 'web applications', 'mobile development', 'full stack', 'front end',
  'back end', 'api development', 'api design', 'test automation', 'automated testing', 'unit testing',
  'integration testing', 'end to end', 'continuous integration', 'continuous deployment', 'ci/cd', 'agile development',
  'agile environment', 'scrum master', 'cloud computing', 'cloud infrastructure', 'infrastructure as code',
  'database management', 'database design', 'business requirements', 'customer service', 'customer satisfaction',
  'problem solving', 'critical thinking', 'decision making', 'attention to detail', 'cross functional',
  'communication skills', 'interpersonal skills', 'leadership skills', 'technical skills', 'project delivery',
  'stakeholder engagement', 'strategic planning', 'budget management', 'vendor management', 'account management',
  'financial analysis', 'financial reporting', 'process improvement', 'change management', 'talent acquisition',
  'regulatory compliance', 'data privacy', 'cyber security', 'network security', 'operating systems',
  'system administration', 'network administration', 'technical support', 'customer support', 'content creation',
  'graphic design', 'product design', 'a/b testing', 'search engine', 'email marketing', 'inventory management',
  'client relations', 'supply chain', 'market research', 'sales strategy', 'revenue growth', 'operations management'
];

const JD_STOPWORDS = [
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'has', 'have', 'he', 'her', 'his', 'i',
  'if', 'in', 'into', 'is', 'it', 'its', 'may', 'me', 'my', 'nor', 'not', 'of', 'on', 'one', 'or', 'our', 'ours',
  'she', 'so', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'to', 'too', 'us',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'would',
  'you', 'your', 'am', 'been', 'being', 'do', 'does', 'did', 'doing', 'had', 'having', 'can', 'could', 'should',
  'shall', 'might', 'must', 'about', 'after', 'against', 'along', 'among', 'around', 'before', 'between', 'beyond',
  'during', 'over', 'under', 'through', 'throughout', 'upon', 'via', 'within', 'without', 'across', 'onto', 'toward',
  'towards', 'no', 'yes', 'none', 'each', 'every', 'few', 'many', 'more', 'most', 'much', 'other', 'same', 'some',
  'such', 'very', 'quite', 'only', 'own', 'just', 'also', 'too', 'still', 'even', 'yet', 'because', 'until', 'since',
  'once', 'again', 'here', 'now', 'ago', 'always', 'never', 'often', 'usually', 'together', 'etc', 'eg', 'ie', 'e.g', 'i.e'
];

const JD_GENERIC_WORDS = [
  'work', 'works', 'working', 'experience', 'experienced', 'role', 'job', 'company', 'opportunity', 'candidate',
  'candidates', 'requirements', 'requirement', 'responsibilities', 'responsibility', 'qualifications', 'qualification',
  'duties', 'ability', 'able', 'ensure', 'including', 'include', 'includes', 'located', 'plus', 'preferred', 'minimum',
  'years', 'year', 'relevant', 'performing', 'related', 'additional', 'various', 'such', 'desired', 'ideal', 'ideally',
  'interested', 'looking', 'seek', 'seeking', 'join', 'apply', 'hiring', 'expertise', 'knowledge', 'background', 'will',
  'daily', 'day', 'within', 'environment', 'environments', 'projects', 'project', 'highly', 'strong', 'excellent',
  'great', 'good', 'proven', 'understand', 'understanding', 'learn', 'willing', 'complete', 'varying', 'part', 'per',
  'monthly', 'salary', 'benefits', 'benefit', 'individuals', 'individual', 'suitable', 'successful', 'success', 'business',
  'responsible', 'develop', 'develops', 'developing', 'developed', 'development', 'maintain', 'maintains', 'maintaining',
  'maintained', 'maintenance', 'build', 'builds', 'building', 'built', 'using', 'use', 'used', 'requires', 'require',
  'requires', 'required', 'knows', 'known', 'pipeline', 'pipelines', 'strategies', 'strategy', 'strategic',
  'engineering', 'engineered', 'engineers', 'applications', 'application', 'software', 'technologies', 'technology',
  'tools', 'tool', 'systems', 'system', 'processes', 'process', 'designing', 'designed', 'implement', 'implements',
  'implementing', 'implemented', 'design', 'analyze', 'analyzes', 'analyzing', 'analyzed', 'analysis'
];

const JD_STOP_STEMS = new Set(JD_STOPWORDS.map(stem));
const JD_GENERIC_STEMS = new Set(JD_GENERIC_WORDS.map(stem));

function tokenizeText(text: string): string[] {
  const lower = text.toLowerCase();
  const tokens = lower.match(
    /[a-z0-9#+]+\+[a-z0-9#+]*|[a-z0-9][a-z0-9#+]*#[a-z0-9#+]*|[a-z0-9]+(?:[/][a-z0-9]+)+|[a-z0-9]+(?:\.[a-z0-9]+)*/g
  ) || [];
  return tokens.filter(t => /[a-z]/.test(t) && t.length >= 2);
}

function isValidJDTerm(token: string): boolean {
  if (!/[a-z]/.test(token)) return false;
  const s = stem(token);
  if (JD_STOP_STEMS.has(s)) return false;
  if (JD_GENERIC_STEMS.has(s)) return false;
  return true;
}

function computeJDCoverage(resumeText: string, jdText: string): JDCoverage {
  const resumeTokens = tokenizeText(resumeText);
  const resumeStems = new Set(resumeTokens.map(stem));

  const jdWordCounts = new Map<string, number>();
  for (const token of tokenizeText(jdText)) {
    if (isValidJDTerm(token)) {
      jdWordCounts.set(token, (jdWordCounts.get(token) || 0) + 1);
    }
  }

  const phraseCounts = new Map<string, number>();
  const jdLower = jdText.toLowerCase();
  for (const phrase of JD_PHRASES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = jdLower.match(new RegExp(escaped, 'g'));
    if (matches) phraseCounts.set(phrase, matches.length);
  }

  let matchedWords = 0;
  let totalWords = 0;
  const uncoveredWords: { word: string; count: number }[] = [];
  for (const [w, c] of jdWordCounts) {
    totalWords += c;
    if (resumeStems.has(stem(w))) matchedWords += c;
    else uncoveredWords.push({ word: w, count: c });
  }

  let matchedPhrases = 0;
  let totalPhrases = 0;
  const uncoveredPhrases: { word: string; count: number }[] = [];
  for (const [phrase, c] of phraseCounts) {
    totalPhrases += c;
    const allCovered = phrase.split(' ').every(p => resumeStems.has(stem(p)));
    if (allCovered) matchedPhrases += c;
    else uncoveredPhrases.push({ word: phrase, count: c });
  }

  const wordCoverage = totalWords > 0 ? matchedWords / totalWords : 1;
  const phraseCoverage = totalPhrases > 0 ? matchedPhrases / totalPhrases : 1;
  const coveragePercent =
    totalWords + totalPhrases > 0
      ? Math.round(100 * (0.7 * wordCoverage + 0.3 * phraseCoverage))
      : 100;

  const sortDesc = (a: { word: string; count: number }, b: { word: string; count: number }) => b.count - a.count;
  return {
    coveragePercent,
    totalWords,
    matchedWords,
    totalPhrases,
    matchedPhrases,
    uncoveredWords: uncoveredWords.sort(sortDesc),
    uncoveredPhrases: uncoveredPhrases.sort(sortDesc),
  };
}

function performDeepAnalysis(resumeText: string, jdText: string): AnalysisResult {
  const resumeLower = resumeText.toLowerCase();
  const jdLower = jdText.toLowerCase();
  
  const hardSkills = extractHardSkills(jdText);
  const softSkills = extractSoftSkills(jdText);
  const otherKeywords = extractOtherKeywords(jdText);
  const degreeTitle = extractDegreeTitle(jdText);
  const topKeywords = extractTopKeywords(jdText);
  
  const allKeywordDefs: { word: string; category: KeywordResult['category'] }[] = [
    ...hardSkills.map(w => ({ word: w.word, category: 'hard' as const })),
    ...softSkills.map(w => ({ word: w.word, category: 'soft' as const })),
    ...otherKeywords.map(w => ({ word: w.word, category: 'other' as const })),
    ...degreeTitle.map(w => ({ word: w.word, category: 'degree' as const })),
  ];

  const keywordMap = new Map<string, { word: string; category: KeywordResult['category']; jdFrequency: number }>();
  for (const def of allKeywordDefs) {
    const existing = keywordMap.get(def.word);
    if (!existing) {
      keywordMap.set(def.word, { word: def.word, category: def.category, jdFrequency: 1 });
    } else {
      existing.jdFrequency += 1;
    }
  }

  const jdWordFreq = new Map<string, number>();
  const words = jdLower.match(/\b[a-z]{3,}\b/g) || [];
  for (const w of words) {
    jdWordFreq.set(w, (jdWordFreq.get(w) || 0) + 1);
  }

  const coverage = computeJDCoverage(resumeText, jdText);

  const coverageTerms: { word: string; count: number }[] = [
    ...coverage.uncoveredWords,
    ...coverage.uncoveredPhrases,
  ]
    .sort((a, b) => b.count - a.count)
    .slice(0, 24);

  const jdTerms: KeywordResult[] = [];
  const jdSeen = new Set<string>();
  for (const term of coverageTerms) {
    if (keywordMap.has(term.word) || jdSeen.has(term.word)) continue;
    jdSeen.add(term.word);
    jdTerms.push({
      word: term.word,
      inResume: false,
      frequency: term.count,
      jdFrequency: term.count,
      category: 'jd',
      excluded: false,
    });
  }

  const keywords: KeywordResult[] = [
    ...Array.from(keywordMap.values()).map(k => ({
      ...k,
      inResume: resumeLower.includes(k.word.toLowerCase()),
      frequency: jdWordFreq.get(k.word.toLowerCase()) || k.jdFrequency,
      excluded: false,
    })),
    ...jdTerms,
  ];

  const categoryScores = calculateCategoryScores(keywords);

  const jdCategoryIndex = categoryScores.findIndex(c => c.key === 'jd');
  if (jdCategoryIndex >= 0) {
    categoryScores[jdCategoryIndex] = {
      ...categoryScores[jdCategoryIndex],
      score: coverage.coveragePercent,
      found: coverage.matchedWords + coverage.matchedPhrases,
      total: coverage.totalWords + coverage.totalPhrases,
    };
  }

  const kwMatch = Math.round(keywords.filter(k => k.inResume && !k.excluded).length / Math.max(keywords.filter(k => !k.excluded).length, 1) * 100);
  const matchScore = Math.round(kwMatch * 0.5 + coverage.coveragePercent * 0.5);

  const suggestions: string[] = [];
  const missingHard = keywords.filter(k => k.category === 'hard' && !k.inResume && !k.excluded);
  const missingSoft = keywords.filter(k => k.category === 'soft' && !k.inResume && !k.excluded);

  if (coverage.coveragePercent < 100) {
    const topUncovered = coverageTerms.slice(0, 6).map(t => t.word).join(', ');
    suggestions.push(`Word-by-word JD coverage is ${coverage.coveragePercent}% (${coverage.matchedWords}/${coverage.totalWords} words, ${coverage.matchedPhrases}/${coverage.totalPhrases} phrases). Add missing terms like: ${topUncovered}.`);
  }
  if (missingHard.length > 0) {
    suggestions.push(`Add hard skills: ${missingHard.slice(0, 5).map(k => k.word).join(', ')}.`);
  }
  if (missingSoft.length > 0) {
    suggestions.push(`Emphasize soft skills: ${missingSoft.slice(0, 3).map(k => k.word).join(', ')}.`);
  }
  if (categoryScores[0]?.score < 70) {
    suggestions.push('Improve hard skills match by adding relevant technical keywords.');
  }
  if (matchScore >= 80) {
    suggestions.push('Great match! Your resume aligns well with this position.');
  } else if (matchScore >= 60) {
    suggestions.push('Good start. Add a few more keywords to reach the 80+ target.');
  } else {
    suggestions.push('Significant gaps found. Consider tailoring your resume more closely to this job.');
  }

  const responsibilities = extractJDSection(jdText, ['responsible', 'responsibilities', 'duties', 'you will', 'role']);
  const requirements = extractJDSection(jdText, ['requirements', 'qualifications', 'required', 'must have', 'looking for']);
  const skills = extractJDSection(jdText, ['skills', 'technical', 'proficient', 'knowledge', 'expertise']);

  const missingKeywords = keywords.filter(k => !k.inResume);

  return {
    keywords,
    matchScore,
    categoryScores,
    suggestions,
    missingKeywords,
    jdCoverage: coverage,
    jdAnalysis: {
      responsibilities,
      requirements,
      skills: [...skills, ...hardSkills.map(k => k.word)],
      topKeywords: topKeywords,
    },
  };
}

function calculateCategoryScores(keywords: KeywordResult[]): CategoryScore[] {
  const categories: { key: KeywordResult['category']; name: string; icon: React.ReactNode; color: string }[] = [
    { key: 'hard', name: 'Hard Skills', icon: <Target size={18} />, color: 'blue' },
    { key: 'soft', name: 'Soft Skills', icon: <Sparkles size={18} />, color: 'green' },
    { key: 'other', name: 'Other Keywords', icon: <FileText size={18} />, color: 'orange' },
    { key: 'jd', name: 'JD Terms', icon: <Search size={18} />, color: 'red' },
    { key: 'degree', name: 'Degree & Title', icon: <BriefcaseBusiness size={18} />, color: 'purple' },
  ];

  return categories.map(cat => {
    const catKeywords = keywords.filter(k => k.category === cat.key);
    const found = catKeywords.filter(k => k.inResume && !k.excluded).length;
    const total = catKeywords.filter(k => !k.excluded).length;
    const score = total > 0 ? Math.round((found / total) * 100) : 0;
    return { key: cat.key, name: cat.name, score, found, total, icon: cat.icon, color: cat.color };
  });
}

function extractHardSkills(text: string): { word: string; frequency: number }[] {
  const lower = text.toLowerCase();
  const hardSkillPatterns = [
    'python', 'java', 'javascript', 'react', 'angular', 'vue', 'node', 'sql', 'nosql', 'mongodb', 'postgresql',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'ci/cd', 'agile', 'scrum', 'api', 'rest',
    'graphql', 'microservices', 'linux', 'windows', 'macos', 'html', 'css', 'typescript', 'php', 'ruby', 'go',
    'swift', 'kotlin', 'flutter', 'dart', 'tensorflow', 'pytorch', 'machine learning', 'deep learning', 'nlp',
    'selenium', 'cypress', 'playwright', 'pytest', 'junit', 'maven', 'gradle', 'npm', 'webpack', 'vite',
    'figma', 'sketch', 'adobe', 'photoshop', 'illustrator', 'blender', 'unity', 'unreal', 'c++', 'c#',
    'testing', 'automation', 'deployment', 'monitoring', 'logging', 'security', 'encryption', 'oauth',
    'blockchain', 'solidity', 'web3', 'ethereum', 'bitcoin', 'cryptocurrency', 'fintech', 'banking'
  ];
  
  const found: { word: string; frequency: number }[] = [];
  for (const skill of hardSkillPatterns) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches) {
      found.push({ word: skill, frequency: matches.length });
    }
  }
  return found.sort((a, b) => b.frequency - a.frequency);
}

function extractSoftSkills(text: string): { word: string; frequency: number }[] {
  const lower = text.toLowerCase();
  const softSkillPatterns = [
    'communication', 'leadership', 'teamwork', 'collaboration', 'problem-solving', 'analytical', 'detail-oriented',
    'organized', 'time management', 'adaptability', 'creativity', 'critical thinking', 'interpersonal',
    'negotiation', 'presentation', 'public speaking', 'writing', 'mentoring', 'coaching', 'conflict resolution',
    'decision making', 'strategic', 'innovative', 'proactive', 'self-motivated', 'flexible', 'resilient',
    'empathetic', 'customer service', 'stakeholder management', 'cross-functional', 'remote', 'multitasking'
  ];
  
  const found: { word: string; frequency: number }[] = [];
  for (const skill of softSkillPatterns) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches) {
      found.push({ word: skill, frequency: matches.length });
    }
  }
  return found.sort((a, b) => b.frequency - a.frequency);
}

function extractOtherKeywords(text: string): { word: string; frequency: number }[] {
  const lower = text.toLowerCase();
  const otherPatterns = [
    'project management', 'product management', 'data analysis', 'business intelligence', 'user experience',
    'user interface', 'frontend', 'backend', 'fullstack', 'devops', 'sre', 'cloud', 'saas', 'paas', 'iaas',
    'enterprise', 'startup', 'b2b', 'b2c', 'c2c', 'mobile', 'web', 'desktop', 'embedded', 'iot',
    'database', 'data warehouse', 'etl', 'data pipeline', 'big data', 'hadoop', 'spark', 'kafka',
    'rest api', 'soap', 'grpc', 'websocket', 'tcp/ip', 'http', 'https', 'dns', 'vpn', 'firewall',
    'compliance', 'audit', 'governance', 'risk management', 'quality assurance', 'six sigma', 'lean',
    'budgeting', 'forecasting', 'roi', 'kpi', 'okr', 'sla', 'roi', 'conversion', 'retention',
    'a/b testing', 'personalization', 'recommendation', 'search', 'indexing', 'caching', 'cdn'
  ];
  
  const found: { word: string; frequency: number }[] = [];
  for (const keyword of otherPatterns) {
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches) {
      found.push({ word: keyword, frequency: matches.length });
    }
  }
  return found.sort((a, b) => b.frequency - a.frequency);
}

function extractDegreeTitle(text: string): { word: string; frequency: number }[] {
  const lower = text.toLowerCase();
  const degreePatterns = [
    'bachelor', 'master', 'phd', 'doctorate', 'mba', 'btech', 'bsc', 'msc', 'ba', 'bs', 'ma', 'ms',
    'degree', 'certification', 'certified', 'diploma', 'associate', 'undergraduate', 'graduate',
    'computer science', 'software engineering', 'information technology', 'data science', 'business administration',
    'engineer', 'engineering', 'developer', 'designer', 'analyst', 'manager', 'lead', 'director',
    'senior', 'junior', 'intern', 'entry level', 'mid level', 'principal', 'staff', 'distinguished'
  ];
  
  const found: { word: string; frequency: number }[] = [];
  for (const keyword of degreePatterns) {
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches) {
      found.push({ word: keyword, frequency: matches.length });
    }
  }
  return found.sort((a, b) => b.frequency - a.frequency);
}

function extractTopKeywords(text: string, limit = 15): { word: string; frequency: number }[] {
  const lower = text.toLowerCase();
  const stopWords = new Set(['the','and','for','with','that','this','have','from','they','would','there','their','what','about','which','when','make','can','like','time','just','know','take','people','into','year','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','being','through','much','before','move','right','still','between','being','where','must','world','very','help','much','need','should','here','thing','many','some','would','make','like','time','just','know','take','people','into','year','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','being','through','much','before','move','right','still','between','being','where','must','world','very','help','much','need','should','here','thing','many']);
  
  const words = lower.match(/\b[a-z]{3,}\b/g) || [];
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (!stopWords.has(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  return Object.entries(freq)
    .map(([word, frequency]) => ({ word, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, limit);
}

function extractJDSection(text: string, keywords: string[]): string[] {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  return sentences.filter(sentence => {
    const lower = sentence.toLowerCase();
    return keywords.some(kw => lower.includes(kw));
  }).slice(0, 5);
}

function generatePDF(updatedResume: string, analysis: AnalysisResult, selectedKeywords: string[], resumeFileName: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let yPosition = margin;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Updated Resume', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()} | Match Score: ${analysis.matchScore}% | Keywords Added: ${selectedKeywords.length}`, margin, yPosition);
  yPosition += 8;

  doc.setDrawColor(200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  if (analysis.categoryScores.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(99, 102, 241);
    doc.text('Category Scores', margin, yPosition);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    yPosition += 6;

    const colWidth = maxWidth / 2;
    analysis.categoryScores.forEach((cat, i) => {
      const x = i % 2 === 0 ? margin : margin + colWidth;
      if (i % 2 === 0 && i > 0) yPosition += 6;
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60);
      doc.text(`${cat.name}:`, x, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`${cat.found}/${cat.total} (${cat.score}%)`, x + 50, yPosition);
    });
    yPosition += 14;
  }

  const lines = updatedResume.split('\n');
  for (const line of lines) {
    if (yPosition > 280) {
      doc.addPage();
      yPosition = margin;
    }

    if (line.startsWith('Key Skills') || line.startsWith('Additional Experience')) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241);
      const sectionLines = doc.splitTextToSize(line, maxWidth);
      doc.text(sectionLines, margin, yPosition);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      yPosition += sectionLines.length * 6 + 2;
      continue;
    }

    if (line.startsWith('=')) {
      doc.setDrawColor(200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;
      continue;
    }

    if (line.startsWith('• ')) {
      const keyword = line.slice(2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      const keywordLines = doc.splitTextToSize(`• ${keyword}`, maxWidth);
      doc.text(keywordLines, margin + 5, yPosition);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      yPosition += keywordLines.length * 6;
      continue;
    }

    const textLines = doc.splitTextToSize(line || ' ', maxWidth);
    doc.text(textLines, margin, yPosition);
    yPosition += textLines.length * 6 + 2;
  }

  const resumeName = resumeFileName ? resumeFileName.replace(/\.[^.]+$/, '') : 'resume';
  doc.save(`${resumeName}-updated.pdf`);
}

export default App;
