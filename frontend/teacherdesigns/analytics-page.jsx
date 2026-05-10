// analytics-page.jsx — Analytics (Option E: Tabbed + Drill-Down)
const { useState } = React;

const TABS = ['Overview', 'By Class', 'By Student', 'Mission Results'];

const CLASS_DATA = [
  { grade:'Grade 1', color:'#4361ee', accuracy:88, students:24, missions:12, active:22 },
  { grade:'Grade 2', color:'#10b981', accuracy:76, students:22, missions:8,  active:18 },
  { grade:'Grade 3', color:'#f59e0b', accuracy:71, students:26, missions:6,  active:20 },
];

const STUDENTS = [
  { name:'Amaka Obi',   grade:'Grade 1', missions:12, accuracy:92, status:'excellent' },
  { name:'Tunde Bello', grade:'Grade 2', missions:8,  accuracy:74, status:'good'      },
  { name:'Chidi Eze',   grade:'Grade 3', missions:5,  accuracy:55, status:'needs-help'},
  { name:'Ngozi Uche',  grade:'Grade 1', missions:11, accuracy:88, status:'excellent' },
  { name:'Fatima Musa', grade:'Grade 2', missions:7,  accuracy:58, status:'needs-help'},
  { name:'Emeka Nna',   grade:'Grade 3', missions:9,  accuracy:80, status:'good'      },
  { name:'Kemi Akin',   grade:'Grade 1', missions:10, accuracy:84, status:'good'      },
  { name:'Bayo Adisa',  grade:'Grade 2', missions:6,  accuracy:65, status:'good'      },
];

const MISSIONS = [
  { name:'Past Tense Quiz',         grade:'Grade 1', submitted:'22/24', avg:88 },
  { name:'Addition Challenge',      grade:'Grade 2', submitted:'20/22', avg:76 },
  { name:'Plant Life Worksheet',    grade:'Grade 3', submitted:'24/26', avg:70 },
  { name:'Reading Comprehension',   grade:'Grade 1', submitted:'23/24', avg:83 },
  { name:'Number Bonds Practice',   grade:'Grade 2', submitted:'19/22', avg:71 },
];

const STATUS = {
  'excellent':  { label:'Excellent',   color:'#059669', bg:'#d1fae5' },
  'good':       { label:'Good',        color:'#d97706', bg:'#fef3c7' },
  'needs-help': { label:'Needs Help',  color:'#dc2626', bg:'#fee2e2' },
};

const TH = ({ children }) => (
  <span style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.5px', fontFamily:"'DM Sans',sans-serif" }}>{children}</span>
);

// ── Overview Tab ──────────────────────────────────────────────
const OverviewTab = () => (
  <div>
    {/* Summary banner */}
    <div style={{ background:'linear-gradient(135deg,#0f1729 0%,#1a2e6e 100%)', borderRadius:16, padding:'18px 26px', marginBottom:18, display:'flex', gap:0, alignItems:'center', boxShadow:'0 4px 20px rgba(15,23,41,0.2)' }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15, color:'#fff', flex:1 }}>
        Term 2, Week 6 Summary
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', fontWeight:400, marginTop:3 }}>29 April 2026</div>
      </div>
      {[['81%','Avg Accuracy'],['98','Active Students'],['23','Missions Done'],['14','Need Attention']].map(([n,l]) => (
        <div key={l} style={{ textAlign:'center', padding:'0 28px', borderLeft:'1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:26, fontWeight:800, color:'#a5b8ff', lineHeight:1 }}>{n}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:3 }}>{l}</div>
        </div>
      ))}
    </div>

    <div style={{ display:'grid', gridTemplateColumns:'1fr 270px', gap:14, marginBottom:14 }}>
      {/* Line chart */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #eaedf5', padding:'20px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
          <div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15, color:'#0f1729' }}>Performance Over Time</div>
            <div style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>Daily accuracy per class, this week</div>
          </div>
          <div style={{ display:'flex', gap:4 }}>
            {['Week','Month','Term'].map(t => (
              <button key={t} style={{ padding:'5px 11px', borderRadius:7, border:'none', cursor:'pointer', background: t==='Week'?'#4361ee':'#f4f5fb', color: t==='Week'?'#fff':'#6b7280', fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>{t}</button>
            ))}
          </div>
        </div>
        <LineChart
          labels={['Mon','Tue','Wed','Thu','Fri']}
          datasets={[
            { values:[82,86,88,85,91], color:'#4361ee' },
            { values:[70,74,72,78,82], color:'#10b981' },
            { values:[64,68,72,69,75], color:'#f59e0b' },
          ]}
          height={180}
        />
        <div style={{ display:'flex', gap:16, marginTop:10 }}>
          {CLASS_DATA.map(c => (
            <div key={c.grade} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:10, height:10, borderRadius:2, background:c.color }} />
              <span style={{ fontSize:11, color:'#6b7280', fontFamily:"'DM Sans',sans-serif" }}>{c.grade}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {/* Class progress */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #eaedf5', padding:'18px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:14, color:'#0f1729', marginBottom:14 }}>By Class</div>
          {CLASS_DATA.map(c => (
            <div key={c.grade} style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#374151', fontFamily:"'DM Sans',sans-serif" }}>{c.grade}</span>
                <span style={{ fontSize:14, fontWeight:800, color:c.color, fontFamily:"'Space Grotesk',sans-serif" }}>{c.accuracy}%</span>
              </div>
              <ProgressBar value={c.accuracy} color={c.color} />
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>{c.active}/{c.students} active · {c.missions} missions</div>
            </div>
          ))}
        </div>

        {/* Needs attention */}
        <div style={{ background:'#fff7f7', borderRadius:16, border:'1px solid #fecaca', padding:'16px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:11 }}>
            <div style={{ width:26, height:26, borderRadius:8, background:'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon d={ICONS.bell} size={13} color="#ef4444" />
            </div>
            <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:13.5, color:'#dc2626' }}>Needs Attention</span>
          </div>
          {[['Chidi Eze','55%'],['Fatima Musa','58%'],['Emeka Nna','61%']].map(([name,pct], i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12.5, color:'#991b1b', padding:'7px 0', borderBottom: i < 2 ? '1px solid #fecaca' : 'none' }}>
              <span>{name} — {pct}</span>
              <button style={{ fontSize:11, color:'#dc2626', background:'#fee2e2', border:'none', borderRadius:6, padding:'3px 9px', cursor:'pointer', fontWeight:600 }}>View</button>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Mission results table */}
    <div style={{ background:'#fff', borderRadius:16, border:'1px solid #eaedf5', padding:'20px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15, color:'#0f1729', marginBottom:14 }}>Recent Mission Results</div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:8, padding:'8px 12px', background:'#f8f9fc', borderRadius:9, marginBottom:6 }}>
        {['Mission','Class','Submissions','Avg Score'].map(h => <TH key={h}>{h}</TH>)}
      </div>
      {MISSIONS.map((m, i) => (
        <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:8, padding:'11px 12px', borderBottom: i < MISSIONS.length-1 ? '1px solid #f4f5fb' : 'none', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#1f2937' }}>{m.name}</span>
          <span style={{ fontSize:12, color:'#6b7280' }}>{m.grade}</span>
          <span style={{ fontSize:12, color:'#6b7280' }}>{m.submitted}</span>
          <span style={{ fontSize:13, fontWeight:800, fontFamily:"'Space Grotesk',sans-serif", color: m.avg>=80?'#059669':m.avg>=70?'#d97706':'#dc2626' }}>{m.avg}%</span>
        </div>
      ))}
    </div>
  </div>
);

// ── By Class Tab ──────────────────────────────────────────────
const ByClassTab = () => (
  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
    {CLASS_DATA.map(c => (
      <div key={c.grade} style={{ background:'#fff', borderRadius:16, border:'1px solid #eaedf5', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ height:5, background:c.color }} />
        <div style={{ padding:'18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <span style={{ padding:'3px 12px', borderRadius:20, background:`${c.color}1a`, color:c.color, fontSize:13, fontWeight:700, fontFamily:"'Space Grotesk',sans-serif" }}>{c.grade}</span>
            <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:24, fontWeight:800, color:c.color }}>{c.accuracy}%</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            {[['Students',c.students],['Active',c.active],['Missions',c.missions],['Avg Score',`${c.accuracy}%`]].map(([l,v]) => (
              <div key={l} style={{ background:'#f8f9fc', borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:700, color:'#0f1729' }}>{v}</div>
                <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
          <ProgressBar value={c.accuracy} color={c.color} />
          <div style={{ fontSize:11, color:'#9ca3af', marginTop:5, textAlign:'center' }}>Accuracy this week</div>
        </div>
      </div>
    ))}
  </div>
);

// ── By Student Tab ────────────────────────────────────────────
const ByStudentTab = () => (
  <div style={{ background:'#fff', borderRadius:16, border:'1px solid #eaedf5', padding:'20px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15, color:'#0f1729' }}>All Students</div>
      <div style={{ display:'flex', gap:8 }}>
        <div style={{ background:'#f4f5fb', border:'1px solid #eaedf5', borderRadius:8, padding:'7px 12px', fontSize:12, color:'#6b7280', display:'flex', alignItems:'center', gap:6 }}>
          <Icon d={ICONS.search} size={13} color="#9ca3af" /> Search student…
        </div>
        <button style={{ background:'#4361ee', color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', gap:5 }}>
          <Icon d={ICONS.download} size={13} color="#fff" /> Export
        </button>
      </div>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 110px', gap:8, padding:'8px 12px', background:'#f8f9fc', borderRadius:9, marginBottom:6 }}>
      {['Student','Class','Missions','Accuracy','Status'].map(h => <TH key={h}>{h}</TH>)}
    </div>
    {STUDENTS.map((s, i) => {
      const ss = STATUS[s.status];
      return (
        <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 110px', gap:8, padding:'11px 12px', borderBottom: i < STUDENTS.length-1 ? '1px solid #f4f5fb' : 'none', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'#e8eeff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#4361ee', fontFamily:"'Space Grotesk',sans-serif", flexShrink:0 }}>{s.name[0]}</div>
            <span style={{ fontSize:13, fontWeight:600, color:'#1f2937' }}>{s.name}</span>
          </div>
          <span style={{ fontSize:12, color:'#6b7280' }}>{s.grade}</span>
          <span style={{ fontSize:12, color:'#6b7280' }}>{s.missions}</span>
          <span style={{ fontSize:13, fontWeight:800, color:ss.color, fontFamily:"'Space Grotesk',sans-serif" }}>{s.accuracy}%</span>
          <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, color:ss.color, background:ss.bg }}>{ss.label}</span>
        </div>
      );
    })}
  </div>
);

// ── Mission Results Tab ───────────────────────────────────────
const MissionResultsTab = () => (
  <div style={{ background:'#fff', borderRadius:16, border:'1px solid #eaedf5', padding:'20px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
    <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15, color:'#0f1729', marginBottom:14 }}>All Mission Results</div>
    <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr', gap:8, padding:'8px 12px', background:'#f8f9fc', borderRadius:9, marginBottom:6 }}>
      {['Mission','Class','Assigned','Submissions','Avg Score'].map(h => <TH key={h}>{h}</TH>)}
    </div>
    {MISSIONS.map((m, i) => (
      <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr', gap:8, padding:'11px 12px', borderBottom: i < MISSIONS.length-1 ? '1px solid #f4f5fb':'none', alignItems:'center' }}>
        <span style={{ fontSize:13, fontWeight:600, color:'#1f2937' }}>{m.name}</span>
        <span style={{ fontSize:12, color:'#6b7280' }}>{m.grade}</span>
        <span style={{ fontSize:12, color:'#6b7280' }}>{m.submitted.split('/')[1]} students</span>
        <span style={{ fontSize:12, color:'#6b7280' }}>{m.submitted}</span>
        <span style={{ fontSize:13, fontWeight:800, fontFamily:"'Space Grotesk',sans-serif", color: m.avg>=80?'#059669':m.avg>=70?'#d97706':'#dc2626' }}>{m.avg}%</span>
      </div>
    ))}
  </div>
);

// ── Analytics Page ────────────────────────────────────────────
const AnalyticsPage = ({ tweaks = {} }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  return (
    <div style={{ padding:'22px 26px', background:'#f0f2f8', minHeight:'100%', fontFamily:"'DM Sans',sans-serif" }}>
      {/* Tab bar + export */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
        <div style={{ background:'#fff', borderRadius:12, padding:'4px', border:'1px solid #eaedf5', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', display:'flex', gap:2 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding:'8px 16px', borderRadius:9, border:'none', cursor:'pointer',
              background: activeTab===tab ? '#4361ee' : 'transparent',
              color: activeTab===tab ? '#fff' : '#6b7280',
              fontSize:13, fontWeight: activeTab===tab ? 600 : 400,
              fontFamily:"'DM Sans',sans-serif", transition:'all 0.14s', whiteSpace:'nowrap',
            }}>{tab}</button>
          ))}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <div style={{ background:'#fff', border:'1px solid #eaedf5', borderRadius:9, padding:'8px 14px', fontSize:12.5, color:'#6b7280', display:'flex', alignItems:'center', gap:6, cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            Class: All ▾
          </div>
          <div style={{ background:'#fff', border:'1px solid #eaedf5', borderRadius:9, padding:'8px 14px', fontSize:12.5, color:'#6b7280', display:'flex', alignItems:'center', gap:6, cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            This Week ▾
          </div>
          <button style={{ background:'#4361ee', color:'#fff', border:'none', borderRadius:9, padding:'8px 16px', fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', gap:6 }}>
            <Icon d={ICONS.download} size={14} color="#fff" /> Export Report
          </button>
        </div>
      </div>

      {activeTab === 'Overview'         && <OverviewTab />}
      {activeTab === 'By Class'         && <ByClassTab />}
      {activeTab === 'By Student'       && <ByStudentTab />}
      {activeTab === 'Mission Results'  && <MissionResultsTab />}
    </div>
  );
};

Object.assign(window, { AnalyticsPage });
