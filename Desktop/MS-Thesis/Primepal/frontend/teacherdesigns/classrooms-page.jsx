// classrooms-page.jsx — Classrooms: grade cards + student search/filter
const { useState, useMemo } = React;

const GRADE_META = [
  { grade:'Grade 1', color:'#4361ee', subject:'English',     topic:'Past Tense',       students:24, accuracy:88 },
  { grade:'Grade 2', color:'#10b981', subject:'Mathematics', topic:'Addition',          students:22, accuracy:76 },
  { grade:'Grade 3', color:'#f59e0b', subject:'Science',     topic:'Plant Life Cycle',  students:26, accuracy:71 },
  { grade:'Grade 4', color:'#ef4444', subject:'English',     topic:'Story Writing',     students:20, accuracy:83 },
  { grade:'Grade 5', color:'#8b5cf6', subject:'Mathematics', topic:'Fractions',         students:18, accuracy:79 },
  { grade:'Grade 6', color:'#ec4899', subject:'Science',     topic:'Human Body',        students:22, accuracy:85 },
];

const ALL_STUDENTS = [
  { name:'Amaka Obi',    roll:'G1-001', grade:'Grade 1', missions:12, accuracy:92, status:'excellent' },
  { name:'Ngozi Uche',   roll:'G1-002', grade:'Grade 1', missions:11, accuracy:88, status:'excellent' },
  { name:'Kemi Akin',    roll:'G1-003', grade:'Grade 1', missions:10, accuracy:84, status:'good'      },
  { name:'Bola Eze',     roll:'G1-004', grade:'Grade 1', missions:8,  accuracy:72, status:'good'      },
  { name:'Yemi Coker',   roll:'G1-005', grade:'Grade 1', missions:6,  accuracy:61, status:'needs-help'},
  { name:'Tunde Bello',  roll:'G2-001', grade:'Grade 2', missions:8,  accuracy:74, status:'good'      },
  { name:'Fatima Musa',  roll:'G2-002', grade:'Grade 2', missions:7,  accuracy:58, status:'needs-help'},
  { name:'Emeka Nna',    roll:'G2-003', grade:'Grade 2', missions:9,  accuracy:80, status:'good'      },
  { name:'Bayo Adisa',   roll:'G2-004', grade:'Grade 2', missions:6,  accuracy:65, status:'good'      },
  { name:'Sola Ojo',     roll:'G2-005', grade:'Grade 2', missions:5,  accuracy:54, status:'needs-help'},
  { name:'Chidi Eze',    roll:'G3-001', grade:'Grade 3', missions:5,  accuracy:55, status:'needs-help'},
  { name:'Aisha Kano',   roll:'G3-002', grade:'Grade 3', missions:8,  accuracy:79, status:'good'      },
  { name:'Dayo Lawal',   roll:'G3-003', grade:'Grade 3', missions:7,  accuracy:83, status:'excellent' },
  { name:'Funke Ade',    roll:'G3-004', grade:'Grade 3', missions:4,  accuracy:60, status:'needs-help'},
  { name:'Musa Garba',   roll:'G3-005', grade:'Grade 3', missions:9,  accuracy:77, status:'good'      },
  { name:'Olu Martins',  roll:'G4-001', grade:'Grade 4', missions:11, accuracy:90, status:'excellent' },
  { name:'Temi Okafor',  roll:'G4-002', grade:'Grade 4', missions:9,  accuracy:82, status:'excellent' },
  { name:'Ife Adeyemi',  roll:'G4-003', grade:'Grade 4', missions:7,  accuracy:73, status:'good'      },
  { name:'Zara Ahmed',   roll:'G5-001', grade:'Grade 5', missions:10, accuracy:85, status:'excellent' },
  { name:'Kunle Bakare', roll:'G5-002', grade:'Grade 5', missions:8,  accuracy:76, status:'good'      },
  { name:'Hauwa Sule',   roll:'G6-001', grade:'Grade 6', missions:12, accuracy:91, status:'excellent' },
  { name:'Dapo Akinde',  roll:'G6-002', grade:'Grade 6', missions:10, accuracy:78, status:'good'      },
];

const STATUS = {
  'excellent':  { label:'Excellent',  color:'#059669', bg:'#d1fae5' },
  'good':       { label:'Good',       color:'#d97706', bg:'#fef3c7' },
  'needs-help': { label:'Needs Help', color:'#dc2626', bg:'#fee2e2' },
};

const TH = ({ children, style }) => (
  <span style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.5px', fontFamily:"'DM Sans',sans-serif", ...style }}>{children}</span>
);

const GradeCard = ({ grade, color, subject, topic, students, accuracy, isSelected, onClick }) => {
  const [hov, setHov] = useState(false);
  const accColor = accuracy >= 80 ? '#059669' : accuracy >= 65 ? '#d97706' : '#dc2626';
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:'#fff', borderRadius:14, border:`2px solid ${isSelected ? color : hov ? color+'55' : '#eaedf5'}`,
        overflow:'hidden', cursor:'pointer', transition:'all 0.16s',
        boxShadow: isSelected ? `0 4px 20px ${color}30` : hov ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
        transform: hov && !isSelected ? 'translateY(-2px)' : 'translateY(0)',
      }}>
      <div style={{ height:4, background:color }} />
      <div style={{ padding:'14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ padding:'3px 10px', borderRadius:20, background:`${color}18`, color, fontSize:12, fontWeight:700, fontFamily:"'Space Grotesk',sans-serif" }}>{grade}</span>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:16, fontWeight:800, color:accColor }}>{accuracy}%</span>
        </div>
        <div style={{ fontSize:13.5, fontWeight:600, color:'#0f1729', marginBottom:2 }}>{subject}</div>
        <div style={{ fontSize:11, color:'#9ca3af', marginBottom:10 }}>{topic}</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:11.5, color:'#6b7280' }}>{students} students</span>
          {isSelected && <span style={{ fontSize:11, color:color, fontWeight:600 }}>Selected ✓</span>}
        </div>
      </div>
    </div>
  );
};

const ClassroomsPage = ({ tweaks = {} }) => {
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let s = ALL_STUDENTS;
    if (selectedGrade !== 'All') s = s.filter(st => st.grade === selectedGrade);
    if (search.trim()) {
      const q = search.toLowerCase();
      s = s.filter(st => st.name.toLowerCase().includes(q) || st.roll.toLowerCase().includes(q));
    }
    return s;
  }, [selectedGrade, search]);

  const gradeOptions = ['All', ...GRADE_META.map(g => g.grade)];
  const selectedMeta = GRADE_META.find(g => g.grade === selectedGrade);

  return (
    <div style={{ padding:'22px 26px', background:'#f0f2f8', minHeight:'100%', fontFamily:"'DM Sans',sans-serif" }}>

      {/* Grade cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:22 }}>
        {GRADE_META.map(g => (
          <GradeCard key={g.grade} {...g}
            isSelected={selectedGrade === g.grade}
            onClick={() => setSelectedGrade(selectedGrade === g.grade ? 'All' : g.grade)}
          />
        ))}
      </div>

      {/* Student table card */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #eaedf5', padding:'20px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>

        {/* Table header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15, color:'#0f1729' }}>
              {selectedGrade === 'All' ? 'All Students' : `${selectedGrade} — ${selectedMeta?.subject}`}
            </div>
            <div style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>{filtered.length} student{filtered.length !== 1 ? 's' : ''} found</div>
          </div>

          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            {/* Search */}
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'#f4f5fb', border:'1px solid #eaedf5', borderRadius:9, padding:'8px 12px' }}>
              <Icon d={ICONS.search} size={14} color="#9ca3af" />
              <input
                placeholder="Search by name or roll no."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ border:'none', background:'transparent', fontSize:13, color:'#374151', outline:'none', width:200, fontFamily:"'DM Sans',sans-serif" }}
              />
              {search && <span onClick={() => setSearch('')} style={{ cursor:'pointer', color:'#9ca3af', fontSize:16, lineHeight:1 }}>×</span>}
            </div>

            {/* Grade filter dropdown */}
            <select
              value={selectedGrade}
              onChange={e => setSelectedGrade(e.target.value)}
              style={{ padding:'8px 12px', borderRadius:9, border:'1px solid #eaedf5', fontSize:13, color:'#374151', fontFamily:"'DM Sans',sans-serif", background:'#fff', cursor:'pointer', outline:'none' }}
            >
              {gradeOptions.map(g => <option key={g} value={g}>{g === 'All' ? 'All Grades' : g}</option>)}
            </select>

            <button style={{ background:'#4361ee', color:'#fff', border:'none', borderRadius:9, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', gap:5 }}>
              <Icon d={ICONS.plus} size={13} color="#fff" /> Add Student
            </button>

            <button style={{ background:'#f4f5fb', color:'#4361ee', border:'1px solid #eaedf5', borderRadius:9, padding:'8px 14px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', gap:5 }}>
              <Icon d={ICONS.download} size={13} color="#4361ee" /> Export
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1.2fr 1fr 1fr 1fr 110px', gap:8, padding:'9px 12px', background:'#f8f9fc', borderRadius:9, marginBottom:4 }}>
          {['Student Name','Roll Number','Grade','Missions','Accuracy','Status'].map(h => <TH key={h}>{h}</TH>)}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#9ca3af' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
            <div style={{ fontSize:14, fontWeight:600, color:'#374151' }}>No students found</div>
            <div style={{ fontSize:12, marginTop:4 }}>Try a different name, roll number, or grade</div>
          </div>
        ) : (
          filtered.map((s, i) => {
            const ss = STATUS[s.status];
            const accColor = s.accuracy >= 80 ? '#059669' : s.accuracy >= 65 ? '#d97706' : '#dc2626';
            const gc = GRADE_META.find(g => g.grade === s.grade)?.color || '#4361ee';
            return (
              <div key={s.roll} style={{ display:'grid', gridTemplateColumns:'2fr 1.2fr 1fr 1fr 1fr 110px', gap:8, padding:'11px 12px', borderBottom: i < filtered.length - 1 ? '1px solid #f4f5fb' : 'none', alignItems:'center' }}>
                {/* Name + avatar */}
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:`${gc}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:gc, fontFamily:"'Space Grotesk',sans-serif", flexShrink:0 }}>{s.name[0]}</div>
                  <span style={{ fontSize:13, fontWeight:600, color:'#1f2937' }}>{s.name}</span>
                </div>
                <span style={{ fontSize:12, color:'#6b7280', fontFamily:"'Space Grotesk',sans-serif", fontWeight:500 }}>{s.roll}</span>
                <span style={{ fontSize:12 }}>
                  <span style={{ padding:'2px 9px', borderRadius:20, background:`${gc}18`, color:gc, fontSize:11, fontWeight:700, fontFamily:"'Space Grotesk',sans-serif" }}>{s.grade}</span>
                </span>
                <span style={{ fontSize:13, color:'#6b7280' }}>{s.missions}</span>
                <span style={{ fontSize:13, fontWeight:800, color:accColor, fontFamily:"'Space Grotesk',sans-serif" }}>{s.accuracy}%</span>
                <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, color:ss.color, background:ss.bg, whiteSpace:'nowrap' }}>{ss.label}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

Object.assign(window, { ClassroomsPage });
