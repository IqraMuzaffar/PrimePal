// announcements-page.jsx — Announcements feed
const { useState } = React;

const ANNOUNCEMENTS = [
  { id:1, title:'Term 2 Results Upload Due', body:'Please upload all student results for Term 2 by end of day Friday 2nd May. Reach out to admin if you need help.', date:'29 Apr 2026', tag:'Urgent', tagColor:'#dc2626', tagBg:'#fee2e2', author:'Admin Office', unread:true },
  { id:2, title:'New Curriculum PDF — Grade 4 Added', body:'The updated Grade 4 English curriculum PDF has been uploaded to the Curriculum Hub. Please review before next week\'s sessions.', date:'29 Apr 2026', tag:'Curriculum', tagColor:'#4361ee', tagBg:'#e8eeff', author:'Curriculum Team', unread:true },
  { id:3, title:'Parent-Teacher Meeting — May 5', body:'A parent-teacher meeting is scheduled for Monday 5th May at 2:00 PM. All teachers are expected to be present with progress reports.', date:'28 Apr 2026', tag:'Event', tagColor:'#d97706', tagBg:'#fef3c7', author:'School Principal', unread:true },
  { id:4, title:'AI Tutor Update — New Quiz Types Available', body:'PrimePal\'s AI tutor now supports image-based questions and fill-in-the-blank exercises. Try it out in the Missions section.', date:'26 Apr 2026', tag:'Update', tagColor:'#059669', tagBg:'#d1fae5', author:'PrimePal Team', unread:false },
  { id:5, title:'Staff Meeting Rescheduled to Wednesday', body:'This week\'s staff meeting has been moved from Tuesday to Wednesday 30th April at 10:00 AM in the conference room.', date:'25 Apr 2026', tag:'Event', tagColor:'#d97706', tagBg:'#fef3c7', author:'Admin Office', unread:false },
  { id:6, title:'Grade 6 External Exam Preparation Guide', body:'A preparation guide for the upcoming external exams has been shared. Please distribute to Grade 6 students and parents.', date:'22 Apr 2026', tag:'Important', tagColor:'#7c3aed', tagBg:'#ede9fe', author:'School Principal', unread:false },
];

const FILTER_TABS = ['All', 'Unread', 'Urgent', 'Events', 'Curriculum'];

const AnnouncementCard = ({ title, body, date, tag, tagColor, tagBg, author, unread, expanded, onToggle }) => (
  <div
    onClick={onToggle}
    style={{
      background:'#fff', borderRadius:14, border:`1.5px solid ${unread ? '#c7d4ff' : '#eaedf5'}`,
      padding:'18px 20px', cursor:'pointer', transition:'all 0.16s',
      boxShadow: unread ? '0 2px 12px rgba(67,97,238,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
      position:'relative', overflow:'hidden'
    }}>
    {/* Unread indicator */}
    {unread && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:'#4361ee', borderRadius:'14px 0 0 14px' }} />}
    <div style={{ paddingLeft: unread ? 8 : 0 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
            <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700, color:tagColor, background:tagBg }}>{tag}</span>
            {unread && <span style={{ fontSize:11, fontWeight:700, color:'#4361ee' }}>NEW</span>}
          </div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15, color:'#0f1729', marginBottom:4, lineHeight:1.3 }}>{title}</div>
          <div style={{ fontSize:12, color:'#9ca3af' }}>{author} · {date}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink:0, transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition:'transform 0.18s', marginTop:4 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
      {expanded && (
        <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #f4f5fb' }}>
          <p style={{ fontSize:13.5, color:'#374151', lineHeight:1.65 }}>{body}</p>
          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            <button onClick={e => e.stopPropagation()} style={{ background:'#4361ee', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Acknowledge</button>
            <button onClick={e => e.stopPropagation()} style={{ background:'#f4f5fb', color:'#4361ee', border:'1px solid #eaedf5', borderRadius:8, padding:'7px 14px', fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Share with Class</button>
          </div>
        </div>
      )}
    </div>
  </div>
);

const AnnouncementsPage = ({ tweaks = {} }) => {
  const [activeTab, setActiveTab] = useState('All');
  const [expanded, setExpanded]   = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle]   = useState('');
  const [newBody, setNewBody]     = useState('');

  const filtered = ANNOUNCEMENTS.filter(a => {
    if (activeTab === 'All')        return true;
    if (activeTab === 'Unread')     return a.unread;
    if (activeTab === 'Urgent')     return a.tag === 'Urgent' || a.tag === 'Important';
    if (activeTab === 'Events')     return a.tag === 'Event';
    if (activeTab === 'Curriculum') return a.tag === 'Curriculum' || a.tag === 'Update';
    return true;
  });

  const unreadCount = ANNOUNCEMENTS.filter(a => a.unread).length;

  return (
    <div style={{ padding:'22px 26px', background:'#f0f2f8', minHeight:'100%', fontFamily:"'DM Sans',sans-serif" }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:16, color:'#0f1729' }}>
            Announcements
            {unreadCount > 0 && <span style={{ marginLeft:10, background:'#fee2e2', color:'#dc2626', fontSize:12, fontWeight:700, borderRadius:20, padding:'2px 9px' }}>{unreadCount} unread</span>}
          </div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>School-wide and admin messages</div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background:'#4361ee', color:'#fff', border:'none', borderRadius:10, padding:'10px 18px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', gap:7 }}>
          <Icon d={ICONS.plus} size={14} color="#fff" /> New Announcement
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, background:'#fff', borderRadius:12, padding:'4px', border:'1px solid #eaedf5', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', width:'fit-content' }}>
        {FILTER_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding:'7px 16px', borderRadius:9, border:'none', cursor:'pointer',
            background: activeTab===tab ? '#4361ee' : 'transparent',
            color: activeTab===tab ? '#fff' : '#6b7280',
            fontSize:13, fontWeight: activeTab===tab ? 600 : 400,
            fontFamily:"'DM Sans',sans-serif", transition:'all 0.14s'
          }}>{tab}</button>
        ))}
      </div>

      {/* Announcement list */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.length === 0 ? (
          <div style={{ background:'#fff', borderRadius:16, padding:'48px', textAlign:'center', color:'#9ca3af' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>📭</div>
            <div style={{ fontSize:15, fontWeight:600, color:'#374151', marginBottom:4 }}>No announcements here</div>
            <div style={{ fontSize:13 }}>Check back later or switch to a different filter</div>
          </div>
        ) : filtered.map(a => (
          <AnnouncementCard key={a.id} {...a}
            expanded={expanded === a.id}
            onToggle={() => setExpanded(expanded === a.id ? null : a.id)}
          />
        ))}
      </div>

      {/* New Announcement Modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:18, padding:'28px 30px', width:'100%', maxWidth:480, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:18, color:'#0f1729', marginBottom:20 }}>New Announcement</div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Title</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Staff Meeting Rescheduled" style={{ width:'100%', padding:'10px 14px', borderRadius:9, border:'1.5px solid #e5e7eb', fontSize:13.5, fontFamily:"'DM Sans',sans-serif", outline:'none' }} onFocus={e=>e.target.style.borderColor='#4361ee'} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Message</label>
              <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Write your announcement here…" rows={4} style={{ width:'100%', padding:'10px 14px', borderRadius:9, border:'1.5px solid #e5e7eb', fontSize:13.5, fontFamily:"'DM Sans',sans-serif", outline:'none', resize:'vertical' }} onFocus={e=>e.target.style.borderColor='#4361ee'} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ background:'#f4f5fb', color:'#6b7280', border:'1px solid #eaedf5', borderRadius:9, padding:'9px 18px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
              <button onClick={() => setShowModal(false)} style={{ background:'#4361ee', color:'#fff', border:'none', borderRadius:9, padding:'9px 20px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Post Announcement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { AnnouncementsPage });
