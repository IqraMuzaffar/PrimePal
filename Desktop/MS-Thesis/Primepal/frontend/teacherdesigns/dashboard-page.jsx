// dashboard-page.jsx — Dashboard content (Option B: Sidebar layout)
const { useState } = React;

const GRADE_COLORS = { 'Grade 1':'#4361ee','Grade 2':'#10b981','Grade 3':'#f59e0b','Grade 4':'#ef4444','Grade 5':'#8b5cf6','Grade 6':'#ec4899' };

const CLASSROOMS = [
  { grade:'Grade 1', subject:'English',     topic:'Past Tense',        students:24, accuracy:88 },
  { grade:'Grade 2', subject:'Mathematics', topic:'Addition',           students:22, accuracy:76 },
  { grade:'Grade 3', subject:'Science',     topic:'Plant Life Cycle',   students:26, accuracy:71 },
];

const ClassCard = ({ grade, subject, topic, students, accuracy }) => {
  const color = GRADE_COLORS[grade] || '#4361ee';
  const accColor = accuracy >= 80 ? '#059669' : accuracy >= 65 ? '#d97706' : '#dc2626';
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background:'#fff', borderRadius:14, border:'1px solid #eaedf5', overflow:'hidden',
        boxShadow: hov ? '0 6px 20px rgba(67,97,238,0.13)' : '0 1px 4px rgba(0,0,0,0.04)',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        transition:'all 0.18s', cursor:'pointer',
      }}>
      <div style={{ height:4, background:color }} />
      <div style={{ padding:'15px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ padding:'3px 10px', borderRadius:20, background:`${color}1a`, color, fontSize:12, fontWeight:700, fontFamily:"'Space Grotesk',sans-serif" }}>{grade}</span>
          <span style={{ fontSize:11, color:'#9ca3af' }}>{students} students</span>
        </div>
        <div style={{ fontSize:14.5, fontWeight:600, color:'#0f1729', marginBottom:3 }}>{subject}</div>
        <div style={{ fontSize:11.5, color:'#9ca3af', marginBottom:12 }}>Topic: {topic}</div>
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:11, color:'#6b7280' }}>Accuracy</span>
            <span style={{ fontSize:12, fontWeight:700, color:accColor, fontFamily:"'Space Grotesk',sans-serif" }}>{accuracy}%</span>
          </div>
          <ProgressBar value={accuracy} color={accColor} />
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={{ flex:1, background:color, color:'#fff', border:'none', borderRadius:8, padding:'8px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>View Class</button>
          <button style={{ flex:1, background:'#f4f5fb', color:'#4361ee', border:'none', borderRadius:8, padding:'8px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Reports</button>
        </div>
      </div>
    </div>
  );
};

const QuickAction = ({ label, iconD, color, bg }) => {
  const [hov, setHov] = useState(false);
  return (
    <button onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7, padding:'13px 8px', background: hov ? bg : '#fff', border:`1px solid ${hov ? color : '#eaedf5'}`, borderRadius:12, cursor:'pointer', flex:1, minWidth:0, transition:'all 0.14s', fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ width:36, height:36, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon d={iconD} size={17} color={color} />
      </div>
      <span style={{ fontSize:11, fontWeight:600, color:'#374151', textAlign:'center', lineHeight:1.3 }}>{label}</span>
    </button>
  );
};

const DashboardPage = ({ tweaks = {} }) => (
  <div style={{ padding:'22px 26px', background:'#f0f2f8', minHeight:'100%', fontFamily:"'DM Sans',sans-serif" }}>

    {/* Welcome banner */}
    <div style={{ background:'linear-gradient(135deg,#0f1729 0%,#1a2e6e 100%)', borderRadius:16, padding:'22px 26px', marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 4px 20px rgba(15,23,41,0.22)' }}>
      <div>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:21, fontWeight:700, color:'#fff', marginBottom:4 }}>
          Good morning, {tweaks.teacherName || 'Ms. Adeola'} 👋
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)' }}>3 active classes · 5 pending missions today</div>
      </div>
      <button style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', borderRadius:10, padding:'10px 18px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:7, whiteSpace:'nowrap' }}>
        <Icon d={ICONS.plus} size={15} color="#fff" /> New Mission
      </button>
    </div>

    {/* Stat cards */}
    <div style={{ display:'flex', gap:12, marginBottom:18, flexWrap:'wrap' }}>
      <StatCard value="142" label="Total Students"  sub="Across 6 classrooms"  iconBg="#e8eeff" iconColor="#4361ee" icon={ICONS.students}  trend={3}  />
      <StatCard value="98"  label="Active This Week" sub="69% attendance rate"  iconBg="#d1fae5" iconColor="#059669" icon={ICONS.missions}  trend={2}  />
      <StatCard value="23"  label="Live Missions"    sub="Across all classes"   iconBg="#fef3c7" iconColor="#d97706" icon={ICONS.missions}              />
      <StatCard value="81%" label="Avg Accuracy"     sub="↑ 4% from last week"  iconBg="#ede9fe" iconColor="#7c3aed" icon={ICONS.analytics} trend={4}  />
    </div>

    {/* Two-column layout */}
    <div style={{ display:'grid', gridTemplateColumns:'1fr 290px', gap:14, marginBottom:14 }}>

      {/* Classrooms */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #eaedf5', padding:'18px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15, color:'#0f1729' }}>Your Classrooms</div>
          <button style={{ background:'none', border:'none', color:'#4361ee', fontSize:12.5, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
            Manage all <Icon d={ICONS.chevronRight} size={13} color="#4361ee" />
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {CLASSROOMS.map(c => <ClassCard key={c.grade} {...c} />)}
        </div>
        <button style={{ width:'100%', marginTop:12, padding:'10px', border:'1.5px dashed #d1d5db', borderRadius:10, background:'transparent', color:'#9ca3af', cursor:'pointer', fontSize:12.5, fontWeight:500, display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:"'DM Sans',sans-serif", transition:'all 0.14s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='#4361ee'; e.currentTarget.style.color='#4361ee'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='#d1d5db'; e.currentTarget.style.color='#9ca3af'; }}>
          <Icon d={ICONS.plus} size={13} color="currentColor" /> Add New Classroom
        </button>
      </div>

      {/* Right column */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

        {/* Quick Actions */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #eaedf5', padding:'16px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:14, color:'#0f1729', marginBottom:10 }}>Quick Actions</div>
          <div style={{ display:'flex', gap:7 }}>
            <QuickAction label="Add Student"  iconD={ICONS.students}      color="#4361ee" bg="#e8eeff" />
            <QuickAction label="New Mission"  iconD={ICONS.missions}      color="#059669" bg="#d1fae5" />
            <QuickAction label="Upload Book"  iconD={ICONS.curriculum}    color="#d97706" bg="#fef3c7" />
            <QuickAction label="Analytics"    iconD={ICONS.analytics}     color="#7c3aed" bg="#ede9fe" />
          </div>
        </div>

        {/* Announcements */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #eaedf5', padding:'16px', flex:1, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:14, color:'#0f1729' }}>Announcements</div>
            <span style={{ fontSize:11, background:'#fee2e2', color:'#dc2626', borderRadius:20, padding:'2px 8px', fontWeight:600 }}>3 new</span>
          </div>
          {[
            { text:'Term 2 results upload due this Friday',           time:'1h ago',  dot:'#ef4444' },
            { text:'New curriculum PDF for Grade 4 has been added',   time:'3h ago',  dot:'#4361ee' },
            { text:'Parent-teacher meeting scheduled for May 5',      time:'1d ago',  dot:'#f59e0b' },
          ].map((a, i) => (
            <div key={i} style={{ display:'flex', gap:9, alignItems:'flex-start', padding:'8px 0', borderBottom: i < 2 ? '1px solid #f4f5fb' : 'none' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:a.dot, flexShrink:0, marginTop:5 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:'#374151', lineHeight:1.45 }}>{a.text}</div>
                <div style={{ fontSize:11, color:'#9ca3af', marginTop:1 }}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Pending Actions */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #eaedf5', padding:'16px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:14, color:'#0f1729', marginBottom:10 }}>Pending Actions</div>
          {['Grade 3 – mark quiz results','Upload Grade 4 curriculum PDF','Reply to parent inquiry'].map((a, i) => (
            <div key={i} style={{ display:'flex', gap:10, alignItems:'center', padding:'7px 0', borderBottom: i < 2 ? '1px solid #f4f5fb' : 'none' }}>
              <div style={{ width:17, height:17, border:'1.5px solid #d1d5db', borderRadius:5, flexShrink:0 }}></div>
              <span style={{ fontSize:12.5, color:'#374151' }}>{a}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Bottom row */}
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
      {/* Recent Activity */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #eaedf5', padding:'18px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15, color:'#0f1729', marginBottom:10 }}>Recent Activity</div>
        {[
          { text:'Amaka Obi completed "Past Tense Quiz" with 90%',    time:'2m ago', dot:'#4361ee' },
          { text:'Grade 2 Maths: 18 of 22 students submitted',         time:'1h ago', dot:'#10b981' },
          { text:'New book uploaded: Grade 3 Science PDF',             time:'3h ago', dot:'#f59e0b' },
          { text:'Chidi Eze needs extra help — accuracy at 55%',       time:'5h ago', dot:'#ef4444' },
        ].map((a, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 0', borderBottom: i < 3 ? '1px solid #f4f5fb' : 'none' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:a.dot, flexShrink:0, marginTop:4 }} />
            <span style={{ flex:1, fontSize:12.5, color:'#374151', lineHeight:1.45 }}>{a.text}</span>
            <span style={{ fontSize:11, color:'#9ca3af', flexShrink:0 }}>{a.time}</span>
          </div>
        ))}
      </div>

      {/* Accuracy chart */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #eaedf5', padding:'18px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15, color:'#0f1729', marginBottom:2 }}>This Week's Accuracy</div>
        <div style={{ fontSize:12, color:'#9ca3af', marginBottom:12 }}>Daily average per class</div>
        <LineChart
          labels={['Mon','Tue','Wed','Thu','Fri']}
          datasets={[
            { values:[82,86,88,85,91], color:'#4361ee' },
            { values:[70,74,72,78,82], color:'#10b981' },
            { values:[64,68,72,69,75], color:'#f59e0b' },
          ]}
          height={140}
        />
        <div style={{ display:'flex', gap:14, marginTop:8 }}>
          {[['Grade 1','#4361ee'],['Grade 2','#10b981'],['Grade 3','#f59e0b']].map(([g,c]) => (
            <div key={g} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:10, height:10, borderRadius:2, background:c }} />
              <span style={{ fontSize:11, color:'#6b7280' }}>{g}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

Object.assign(window, { DashboardPage });
